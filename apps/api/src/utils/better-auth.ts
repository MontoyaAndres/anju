import { Context } from 'hono';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth';
import { v7 as uuid } from 'uuid';

import { createDb, schema } from '../db';

export const createAuth = (c: Context) => {
  const db = createDb(c);

  return betterAuth({
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
    trustedOrigins: [
      process.env.NEXT_PUBLIC_WEB_URL!,
      process.env.NEXT_PUBLIC_API_URL!,
    ],
    account: {
      storeStateStrategy: 'cookie',
    },
    advanced: {
      database: {
        generateId: () => uuid(),
      },
      crossSubDomainCookies: {
        enabled: false,
      },
      useSecureCookies: process.env.NODE_ENV === 'production',
      cookieCache: {
        enabled: true,
        maxAge: 300,
      },
    },
  });
};

export type Auth = ReturnType<typeof createAuth>;
