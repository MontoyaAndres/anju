import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { utils } from '@anju/utils';
import { db } from '@anju/db';

import { MCPController } from './controllers';

// types
import type { AppEnv } from './types';

const SERVICE_NAME = 'mcp';

const app = new Hono<AppEnv>();

app
  .use(
    '*',
    cors({
      origin: ['*'],
      allowHeaders: [
        'Content-Type',
        'User-Agent',
        'Authorization',
        'Accept',
        'Mcp-Session-Id',
      ],
      allowMethods: ['GET', 'POST'],
    })
  )
  .onError(
    utils.createErrorHandler({
      service: SERVICE_NAME,
      persist: async (payload, c) => {
        const dbInstance = db.create(c);
        await dbInstance.insert(db.schema.errorLog).values({
          service: SERVICE_NAME,
          referenceId: payload.referenceId,
          name: payload.name,
          message: payload.message,
          stack: payload.stack,
          status: payload.status,
          method: payload.method,
          path: payload.path,
          query: payload.query,
          userAgent: payload.userAgent,
          ipAddress: payload.ipAddress,
          metadata: payload.metadata
        });
      }
    })
  )

  // MCP controller
  .post('/', MCPController.business)
  .get('/health', MCPController.health);

if (process.env.NODE_ENV === 'development') {
  import('@hono/node-server').then(({ serve }) => {
    serve({
      fetch: app.fetch,
      port: Number(process.env.MCP_PORT),
    });
  });
}

export default app;
