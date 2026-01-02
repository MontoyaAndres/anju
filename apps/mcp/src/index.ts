import { Hono } from 'hono';
import { cors } from 'hono/cors';

// types
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();

app
  .use(
    '*',
    cors({
      origin: ['*'],
      allowHeaders: ['Content-Type', 'User-Agent', 'Authorization'],
      allowMethods: ['POST'],
    })
  )

  // Organization controller
  .get('/', () => {
    return true;
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
