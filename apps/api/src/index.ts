import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { OrganizationController } from './controllers';
import { ErrorMiddleware, UserMiddleware } from './middleware';
import { createAuth } from './utils';

// types
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();

app
  .use(
    '*',
    cors({
      origin: [process.env.NEXT_PUBLIC_WEB_URL!],
      credentials: true,
      allowHeaders: ['Content-Type'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    })
  )
  .onError(ErrorMiddleware.errorHandler)

  // Auth controller
  .on(['GET', 'POST'], '/auth/*', c => {
    const auth = createAuth(c);
    return auth.handler(c.req.raw);
  })
  .get('/me', UserMiddleware.verify, c => {
    const user = c.get('user');
    return c.json({ user });
  })

  // Organization controller
  .get('/organization', UserMiddleware.verify, OrganizationController.list)
  .post('/organization', UserMiddleware.verify, OrganizationController.create)
  .put(
    '/organization/:id',
    UserMiddleware.verify,
    OrganizationController.update
  )
  .get('/organization/:id', UserMiddleware.verify, OrganizationController.get)
  .delete(
    '/organization/:id',
    UserMiddleware.verify,
    OrganizationController.remove
  );

if (process.env.NODE_ENV === 'development') {
  import('@hono/node-server').then(({ serve }) => {
    serve({
      fetch: app.fetch,
      port: Number(process.env.SERVER_PORT),
    });
  });
}

export default app;
