import { Hono } from 'hono';

import { auth } from './utils';

const app = new Hono();

app
  .on(['GET', 'POST'], '/auth/*', c => auth.handler(c.req.raw))
  .get('/env', c => {
    return c.json({
      env: process.env,
    });
  });

if (process.env.NODE_ENV === 'development') {
  import('@hono/node-server').then(({ serve }) => {
    serve({
      fetch: app.fetch,
      port: Number(process.env.SERVER_PORT),
    });
  });
}

export default app;
