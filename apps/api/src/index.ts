import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';

import { OrganizationController, ProjectController } from './controllers';
import { ErrorMiddleware, UserMiddleware } from './middleware';
import { auth } from './utils';

// types
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();

app
  .use(
    '*',
    cors({
      origin: [process.env.NEXT_PUBLIC_WEB_URL!],
      credentials: true,
      allowHeaders: ['Content-Type', 'User-Agent', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    })
  )
  .onError(ErrorMiddleware.errorHandler)

  // Auth controller
  .on(['GET', 'POST'], '/auth/*', c => auth.handler(c.req.raw))
  .get('/me', UserMiddleware.verify, c => {
    const user = c.get('user');
    return c.json({ user });
  })

  // Organization controller
  .get('/organization', UserMiddleware.verify, OrganizationController.list)
  .post('/organization', UserMiddleware.verify, OrganizationController.create)
  .put(
    '/organization/:organizationId',
    UserMiddleware.verify,
    OrganizationController.update
  )
  .get(
    '/organization/:organizationId',
    UserMiddleware.verify,
    OrganizationController.get
  )
  .delete(
    '/organization/:organizationId',
    UserMiddleware.verify,
    OrganizationController.remove
  )

  // Project controller
  .post(
    '/organization/:organizationId/project',
    UserMiddleware.verify,
    ProjectController.create
  )
  .put(
    '/organization/:organizationId/project/:projectId',
    UserMiddleware.verify,
    ProjectController.update
  )
  .get(
    '/organization/:organizationId/project/:projectId',
    UserMiddleware.verify,
    ProjectController.get
  )
  .delete(
    '/organization/:organizationId/project/:projectId',
    UserMiddleware.verify,
    ProjectController.remove
  );

serve({
  fetch: app.fetch,
  port: Number(process.env.SERVER_PORT),
});

export default app;
