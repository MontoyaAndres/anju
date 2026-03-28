import { db } from '@anju/db';
import { utils } from '@anju/utils';
import { InferSelectModel } from 'drizzle-orm';
import { R2Bucket } from '@cloudflare/workers-types';

type ArtifactResource = InferSelectModel<typeof db.schema.artifactResource>;

export const readResourceContent = async (
  resource: ArtifactResource,
  uri: URL,
  bucket: R2Bucket
) => {
  if (resource.content) {
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: resource.mimeType,
          text: resource.content
        }
      ]
    };
  }

  if (resource.fileKey && bucket) {
    const object = await bucket.get(resource.fileKey);

    if (!object) {
      throw new Error(
        `Resource file not found in storage: ${resource.fileKey}`
      );
    }

    if (utils.constants.TEXT_MIME_TYPES.includes(resource.mimeType)) {
      const text = await object.text();

      return {
        contents: [{ uri: uri.href, mimeType: resource.mimeType, text }]
      };
    }

    const arrayBuffer = await object.arrayBuffer();
    const blob = Buffer.from(arrayBuffer).toString('base64');

    return {
      contents: [{ uri: uri.href, mimeType: resource.mimeType, blob }]
    };
  }

  return {
    contents: [
      {
        uri: uri.href,
        mimeType: resource.mimeType,
        text: resource.content || ''
      }
    ]
  };
};
