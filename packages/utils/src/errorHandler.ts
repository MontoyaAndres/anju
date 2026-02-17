import { ZodError } from 'better-auth';
import type { Context, ErrorHandler } from 'hono';
import { v7 as uuid } from 'uuid';

export const errorHandler: ErrorHandler = (error: Error, c: Context) => {
  console.error(error);

  if (error.name === 'ZodError') {
    return c.json(
      {
        errors: (error as ZodError).issues.map(issue => ({
          path: issue.path?.join('.') || '',
          message: issue.message,
        })),
      },
      400
    );
  }

  // TODO: Save error and return a reference id
  return c.json({ id: uuid(), error: 'Internal Server Error' }, 500);
};
