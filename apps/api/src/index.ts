import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { UserMiddleware } from './middleware';
import { auth } from './utils';

type Variables = {
  user: typeof auth.$Infer.Session.user;
  session: typeof auth.$Infer.Session.session;
};

const app = new Hono<{ Variables: Variables }>();

app.use(
  '*',
  cors({
    origin: [process.env.NEXT_PUBLIC_WEB_URL!],
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

app
  // Auth controller
  .on(['GET', 'POST'], '/auth/*', c => auth.handler(c.req.raw))

  // Protected route example
  .get('/me', UserMiddleware.verify, c => {
    const user = c.get('user');
    return c.json({ user });
  })
  .get('/protected', UserMiddleware.verify, c => {
    const user = c.get('user');
    return c.json({
      message: 'You have access to this protected resource',
      userId: user.id,
      email: user.email,
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
