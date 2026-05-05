import { db, utils as dbUtils } from '@anju/db';
import { utils } from '@anju/utils';
import { eq } from 'drizzle-orm';

import type { Bindings } from '../types';

export const markResourceFailed = async (
  env: Bindings,
  resourceId: string
): Promise<void> => {
  try {
    const dbInstance = db.create({ env });
    await dbInstance
      .update(db.schema.artifactResource)
      .set({ status: utils.constants.STATUS_FAILED })
      .where(eq(db.schema.artifactResource.id, resourceId));
  } catch {
    // status update is best-effort
  }
};

export const reportQueueError = async (
  env: Bindings,
  path: string,
  error: unknown,
  metadata: Record<string, unknown>
): Promise<void> => {
  await dbUtils.handleError(
    { env, request: { method: 'QUEUE', path } },
    error,
    {
      service: utils.constants.SERVICE_NAME_API,
      metadata
    }
  );
};
