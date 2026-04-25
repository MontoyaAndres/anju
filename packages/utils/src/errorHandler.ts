import { v7 as uuid } from 'uuid';
import { db } from '@anju/db';

// types
import type { ZodError } from 'better-auth';
import type { Context } from 'hono';

export interface HandleErrorOptions {
  service: string;
  metadata?: Record<string, unknown>;
  status?: number;
}

export interface HandleErrorResult {
  refId: string;
  status: 400 | 401 | 403 | 404 | 409 | 500;
  body: Record<string, unknown>;
}

const matchStatus = (message: string): 400 | 401 | 403 | 404 | 409 | null => {
  const lower = message.toLowerCase();

  if (/\bnot found\b/.test(lower)) return 404;
  if (/\bunauthorized\b/.test(lower)) return 401;
  if (/\bforbidden\b/.test(lower)) return 403;
  if (/\b(unique|already exists|duplicate)\b/.test(lower)) return 409;
  if (/\b(uri|unsupported|invalid|required|exceeds|must be)\b/.test(lower))
    return 400;

  return null;
};

const extractContext = (c: Context) => {
  const user = (c.get('user') as { id?: string } | undefined) || undefined;
  return {
    method: c.req.method,
    path: c.req.path,
    query: new URL(c.req.url).search || null,
    userAgent: c.req.header('user-agent') || null,
    ipAddress:
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-forwarded-for') ||
      null,
    userId: user?.id || null,
    organizationId: c.req.param('organizationId') || null,
    projectId: c.req.param('projectId') || null
  };
};

export const handleError = async (
  c: Context,
  error: unknown,
  options: HandleErrorOptions
): Promise<HandleErrorResult> => {
  const refId = uuid();
  const err = error as { name?: string; message?: string; stack?: string };
  console.error(`[${options.service} ref ${refId}]`, err);

  let status: 400 | 401 | 403 | 404 | 409 | 500;
  let body: Record<string, unknown>;

  if (err?.name === 'ZodError') {
    status = 400;
    body = {
      errors: (error as ZodError).issues.map(issue => ({
        path: issue.path?.join('.') || '',
        message: issue.message
      }))
    };
  } else if (options.status) {
    status = options.status as HandleErrorResult['status'];
    body = { id: refId, error: err?.message || String(error) };
  } else {
    const matched = matchStatus(err?.message || '');
    if (matched) {
      status = matched;
      body = { error: err?.message || '' };
    } else {
      status = 500;
      body = { id: refId, error: 'Internal Server Error' };
    }
  }

  const ctx = extractContext(c);
  const dbInstance = db.create(c);
  await dbInstance
    .insert(db.schema.errorLog)
    .values({
      service: options.service,
      referenceId: refId,
      name: err?.name || 'Error',
      message: err?.message || String(error),
      stack: err?.stack || null,
      status,
      ...ctx,
      metadata: options.metadata ?? null
    })
    .catch(e => console.error('Failed to persist error log', e));

  return { refId, status, body };
};
