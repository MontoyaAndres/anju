import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '@anju/db';

import { AppEnv } from '../types';

interface RefreshableCredential {
  id: string;
  provider: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scopes: string | null;
}

const TOKEN_URLS: Record<string, string> = {
  'google-gmail': 'https://oauth2.googleapis.com/token',
  'microsoft-outlook':
    'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  slack: 'https://slack.com/api/oauth.v2.access'
};

const ENV_NAMES: Record<
  string,
  { clientIdEnv: string; clientSecretEnv: string }
> = {
  'google-gmail': {
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET'
  },
  'microsoft-outlook': {
    clientIdEnv: 'MICROSOFT_CLIENT_ID',
    clientSecretEnv: 'MICROSOFT_CLIENT_SECRET'
  },
  slack: {
    clientIdEnv: 'SLACK_CLIENT_ID',
    clientSecretEnv: 'SLACK_CLIENT_SECRET'
  }
};

// Refresh if less than 60s remain, so a long tool call doesn't expire mid-flight.
const EXPIRY_BUFFER_MS = 60 * 1000;

export const refreshCredentialIfNeeded = async (
  ctx: Context<AppEnv>,
  credential: RefreshableCredential
): Promise<RefreshableCredential> => {
  if (!credential.refreshToken) return credential;
  if (!credential.expiresAt) return credential;
  if (credential.expiresAt.getTime() - EXPIRY_BUFFER_MS > Date.now()) {
    return credential;
  }

  const tokenUrl = TOKEN_URLS[credential.provider];
  const envConfig = ENV_NAMES[credential.provider];
  if (!tokenUrl || !envConfig) return credential;

  const envBag = ctx.env as unknown as Record<string, string | undefined>;
  const clientId =
    envBag?.[envConfig.clientIdEnv] || process.env[envConfig.clientIdEnv];
  const clientSecret =
    envBag?.[envConfig.clientSecretEnv] ||
    process.env[envConfig.clientSecretEnv];
  if (!clientId || !clientSecret) return credential;

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: credential.refreshToken
      })
    });
    if (!response.ok) return credential;

    const tokens = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    if (!tokens.access_token) return credential;

    const nextAccessToken = tokens.access_token;
    const nextRefreshToken = tokens.refresh_token || credential.refreshToken;
    const nextExpiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;
    const nextScopes = tokens.scope || credential.scopes;

    const dbInstance = db.create(ctx);

    await dbInstance
      .update(db.schema.artifactCredential)
      .set({
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
        expiresAt: nextExpiresAt,
        scopes: nextScopes
      })
      .where(eq(db.schema.artifactCredential.id, credential.id));

    return {
      ...credential,
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
      expiresAt: nextExpiresAt,
      scopes: nextScopes
    };
  } catch {
    return credential;
  }
};
