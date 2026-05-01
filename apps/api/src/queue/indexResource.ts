import type { ExecutionContext, MessageBatch } from '@cloudflare/workers-types';
import { db, utils as dbUtils } from '@anju/db';
import { ExtractedDocument, utils } from '@anju/utils';
import { eq } from 'drizzle-orm';

import { reindexResourceChunks } from '../utils';
import { getResourceHandler } from '../containers';

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

  let documents: ExtractedDocument[] | null = null;
  if (
    resource.fileKey &&
    resource.mimeType &&
    utils.isEmbeddableMimeType(resource.mimeType)
  ) {
    const obj = await env.STORAGE_BUCKET.get(resource.fileKey);
    if (!obj) {
      throw new Error(
        `Resource bytes missing in storage for ${resourceId} (fileKey: ${resource.fileKey})`
      );
    }

    const handler = getResourceHandler(env);
    const fileName = resource.fileName || resource.title;
    const response = await handler.fetch('http://resource-handler/extract', {
      method: 'POST',
      headers: {
        'content-type': utils.constants.MIMETYPE_APPLICATION_OCTET_STREAM,
        'x-mime-type': resource.mimeType,
        'x-file-name': encodeURIComponent(fileName)
      },
      body: obj.body as unknown as BodyInit
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      const { refId } = await dbUtils.handleError(
        { env, request: { method: 'QUEUE', path: '/indexResource' } },
        new Error(detail || `status ${response.status}`),
        {
          service: utils.constants.SERVICE_NAME_API,
          metadata: { resourceId, status: response.status }
        }
      );
      throw new Error(
        `resource-handler /extract failed (${response.status}) for ${resourceId} (refId: ${refId})`
      );
    }

    const payload = (await response.json()) as {
      documents: ExtractedDocument[] | null;
    };
    documents = payload.documents;
  }

  await reindexResourceChunks(source, {
    id: resource.id,
    artifactId: resource.artifactId,
    title: resource.title,
    description: resource.description,
    uri: resource.uri,
    mimeType: resource.mimeType,
    fileName: resource.fileName,
    content: resource.content,
    documents
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
    const { resourceId } = message.body;
    try {
      await indexOne(env, resourceId);
      message.ack();
    } catch (error) {
      await dbUtils.handleError(
        {
          env,
          request: { method: 'QUEUE', path: '/indexResource' }
        },
        error,
        {
          service: utils.constants.SERVICE_NAME_API,
          metadata: { resourceId, queue: batch.queue }
        }
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
