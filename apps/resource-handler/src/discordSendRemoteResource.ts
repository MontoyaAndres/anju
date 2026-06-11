import http from 'node:http';
import { utils } from '@anju/utils';
import type { DiscordSendRemoteResourceRequest } from '@anju/utils';

import { utils as serverUtils } from './utils/index.js';
import { connectRemoteMcpClient } from './remoteMcpClient.js';
import { sendBlobToDiscord } from './discordSend.js';

// Read a PROXIED (remote MCP) resource and deliver it to Discord as a file —
// entirely inside the container, so the bytes never transit the 128 MiB worker.
// The worker hands over only the connection details + resolved auth header as
// JSON; this connects to the remote MCP server, reads the resource, decodes its
// blob/text, and forwards it via the shared Discord send.
export const handleDiscordSendRemoteResource = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> => {
  let body: DiscordSendRemoteResourceRequest;
  try {
    body =
      await serverUtils.parseJsonBody<DiscordSendRemoteResourceRequest>(req);
  } catch (err) {
    serverUtils.sendJson(res, 400, {
      error: `invalid JSON body: ${(err as Error).message}`
    });
    return;
  }

  const discord = body?.discord;
  const remote = body?.remote;
  if (!discord?.botToken) {
    serverUtils.sendJson(res, 401, { error: 'missing botToken in discord' });
    return;
  }
  if (!discord.channelId) {
    serverUtils.sendJson(res, 400, { error: 'missing channelId in discord' });
    return;
  }
  if (!remote?.url || !remote?.uri) {
    serverUtils.sendJson(res, 400, {
      error: 'missing remote.url or remote.uri'
    });
    return;
  }

  let handle;
  try {
    handle = await connectRemoteMcpClient({
      url: remote.url,
      transport: remote.transport,
      authHeader: remote.authHeader ?? null,
      timeoutMs: remote.timeoutMs || 10000
    });
  } catch (err) {
    serverUtils.sendJson(res, 502, {
      error: `could not reach the remote MCP server: ${(err as Error).message}`
    });
    return;
  }

  try {
    const read = (await handle.client.readResource({ uri: remote.uri })) as {
      contents?: unknown;
    };
    const contents = Array.isArray(read.contents) ? read.contents : [];

    let blob: Blob | null = null;
    let mimeType: string = utils.constants.MIMETYPE_APPLICATION_OCTET_STREAM;
    for (const raw of contents) {
      const c =
        raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
      const declaredMime =
        typeof c.mimeType === 'string' && c.mimeType ? c.mimeType : null;
      // Prefer binary blobs (base64); fall back to text.
      if (typeof c.blob === 'string' && c.blob) {
        mimeType =
          declaredMime || utils.constants.MIMETYPE_APPLICATION_OCTET_STREAM;
        const bytes = utils.base64ToBytes(c.blob);
        const buffer = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength
        ) as ArrayBuffer;
        blob = new Blob([buffer], { type: mimeType });
        break;
      }
      if (typeof c.text === 'string') {
        mimeType = declaredMime || utils.constants.MIMETYPE_TEXT;
        blob = new Blob([c.text], { type: mimeType });
        break;
      }
    }

    if (!blob) {
      serverUtils.sendJson(res, 422, {
        error: 'resource has no deliverable content'
      });
      return;
    }

    const result = await sendBlobToDiscord(
      discord,
      blob,
      serverUtils.filenameForResource(remote.uri, mimeType)
    );
    serverUtils.sendJson(res, result.status, result.body);
  } catch (err) {
    serverUtils.sendJson(res, 502, {
      error: `remote resource read/send failed: ${(err as Error).message}`
    });
  } finally {
    await handle.close();
  }
};
