import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { utils } from '@anju/utils';
import { utils as dbUtils } from '@anju/db';

import {
  UserController,
  ArtifactController,
  OrganizationController,
  ProjectController,
  OAuthController,
  CatalogController,
  ChannelController
} from './controllers';
import { UserMiddleware } from './middleware';
import { createAuth } from './utils';
import {
  handleIndexBatch,
  handleCrawlDiscoverBatch,
  handleCrawlPageBatch
} from './queue';

// types
import type { AppEnv, Bindings } from './types';
import type { ExecutionContext, MessageBatch } from '@cloudflare/workers-types';
import type { IndexJob, CrawlDiscoverJob, PageJob } from './queue';

const app = new Hono<AppEnv>();

app
  .use(
    '*',
    cors({
      origin: (origin, c) =>
        origin === utils.getEnv(c, 'NEXT_PUBLIC_WEB_URL') ? origin : null,
      credentials: true,
      allowHeaders: ['Content-Type', 'User-Agent'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    })
  )
  .onError(async (error, c) => {
    const { status, body } = await dbUtils.handleError(c, error, {
      service: utils.constants.SERVICE_NAME_API
    });
    return c.json(body, status);
  })

  // Auth controller
  .on(['GET', 'POST'], '/auth/*', c => {
    const auth = createAuth(c);
    return auth.handler(c.req.raw);
  })
  .get('/me', UserMiddleware.verify, c => {
    const user = c.get('user');
    return c.json({ user });
  })

  // User controller
  .post('/user/avatar', UserMiddleware.verify, UserController.uploadAvatar)
  .get('/user/:userId/avatar/:filename', UserController.downloadAvatar)

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
  )

  // Artifact Prompt controller
  .get(
    '/organization/:organizationId/project/:projectId/artifact/prompt',
    UserMiddleware.verify,
    ArtifactController.listPrompts
  )
  .post(
    '/organization/:organizationId/project/:projectId/artifact/prompt',
    UserMiddleware.verify,
    ArtifactController.createPrompt
  )
  .put(
    '/organization/:organizationId/project/:projectId/artifact/prompt/:promptId',
    UserMiddleware.verify,
    ArtifactController.updatePrompt
  )
  .delete(
    '/organization/:organizationId/project/:projectId/artifact/prompt/:promptId',
    UserMiddleware.verify,
    ArtifactController.removePrompt
  )

  // Artifact Resource controller
  .get(
    '/organization/:organizationId/project/:projectId/artifact/resource',
    UserMiddleware.verify,
    ArtifactController.listResources
  )
  .post(
    '/organization/:organizationId/project/:projectId/artifact/resource',
    UserMiddleware.verify,
    ArtifactController.createResource
  )
  .put(
    '/organization/:organizationId/project/:projectId/artifact/resource/:resourceId',
    UserMiddleware.verify,
    ArtifactController.updateResource
  )
  .delete(
    '/organization/:organizationId/project/:projectId/artifact/resource/:resourceId',
    UserMiddleware.verify,
    ArtifactController.removeResource
  )
  .post(
    '/organization/:organizationId/project/:projectId/artifact/resource/:resourceId/upload',
    UserMiddleware.verify,
    ArtifactController.uploadResourceFile
  )
  .get(
    '/organization/:organizationId/project/:projectId/artifact/resource/:resourceId/download',
    UserMiddleware.verify,
    ArtifactController.downloadResourceFile
  )

  // Artifact Tool controller
  .get(
    '/organization/:organizationId/project/:projectId/artifact/tool',
    UserMiddleware.verify,
    ArtifactController.listTools
  )
  .post(
    '/organization/:organizationId/project/:projectId/artifact/tool',
    UserMiddleware.verify,
    ArtifactController.createTool
  )
  .put(
    '/organization/:organizationId/project/:projectId/artifact/tool/:toolId',
    UserMiddleware.verify,
    ArtifactController.updateTool
  )
  .delete(
    '/organization/:organizationId/project/:projectId/artifact/tool/:toolId',
    UserMiddleware.verify,
    ArtifactController.removeTool
  )

  // Artifact Credential controller
  .get(
    '/organization/:organizationId/project/:projectId/artifact/credential',
    UserMiddleware.verify,
    ArtifactController.listCredentials
  )
  .delete(
    '/organization/:organizationId/project/:projectId/artifact/credential/:credentialId',
    UserMiddleware.verify,
    ArtifactController.removeCredential
  )

  // Tool catalog controller
  .get('/catalog/tools', UserMiddleware.verify, CatalogController.listGroups)

  // Artifact LLM controller
  .get(
    '/organization/:organizationId/project/:projectId/artifact/llm',
    UserMiddleware.verify,
    ArtifactController.getLlm
  )
  .put(
    '/organization/:organizationId/project/:projectId/artifact/llm',
    UserMiddleware.verify,
    ArtifactController.upsertLlm
  )

  // Channel controller
  .get(
    '/organization/:organizationId/project/:projectId/channel',
    UserMiddleware.verify,
    ChannelController.list
  )
  .post(
    '/organization/:organizationId/project/:projectId/channel',
    UserMiddleware.verify,
    ChannelController.create
  )
  .put(
    '/organization/:organizationId/project/:projectId/channel/:channelId',
    UserMiddleware.verify,
    ChannelController.update
  )
  .delete(
    '/organization/:organizationId/project/:projectId/channel/:channelId',
    UserMiddleware.verify,
    ChannelController.remove
  )
  .get(
    '/organization/:organizationId/project/:projectId/channel/:channelId/conversation',
    UserMiddleware.verify,
    ChannelController.listConversations
  )
  .get(
    '/organization/:organizationId/project/:projectId/channel/:channelId/conversation/:conversationId/message',
    UserMiddleware.verify,
    ChannelController.listMessages
  )

  // Channel webhook (public, signed by platform secret)
  .post('/channel/:channelId/webhook/:platform', ChannelController.webhook)

  // OAuth controller
  .get(
    '/oauth/:provider/authorize',
    UserMiddleware.verify,
    OAuthController.authorize
  )
  .get('/oauth/:provider/callback', OAuthController.callback);

export { ResourceHandler } from '@anju/containers';

export default {
  fetch: app.fetch,
  queue: (
    batch: MessageBatch<IndexJob | CrawlDiscoverJob | PageJob>,
    env: Bindings,
    ctx: ExecutionContext
  ) => {
    if (batch.queue.startsWith('anju-crawl-discover')) {
      return handleCrawlDiscoverBatch(
        batch as MessageBatch<CrawlDiscoverJob>,
        env,
        ctx
      );
    }
    if (batch.queue.startsWith('anju-crawl-page')) {
      return handleCrawlPageBatch(
        batch as MessageBatch<PageJob>,
        env,
        ctx
      );
    }
    return handleIndexBatch(batch as MessageBatch<IndexJob>, env, ctx);
  }
};
