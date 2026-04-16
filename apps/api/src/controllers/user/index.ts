import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '@anju/db';

// types
import type { AppEnv } from '../../types';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif'
];

const extensionFor = (mime: string) => {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpg';
};

const buildAvatarUrl = (userId: string, filename: string) =>
  `${process.env.NEXT_PUBLIC_API_URL || ''}/user/${userId}/avatar/${filename}`;

const uploadAvatar = async (c: Context<AppEnv>) => {
  const user = c.get('user');

  const formData = await c.req.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    throw new Error('File is required');
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('Avatar size exceeds the 5MB limit');
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`Unsupported image type: ${file.type}`);
  }

  const bucket = c.env.STORAGE_BUCKET;
  if (!bucket) {
    throw new Error('Storage not available');
  }

  const filename = `avatar-${Date.now()}.${extensionFor(file.type)}`;
  const key = `users/${user.id}/avatar/${filename}`;

  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type }
  });

  const image = buildAvatarUrl(user.id, filename);

  const dbInstance = db.create(c);
  await dbInstance
    .update(db.schema.user)
    .set({ image })
    .where(eq(db.schema.user.id, user.id));

  return c.json({ image });
};

const downloadAvatar = async (c: Context<AppEnv>) => {
  const userId = c.req.param('userId');
  const filename = c.req.param('filename');
  if (!userId || !filename) {
    throw new Error('Invalid avatar path');
  }

  const bucket = c.env.STORAGE_BUCKET;
  if (!bucket) {
    throw new Error('Storage not available');
  }

  const key = `users/${userId}/avatar/${filename}`;
  const object = await bucket.get(key);
  if (!object) {
    throw new Error('Avatar not found');
  }

  return new Response(object.body as unknown as ReadableStream, {
    headers: {
      'Content-Type':
        object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};

export const UserController = {
  uploadAvatar,
  downloadAvatar
};
