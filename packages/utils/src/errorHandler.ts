import { ZodError } from 'better-auth';
import type { Context, ErrorHandler } from 'hono';
import { v7 as uuid } from 'uuid';

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

export interface ErrorLogPayload {
  referenceId: string;
  name: string;
  message: string;
  stack?: string | null;
  status: number;
  method?: string | null;
  path?: string | null;
  query?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  userId?: string | null;
  organizationId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CreateErrorHandlerOptions {
  service: string;
  persist?: (payload: ErrorLogPayload, c: Context) => Promise<void>;
}

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

export const createErrorHandler = (
  options: CreateErrorHandlerOptions
): ErrorHandler => {
  return (error, c) => {
    console.error(error);

    let responseBody: Record<string, unknown>;
    let status: 400 | 401 | 403 | 404 | 409 | 500;
    const referenceId = uuid();

    if (error.name === 'ZodError') {
      status = 400;
      responseBody = {
        errors: (error as ZodError).issues.map(issue => ({
          path: issue.path?.join('.') || '',
          message: issue.message
        }))
      };
    } else {
      const message = error.message || '';
      const matched = matchStatus(message);
      if (matched) {
        status = matched;
        responseBody = { error: message };
      } else {
        status = 500;
        responseBody = { id: referenceId, error: 'Internal Server Error' };
      }
    }

    if (options.persist) {
      const ctx = extractContext(c);
      const payload: ErrorLogPayload = {
        referenceId,
        name: error.name || 'Error',
        message: error.message || '',
        stack: error.stack || null,
        status,
        ...ctx
      };

      const promise = options
        .persist(payload, c)
        .catch(err => console.error('Failed to persist error log', err));

      const execCtx = (
        c as { executionCtx?: { waitUntil?: (p: Promise<unknown>) => void } }
      ).executionCtx;
      if (execCtx?.waitUntil) {
        execCtx.waitUntil(promise);
      }
    }

    return c.json(responseBody, status);
  };
};
