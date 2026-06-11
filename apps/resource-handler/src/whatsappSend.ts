import http from 'node:http';
import { utils } from '@anju/utils';
import type { WhatsappSendRequest } from '@anju/utils';

import { utils as serverUtils } from './utils/index.js';

const WHATSAPP_BASE = `${utils.constants.WHATSAPP_API_BASE}/${utils.constants.WHATSAPP_API_VERSION}`;

type WhatsappMediaType = 'image' | 'video' | 'audio' | 'document';

const pickType = (
  mimeType: string
): { type: WhatsappMediaType; cap: number } => {
  if (mimeType.startsWith('image/')) {
    return { type: 'image', cap: utils.constants.WHATSAPP_MAX_IMAGE_BYTES };
  }
  if (mimeType.startsWith('video/')) {
    return { type: 'video', cap: utils.constants.WHATSAPP_MAX_VIDEO_BYTES };
  }
  if (mimeType.startsWith('audio/')) {
    return { type: 'audio', cap: utils.constants.WHATSAPP_MAX_AUDIO_BYTES };
  }
  return { type: 'document', cap: utils.constants.WHATSAPP_MAX_DOCUMENT_BYTES };
};

// Two-step Cloud API send: (1) upload the bytes to /<phoneNumberId>/media to
// mint a media id, then (2) post a message of the matching type referencing it.
// Shared by the multipart upload path (artifact files) and the remote MCP
// resource path. Returns the status + parsed body for the caller to relay.
export const sendBlobToWhatsapp = async (
  meta: WhatsappSendRequest,
  blob: Blob,
  filename: string
): Promise<{ status: number; body: unknown }> => {
  const mimeType =
    blob.type || utils.constants.MIMETYPE_APPLICATION_OCTET_STREAM;
  const { type, cap } = pickType(mimeType);
  if (blob.size > cap) {
    return {
      status: 413,
      body: {
        error: `file exceeds WhatsApp ${type} ${Math.round(
          cap / (1024 * 1024)
        )}MB limit`
      }
    };
  }

  // Step 1 — upload media.
  const mediaForm = new FormData();
  mediaForm.append('messaging_product', 'whatsapp');
  mediaForm.append('type', mimeType);
  mediaForm.append('file', blob, filename);

  const uploadResponse = await fetch(
    `${WHATSAPP_BASE}/${meta.phoneNumberId}/media`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${meta.accessToken}` },
      body: mediaForm
    }
  );
  const uploadBody = (await uploadResponse.json().catch(() => ({}))) as {
    id?: string;
    error?: unknown;
  };
  if (!uploadResponse.ok || !uploadBody.id) {
    return {
      status: uploadResponse.ok ? 502 : uploadResponse.status,
      body: uploadBody
    };
  }

  // Step 2 — send the message referencing the uploaded media id. Captions are
  // supported on image/video/document (not audio); document also carries a
  // filename so the chat shows a sensible name.
  const mediaObject: Record<string, unknown> = { id: uploadBody.id };
  if (type === 'document') mediaObject.filename = filename;
  if (meta.caption && type !== 'audio') mediaObject.caption = meta.caption;

  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: meta.to,
    type,
    [type]: mediaObject
  };
  if (meta.replyToMessageId) {
    payload.context = { message_id: meta.replyToMessageId };
  }

  const sendResponse = await fetch(
    `${WHATSAPP_BASE}/${meta.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${meta.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );
  const sendBody = await sendResponse.json().catch(() => ({}));
  return {
    status: sendResponse.ok ? 200 : sendResponse.status,
    body: sendBody
  };
};

export const handleWhatsappSend = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> => {
  let form: FormData;
  try {
    form = await serverUtils.parseMultipartRequest(req);
  } catch (err) {
    serverUtils.sendJson(res, 400, {
      error: `failed to parse multipart body: ${(err as Error).message}`
    });
    return;
  }

  const metadataRaw = form.get('metadata');
  if (typeof metadataRaw !== 'string') {
    serverUtils.sendJson(res, 400, { error: 'missing metadata field' });
    return;
  }

  let metadata: WhatsappSendRequest;
  try {
    metadata = JSON.parse(metadataRaw) as WhatsappSendRequest;
  } catch (err) {
    serverUtils.sendJson(res, 400, {
      error: `metadata field is not valid JSON: ${(err as Error).message}`
    });
    return;
  }

  if (!metadata.accessToken || !metadata.phoneNumberId) {
    serverUtils.sendJson(res, 401, {
      error: 'missing accessToken or phoneNumberId in metadata'
    });
    return;
  }
  if (!metadata.to) {
    serverUtils.sendJson(res, 400, { error: 'missing to in metadata' });
    return;
  }

  const file = form.get('file');
  if (!file || typeof file === 'string') {
    serverUtils.sendJson(res, 400, { error: 'missing file field' });
    return;
  }
  const fileObj = file as File;
  const mimeType =
    fileObj.type || utils.constants.MIMETYPE_APPLICATION_OCTET_STREAM;
  const filename = fileObj.name || 'file';

  const result = await sendBlobToWhatsapp(
    metadata,
    new Blob([await fileObj.arrayBuffer()], { type: mimeType }),
    filename
  );
  serverUtils.sendJson(res, result.status, result.body);
};
