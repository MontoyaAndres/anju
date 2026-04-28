import type { ExecutionContext, MessageBatch } from '@cloudflare/workers-types';
import { db } from '@anju/db';
import { utils } from '@anju/utils';
import { eq } from 'drizzle-orm';

import { extractTextFromFile, reindexResourceChunks } from '../utils';

import type { Bindings } from '../types';

export interface IndexJob {
  resourceId: string;
}

const indexOne = async (env: Bindings, resourceId: string): Promise<void> => {
  const source = { env };
  const dbInstance = db.create(source);

  const [resource] = await dbInstance
    .select()
    .from(db.schema.artifactResource)
    .where(eq(db.schema.artifactResource.id, resourceId))
    .limit(1);

  if (!resource) {
    console.warn(
      `[${utils.constants.SERVICE_NAME_API}] indexResource: resource ${resourceId} not found, skipping`
    );
    return;
  }

  let extractedText: string | null = null;
  if (resource.fileKey) {
    const obj = await env.STORAGE_BUCKET.get(resource.fileKey);
    if (!obj) {
      throw new Error(
        `Resource bytes missing in storage for ${resourceId} (fileKey: ${resource.fileKey})`
      );
    }
    const buffer = await obj.arrayBuffer();
    const file = new File([buffer], resource.fileName || resource.title, {
      type: resource.mimeType || 'application/octet-stream'
    });
    extractedText = await extractTextFromFile(file);
  }

  await reindexResourceChunks(source, {
    id: resource.id,
    artifactId: resource.artifactId,
    title: resource.title,
    description: resource.description,
    uri: resource.uri,
    mimeType: resource.mimeType,
    fileName: resource.fileName,
    content: extractedText ?? resource.content
  });
};

const isRateLimitError = (error: unknown): boolean => {
  const status = (error as { status?: unknown })?.status;
  return status === 429;
};

export const handleIndexBatch = async (
  batch: MessageBatch<IndexJob>,
  env: Bindings,
  _ctx: ExecutionContext
): Promise<void> => {
  for (const message of batch.messages) {
    try {
      await indexOne(env, message.body.resourceId);
      message.ack();
    } catch (error) {
      console.error(
        `[${utils.constants.SERVICE_NAME_API}] indexResource ${message.body.resourceId} failed`,
        error
      );
      if (isRateLimitError(error)) {
        message.retry({
          delaySeconds: utils.constants.RATE_LIMIT_BACKOFF_SECONDS
        });
      } else {
        message.retry();
      }
    }
  }
};
