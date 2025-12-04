import type { Context, Next } from 'hono';

import { auth } from '../utils';

// types
import type { AppEnv } from '../types';

export const verify = async (c: Context<AppEnv>, next: Next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('user', session.user);
  c.set('session', session.session);

  return next();
};

export const UserMiddleware = {
  verify,
};
