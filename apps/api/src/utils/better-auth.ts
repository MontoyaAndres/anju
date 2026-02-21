import { Context } from 'hono';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth';
import { v7 as uuid } from 'uuid';
import { db } from '@anju/db';

export const createAuth = (c: Context) => {
  const dbInstance = db.create(c);

  return betterAuth({
    appName: 'anju',
    database: drizzleAdapter(dbInstance, {
      provider: 'pg',
      schema: db.schema
    }),
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    basePath: '/auth',
    secret: process.env.JWT_SECRET!,
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!
      }
    },
    trustedOrigins: [
      process.env.NEXT_PUBLIC_WEB_URL!,
      process.env.NEXT_PUBLIC_API_URL!
    ],
    account: {
      storeStateStrategy: 'database',
      skipStateCookieCheck: true
    },
    advanced: {
      crossSubDomainCookies:
        process.env.NODE_ENV === 'production'
          ? { enabled: true, domain: '.anju.ai' }
          : { enabled: false },
      database: {
        generateId: () => uuid()
      },
      useSecureCookies: process.env.NODE_ENV === 'production'
    }
  });
};

export type Auth = ReturnType<typeof createAuth>;
