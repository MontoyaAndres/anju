import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { MCPController } from './controllers';

// types
import type { AppEnv } from './types';

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
