import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth';
import { v7 as uuid } from 'uuid';

import { db, schema } from '../db';

export const auth = betterAuth({
  appName: 'anju',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  basePath: '/auth',
  secret: process.env.JWT_SECRET!,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  trustedOrigins: [process.env.NEXT_PUBLIC_WEB_URL!],
  advanced: {
    database: {
      generateId: () => uuid(),
    },
  },
});
