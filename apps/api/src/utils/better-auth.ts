import { Context } from 'hono';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth';
import { v7 as uuid } from 'uuid';
import { utils } from '@anju/utils';
import { db } from '@anju/db';

export const createAuth = (c: Context) => {
  const dbInstance = db.create(c);
  const isProduction = utils.getEnv(c, 'NODE_ENV') === 'production';
  const domain = utils.getEnv(c, 'NEXT_PUBLIC_DOMAIN');

  return betterAuth({
    appName: 'anju',
    database: drizzleAdapter(dbInstance, {
      provider: 'pg',
      schema: db.schema
    }),
    baseURL: utils.getEnv(c, 'NEXT_PUBLIC_API_URL'),
    basePath: '/auth',
    secret: utils.getEnv(c, 'JWT_SECRET')!,
    socialProviders: {
      google: {
        clientId: utils.getEnv(c, 'GOOGLE_CLIENT_ID')!,
        clientSecret: utils.getEnv(c, 'GOOGLE_CLIENT_SECRET')!
      },
      github: {
        clientId: utils.getEnv(c, 'GITHUB_CLIENT_ID')!,
        clientSecret: utils.getEnv(c, 'GITHUB_CLIENT_SECRET')!
      }
    },
    trustedOrigins: [
      utils.getEnv(c, 'NEXT_PUBLIC_WEB_URL')!,
      utils.getEnv(c, 'NEXT_PUBLIC_API_URL')!
    ],
    account: {
      storeStateStrategy: 'database',
      skipStateCookieCheck: true
    },
    advanced: {
      crossSubDomainCookies: domain
        ? { enabled: true, domain: `.${domain}` }
        : { enabled: false },
      database: {
        generateId: () => uuid()
      },
      useSecureCookies: isProduction
    }
  });
};

export type Auth = ReturnType<typeof createAuth>;
