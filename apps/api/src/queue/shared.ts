import type {
  R2Bucket,
  R2Object,
  ReadableStream as WorkersReadableStream
} from '@cloudflare/workers-types';
import { db, utils as dbUtils } from '@anju/db';
import { utils } from '@anju/utils';
import { eq } from 'drizzle-orm';

import type { Bindings } from '../types';

declare const FixedLengthStream: {
  new (expectedLength: number | bigint): {
    readable: WorkersReadableStream;
    writable: WritableStream<Uint8Array>;
  };
};

export const putR2Stream = async (
  bucket: R2Bucket,
  key: string,
  body: ReadableStream<Uint8Array>,
  contentLength: number | null,
  options: { contentType?: string } = {}
): Promise<R2Object | null> => {
  const httpMetadata = options.contentType
    ? { contentType: options.contentType }
    : undefined;

  if (
    contentLength !== null &&
    Number.isFinite(contentLength) &&
    contentLength >= 0
  ) {
    const fls = new FixedLengthStream(contentLength);
    const [, putResult] = await Promise.all([
      body.pipeTo(fls.writable as unknown as WritableStream<Uint8Array>),
      bucket.put(key, fls.readable, { httpMetadata })
    ]);
    return putResult;
  }

  const bytes = new Uint8Array(await new Response(body).arrayBuffer());
  return bucket.put(key, bytes, { httpMetadata });
};

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
