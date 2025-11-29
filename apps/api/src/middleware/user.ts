import type { Context, Next } from 'hono';

import { createAuth } from '../utils';

// types
import type { AppEnv } from '../types';

export const verify = async (c: Context<AppEnv>, next: Next) => {
  const auth = createAuth(c);

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
