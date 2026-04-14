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

export const errorHandler: ErrorHandler = (error: Error, c: Context) => {
  console.error(error);

  if (error.name === 'ZodError') {
    return c.json(
      {
        errors: (error as ZodError).issues.map(issue => ({
          path: issue.path?.join('.') || '',
          message: issue.message
        }))
      },
      400
    );
  }

  const message = error.message || '';
  const status = matchStatus(message);

  if (status) {
    return c.json({ error: message }, status);
  }

  // TODO: Save error and return a reference id
  return c.json({ id: uuid(), error: 'Internal Server Error' }, 500);
};
