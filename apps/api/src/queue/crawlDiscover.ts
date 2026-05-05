import type { ExecutionContext, MessageBatch } from '@cloudflare/workers-types';
import { db } from '@anju/db';
import { utils } from '@anju/utils';
import { eq } from 'drizzle-orm';
import { getResourceHandler } from '@anju/containers';

import { markResourceFailed, reportQueueError } from './shared';

import type { Bindings } from '../types';
import type { PageJob } from './crawlPage';

export interface CrawlDiscoverJob {
  resourceId: string;
}

interface DiscoveredPage {
  url: string;
  title?: string;
  depth: number;
}

const discoverOne = async (
  env: Bindings,
  resourceId: string
): Promise<void> => {
  const dbInstance = db.create({ env });

  const [resource] = await dbInstance
    .select()
    .from(db.schema.artifactResource)
    .where(eq(db.schema.artifactResource.id, resourceId))
    .limit(1);

  if (!resource) {
    console.warn(
      `[${utils.constants.SERVICE_NAME_API}] crawlDiscover: resource ${resourceId} not found`
    );
    return;
  }

  if (resource.sourceType !== utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE) {
    console.warn(
      `[${utils.constants.SERVICE_NAME_API}] crawlDiscover: resource ${resourceId} is not a ${utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE}; skipping`
    );
    return;
  }

  const config = (resource.crawlConfig || {}) as {
    maxPages?: number;
    maxDepth?: number;
  };
  const maxPages = config.maxPages ?? utils.constants.CRAWL_DEFAULT_MAX_PAGES;
  const maxDepth = config.maxDepth ?? utils.constants.CRAWL_DEFAULT_MAX_DEPTH;

  const handler = getResourceHandler(env);
  const response = await handler.fetch(
    'http://resource-handler/crawl/discover',
    {
      method: 'POST',
      headers: { 'content-type': utils.constants.MIMETYPE_APPLICATION_JSON },
      body: JSON.stringify({ url: resource.uri, maxPages, maxDepth })
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `resource-handler /crawl/discover failed (${response.status}) for ${resourceId}: ${detail}`
    );
  }

  const payload: { pages: DiscoveredPage[] } = await response.json();
  const pages = payload.pages || [];

  if (pages.length === 0) {
    await dbInstance
      .update(db.schema.artifactResource)
      .set({ status: utils.constants.STATUS_COMPLETED })
      .where(eq(db.schema.artifactResource.id, resourceId));
    return;
  }

  const inserted = await dbInstance
    .insert(db.schema.artifactResource)
    .values(
      pages.map(page => ({
        title: page.title || page.url,
        uri: page.url,
        type: utils.constants.RESOURCE_TYPE_STATIC,
        sourceType: utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE,
        status: utils.constants.STATUS_PENDING,
        mimeType: utils.constants.MIMETYPE_TEXT,
        encoding: utils.constants.ENCODING_UTF8,
        artifactId: resource.artifactId,
        parentResourceId: resource.id,
        metadata: { depth: page.depth }
      }))
    )
    .returning({ id: db.schema.artifactResource.id });

  await dbInstance
    .update(db.schema.artifactResource)
    .set({
      childResourceCount: pages.length,
      status: utils.constants.STATUS_PENDING
    })
    .where(eq(db.schema.artifactResource.id, resourceId));

  if (env.CRAWL_PAGE_QUEUE) {
    await env.CRAWL_PAGE_QUEUE.sendBatch(
      inserted.map(({ id }) => ({
        body: {
          resourceId: id,
          parentResourceId: resource.id
        } satisfies PageJob
      }))
    );
  }
};

export const handleCrawlDiscoverBatch = async (
  batch: MessageBatch<CrawlDiscoverJob>,
  env: Bindings,
  _ctx: ExecutionContext
): Promise<void> => {
  await utils.processQueueBatch(batch, {
    process: async ({ resourceId }) => discoverOne(env, resourceId),
    onError: async (error, { resourceId }, queueName) => {
      await reportQueueError(env, '/crawl/discover', error, {
        resourceId,
        queue: queueName
      });
      await markResourceFailed(env, resourceId);
    }
  });
};
