import type {
  ExecutionContext,
  MessageBatch,
  ReadableStream as WorkersReadableStream
} from '@cloudflare/workers-types';
import { db } from '@anju/db';
import { utils } from '@anju/utils';
import { eq, sql } from 'drizzle-orm';

import {
  enqueueIndex,
  getOneDriveAccessToken,
  getOneDriveItem,
  downloadOneDriveFile,
  buildOneDriveResourceMetadata,
  parseOneDriveUri
} from '../utils';
import { markResourceFailed, reportQueueError } from './shared';

import type { Bindings } from '../types';

export interface OnedriveFileJob {
  resourceId: string;
}

const removeMissingFile = async (
  env: Bindings,
  resource: {
    id: string;
    artifactId: string;
    parentResourceId: string | null;
    fileKey: string | null;
  }
): Promise<void> => {
  const dbInstance = db.create({ env });
  await dbInstance.transaction(async tx => {
    const deleted = await tx
      .delete(db.schema.artifactResource)
      .where(eq(db.schema.artifactResource.id, resource.id))
      .returning({ id: db.schema.artifactResource.id });
    if (deleted.length === 0) return;

    await tx
      .update(db.schema.artifact)
      .set({
        artifactResourceCount: sql`GREATEST(${db.schema.artifact.artifactResourceCount}::int - 1, 0)`
      })
      .where(eq(db.schema.artifact.id, resource.artifactId));

    if (resource.parentResourceId) {
      await tx
        .update(db.schema.artifactResource)
        .set({
          childResourceCount: sql`GREATEST(${db.schema.artifactResource.childResourceCount}::int - 1, 0)`
        })
        .where(eq(db.schema.artifactResource.id, resource.parentResourceId));
    }
  });

  if (resource.fileKey && env.STORAGE_BUCKET) {
    try {
      await env.STORAGE_BUCKET.delete(resource.fileKey);
    } catch {
      // best-effort
    }
  }
};

const syncOne = async (env: Bindings, resourceId: string): Promise<void> => {
  const source = { env };
  const dbInstance = db.create(source);

  const [resource] = await dbInstance
    .select()
    .from(db.schema.artifactResource)
    .where(eq(db.schema.artifactResource.id, resourceId))
    .limit(1);

  if (!resource) {
    console.warn(
      `[${utils.constants.SERVICE_NAME_API}] onedriveFile: resource ${resourceId} not found`
    );
    return;
  }

  const meta =
    resource.metadata && typeof resource.metadata === 'object'
      ? (resource.metadata as Record<string, unknown>)
      : null;
  const itemId =
    (meta?.oneDriveItemId as string | undefined) ??
    parseOneDriveUri(resource.uri)?.itemId ??
    null;
  const driveId =
    (meta?.oneDriveDriveId as string | undefined) ??
    parseOneDriveUri(resource.uri)?.driveId;

  if (!itemId) {
    throw new Error(
      `onedriveFile: cannot resolve onedrive item id for resource ${resourceId}`
    );
  }

  const accessToken = await getOneDriveAccessToken(source, resource.artifactId);
  const file = await getOneDriveItem(accessToken, itemId, driveId);

  if (!file || file.deleted) {
    await removeMissingFile(env, {
      id: resource.id,
      artifactId: resource.artifactId,
      parentResourceId: resource.parentResourceId,
      fileKey: resource.fileKey
    });
    return;
  }

  const declaredSize =
    typeof file.size === 'number' && Number.isFinite(file.size)
      ? file.size
      : null;
  if (
    declaredSize !== null &&
    declaredSize > utils.constants.MAX_FILE_SIZE
  ) {
    throw new Error(
      `OneDrive file ${file.id} exceeds the ${utils.constants.MAX_FILE_SIZE / (1024 * 1024)}MB limit (size: ${declaredSize} bytes)`
    );
  }

  const downloaded = await downloadOneDriveFile(accessToken, file, driveId);

  const bucket = env.STORAGE_BUCKET;
  if (!bucket) {
    throw new Error('STORAGE_BUCKET is not configured');
  }

  const [{ artifactId, projectId, organizationId }] = await dbInstance
    .select({
      artifactId: db.schema.artifact.id,
      projectId: db.schema.artifact.projectId,
      organizationId: db.schema.project.organizationId
    })
    .from(db.schema.artifact)
    .innerJoin(
      db.schema.project,
      eq(db.schema.artifact.projectId, db.schema.project.id)
    )
    .where(eq(db.schema.artifact.id, resource.artifactId))
    .limit(1);

  const key = `organizations/${organizationId}/projects/${projectId}/resources/${artifactId}/onedrive/${file.id}/${downloaded.fileName}`;

  if (resource.fileKey && resource.fileKey !== key) {
    try {
      await bucket.delete(resource.fileKey);
    } catch {
      // best-effort
    }
  }

  const putResult = await bucket.put(
    key,
    downloaded.body as unknown as WorkersReadableStream,
    {
      httpMetadata: { contentType: downloaded.mimeType }
    }
  );
  const storedSize = putResult?.size ?? declaredSize ?? 0;

  if (storedSize > utils.constants.MAX_FILE_SIZE) {
    try {
      await bucket.delete(key);
    } catch {
      // best-effort
    }
    throw new Error(
      `OneDrive file ${file.id} exceeded the ${utils.constants.MAX_FILE_SIZE / (1024 * 1024)}MB limit after download (size: ${storedSize} bytes)`
    );
  }

  await dbInstance
    .update(db.schema.artifactResource)
    .set({
      title: file.name,
      fileName: downloaded.fileName,
      fileKey: key,
      mimeType: downloaded.mimeType,
      size: storedSize,
      status: utils.constants.STATUS_PENDING,
      metadata: buildOneDriveResourceMetadata(file, driveId, {
        storedMimeType: downloaded.mimeType,
        lastSyncedAt: new Date().toISOString()
      })
    })
    .where(eq(db.schema.artifactResource.id, resource.id));

  await enqueueIndex(env, resource.id);
};

export const handleOnedriveFileBatch = async (
  batch: MessageBatch<OnedriveFileJob>,
  env: Bindings,
  _ctx: ExecutionContext
): Promise<void> => {
  await utils.processQueueBatch(batch, {
    process: async ({ resourceId }) => syncOne(env, resourceId),
    onError: async (error, { resourceId }, queueName) => {
      await reportQueueError(env, '/onedrive/file', error, {
        resourceId,
        queue: queueName
      });
      await markResourceFailed(env, resourceId);
    }
  });
};
