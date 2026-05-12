import type { Bindings } from '../types';
import type {
  IndexJob,
  CrawlDiscoverJob,
  GdriveDiscoverJob,
  GdriveFileJob
} from '../queue';

export const enqueueIndex = async (
  env: Bindings,
  resourceIds: string | string[]
): Promise<void> => {
  const ids = Array.isArray(resourceIds) ? resourceIds : [resourceIds];
  if (ids.length === 0) return;
  if (!env.INDEX_QUEUE) return;

  if (ids.length === 1) {
    await env.INDEX_QUEUE.send({ resourceId: ids[0] } satisfies IndexJob);
    return;
  }

  await env.INDEX_QUEUE.sendBatch(
    ids.map(id => ({ body: { resourceId: id } satisfies IndexJob }))
  );
};

export const enqueueCrawlDiscover = async (
  env: Bindings,
  resourceId: string
): Promise<void> => {
  if (!env.CRAWL_DISCOVER_QUEUE) return;
  await env.CRAWL_DISCOVER_QUEUE.send({
    resourceId
  } satisfies CrawlDiscoverJob);
};

export const enqueueGdriveDiscover = async (
  env: Bindings,
  resourceIds: string | string[]
): Promise<void> => {
  const ids = Array.isArray(resourceIds) ? resourceIds : [resourceIds];
  if (ids.length === 0) return;
  if (!env.GDRIVE_DISCOVER_QUEUE) return;

  if (ids.length === 1) {
    await env.GDRIVE_DISCOVER_QUEUE.send({
      resourceId: ids[0]
    } satisfies GdriveDiscoverJob);
    return;
  }

  await env.GDRIVE_DISCOVER_QUEUE.sendBatch(
    ids.map(id => ({
      body: { resourceId: id } satisfies GdriveDiscoverJob
    }))
  );
};

export const enqueueGdriveFile = async (
  env: Bindings,
  resourceIds: string | string[]
): Promise<void> => {
  const ids = Array.isArray(resourceIds) ? resourceIds : [resourceIds];
  if (ids.length === 0) return;
  if (!env.GDRIVE_FILE_QUEUE) return;

  if (ids.length === 1) {
    await env.GDRIVE_FILE_QUEUE.send({
      resourceId: ids[0]
    } satisfies GdriveFileJob);
    return;
  }

  await env.GDRIVE_FILE_QUEUE.sendBatch(
    ids.map(id => ({ body: { resourceId: id } satisfies GdriveFileJob }))
  );
};
