import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth';

import { db, schema } from '../db';

export const auth = betterAuth({
  appName: 'anju',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  secret: process.env.JWT_SECRET!,
});
