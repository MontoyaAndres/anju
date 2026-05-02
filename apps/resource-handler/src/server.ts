import http from 'node:http';
import { utils } from '@anju/utils';
import { utils as dbUtils } from '@anju/db';

import { extractDocuments } from './extract.js';
import { handleGmailSend } from './gmailSend.js';
import { handleTelegramSend } from './telegramSend.js';

const readBody = (req: http.IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(chunk as Buffer));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

const sendJson = (
  res: http.ServerResponse,
  status: number,
  body: unknown
): void => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

const handleExtract = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> => {
  const mimeType = (req.headers['x-mime-type'] || '').toString();
  const fileName = req.headers['x-file-name']
    ? decodeURIComponent(req.headers['x-file-name'].toString())
    : undefined;

  if (!mimeType) {
    sendJson(res, 400, { error: 'missing x-mime-type header' });
    return;
  }
  if (!utils.isEmbeddableMimeType(mimeType)) {
    sendJson(res, 200, { documents: null });
    return;
  }

  const body = await readBody(req);
  const documents = await extractDocuments(body, mimeType, fileName);
  sendJson(res, 200, { documents });
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200);
      res.end('ok');
      return;
    }

    if (req.method === 'POST' && req.url === '/extract') {
      await handleExtract(req, res);
      return;
    }

    if (req.method === 'POST' && req.url === '/gmail/send') {
      await handleGmailSend(req, res);
      return;
    }

    if (req.method === 'POST' && req.url === '/telegram/send') {
      await handleTelegramSend(req, res);
      return;
    }

    res.writeHead(404);
    res.end();
  } catch (error) {
    const { refId, status, body } = await dbUtils.handleError(
      {
        env: {
          HYPERDRIVE: { connectionString: process.env.DATABASE_URL || '' }
        },
        request: {
          method: req.method || null,
          path: req.url || null,
          userAgent: req.headers['user-agent']?.toString() || null,
          ipAddress:
            req.headers['cf-connecting-ip']?.toString() ||
            req.headers['x-forwarded-for']?.toString() ||
            req.socket.remoteAddress ||
            null
        }
      },
      error,
      { service: utils.constants.SERVICE_NAME_RESOURCE_HANDLER }
    );
    if (!res.headersSent) {
      sendJson(res, status, { id: refId, ...body });
    } else {
      res.end();
    }
  }
});

server.listen(process.env.PORT || 8082);
