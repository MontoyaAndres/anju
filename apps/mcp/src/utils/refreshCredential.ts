import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '@anju/db';
import { utils } from '@anju/utils';

import { AppEnv } from '../types';

interface RefreshableCredential {
  id: string;
  provider: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scopes: string | null;
  metadata?: unknown;
  needsReauth?: boolean;
}

const REAUTH_ERROR_CODES = new Set(['invalid_grant', 'invalid_token']);

const markCredentialNeedsReauth = async (
  ctx: Context<AppEnv>,
  credential: RefreshableCredential,
  reason: string
): Promise<void> => {
  const dbInstance = db.create(ctx);
  const existingMetadata =
    credential.metadata && typeof credential.metadata === 'object'
      ? (credential.metadata as Record<string, unknown>)
      : {};
  const nextMetadata = {
    ...existingMetadata,
    needsReauth: true,
    reauthReason: reason,
    reauthAt: new Date().toISOString()
  };
  await dbInstance
    .update(db.schema.artifactCredential)
    .set({ metadata: nextMetadata })
    .where(eq(db.schema.artifactCredential.id, credential.id));
};

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
  const encryptionKey = utils.getCredentialEncryptionKey(ctx);
  const accessTokenPlain = utils.decryptString(
    credential.accessToken,
    encryptionKey
  );
  const refreshTokenPlain = credential.refreshToken
    ? utils.decryptString(credential.refreshToken, encryptionKey)
    : null;
  const existingMetadata =
    credential.metadata && typeof credential.metadata === 'object'
      ? (credential.metadata as Record<string, unknown>)
      : null;
  const alreadyNeedsReauth = existingMetadata?.needsReauth === true;
  const decrypted: RefreshableCredential = {
    ...credential,
    accessToken: accessTokenPlain,
    refreshToken: refreshTokenPlain,
    needsReauth: alreadyNeedsReauth
  };

  if (alreadyNeedsReauth) return decrypted;
  if (!refreshTokenPlain) return decrypted;
  if (!credential.expiresAt) return decrypted;
  if (credential.expiresAt.getTime() - EXPIRY_BUFFER_MS > Date.now()) {
    return decrypted;
  }

  const tokenUrl = TOKEN_URLS[credential.provider];
  const envConfig = ENV_NAMES[credential.provider];
  if (!tokenUrl || !envConfig) return decrypted;

  const clientId = utils.getEnv(ctx, envConfig.clientIdEnv);
  const clientSecret = utils.getEnv(ctx, envConfig.clientSecretEnv);
  if (!clientId || !clientSecret) return decrypted;

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshTokenPlain
      })
    });
    if (!response.ok) {
      const errorBody = await response.text();
      let errorCode: string | undefined;
      try {
        errorCode = (JSON.parse(errorBody) as { error?: string })?.error;
      } catch {
        errorCode = undefined;
      }
      if (errorCode && REAUTH_ERROR_CODES.has(errorCode)) {
        await markCredentialNeedsReauth(ctx, credential, errorCode);
        return { ...decrypted, needsReauth: true };
      }
      return decrypted;
    }

    const tokens = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    if (!tokens.access_token) return decrypted;

    const nextAccessToken = tokens.access_token;
    const nextRefreshToken = tokens.refresh_token || refreshTokenPlain;
    const nextExpiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;
    const nextScopes = tokens.scope || credential.scopes;

    const dbInstance = db.create(ctx);

    let cleanedMetadata: Record<string, unknown> | null = null;
    if (existingMetadata) {
      const next: Record<string, unknown> = { ...existingMetadata };
      delete next.needsReauth;
      delete next.reauthReason;
      delete next.reauthAt;
      cleanedMetadata = Object.keys(next).length > 0 ? next : null;
    }

    await dbInstance
      .update(db.schema.artifactCredential)
      .set({
        accessToken: utils.encryptString(nextAccessToken, encryptionKey),
        refreshToken: utils.encryptString(nextRefreshToken, encryptionKey),
        expiresAt: nextExpiresAt,
        scopes: nextScopes,
        metadata: cleanedMetadata
      })
      .where(eq(db.schema.artifactCredential.id, credential.id));

    return {
      ...credential,
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
      expiresAt: nextExpiresAt,
      scopes: nextScopes
    };
  } catch (err) {
    return decrypted;
  }
};
