import type { Bindings } from '../types';
import type { IndexJob } from '../queue';

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
