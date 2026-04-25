import { Context } from 'hono';

export const getEnv = (c: Context, key: string): string | undefined => {
  const value = (c.env as unknown as Record<string, unknown>)?.[key];
  if (typeof value === 'string') return value;
  return process.env[key];
};
