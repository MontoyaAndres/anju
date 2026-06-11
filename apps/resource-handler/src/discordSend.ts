import http from 'node:http';
import { utils } from '@anju/utils';
import type { DiscordSendRequest } from '@anju/utils';

import { utils as serverUtils } from './utils/index.js';

const MAX_UPLOAD = utils.constants.DISCORD_MAX_UPLOAD_BYTES;

// Upload a single file to a Discord channel via the multipart form on
// POST /channels/{channelId}/messages: a `payload_json` field carries the
// message body (content + attachment descriptor) and `files[0]` carries the
// bytes. Shared by the multipart path (artifact files) and the remote-MCP path.
export const sendBlobToDiscord = async (
  meta: DiscordSendRequest,
  blob: Blob,
  filename: string
): Promise<{ status: number; body: unknown }> => {
  if (blob.size > MAX_UPLOAD) {
    return {
      status: 413,
      body: {
        error: `file exceeds Discord ${Math.round(
          MAX_UPLOAD / (1024 * 1024)
        )}MB upload limit`
      }
    };
  }

  const payload: Record<string, unknown> = {
    attachments: [{ id: 0, filename }],
    allowed_mentions: { parse: [] }
  };
  if (meta.content) payload.content = meta.content;
  if (meta.replyToMessageId) {
    payload.message_reference = {
      message_id: meta.replyToMessageId,
      fail_if_not_exists: false
    };
  }

  const form = new FormData();
  form.append('payload_json', JSON.stringify(payload));
  form.append('files[0]', blob, filename);

  const url = `${utils.constants.DISCORD_API_BASE}/channels/${meta.channelId}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bot ${meta.botToken}` },
    body: form
  });
  const responseBody = await response.json().catch(() => ({}));
  return { status: response.ok ? 200 : response.status, body: responseBody };
};

export const handleDiscordSend = async (
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

  let metadata: DiscordSendRequest;
  try {
    metadata = JSON.parse(metadataRaw) as DiscordSendRequest;
  } catch (err) {
    serverUtils.sendJson(res, 400, {
      error: `metadata field is not valid JSON: ${(err as Error).message}`
    });
    return;
  }

  if (!metadata.botToken) {
    serverUtils.sendJson(res, 401, { error: 'missing botToken in metadata' });
    return;
  }
  if (!metadata.channelId) {
    serverUtils.sendJson(res, 400, {
      error: 'missing channelId in metadata'
    });
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

  const result = await sendBlobToDiscord(
    metadata,
    new Blob([await fileObj.arrayBuffer()], { type: mimeType }),
    filename
  );
  serverUtils.sendJson(res, result.status, result.body);
};
