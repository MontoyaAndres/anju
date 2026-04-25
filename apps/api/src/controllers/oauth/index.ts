import { Context } from 'hono';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@anju/db';
import { utils } from '@anju/utils';

import { oauthState, providers } from '../../utils';

// types
import { AppEnv } from '../../types';

const authorize = async (c: Context<AppEnv>) => {
  const provider = c.req.param('provider');
  const query = c.req.query();
  const organizationId = query.organizationId;
  const projectId = query.projectId;
  const scopes = query.scopes;

  if (!organizationId || !projectId) {
    throw new Error('organizationId and projectId are required');
  }

  const providerConfig = providers[provider];
  if (!providerConfig) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  const clientId = utils.getEnv(c, providerConfig.clientIdEnv as string);

  if (!clientId) {
    throw new Error(`Missing env: ${providerConfig.clientIdEnv}`);
  }

  const callbackUrl = `${utils.getEnv(c, 'NEXT_PUBLIC_API_URL')}/oauth/${provider}/callback`;

  const state = oauthState.encode({
    organizationId,
    projectId,
    provider
  });

  const resolvedScopes = scopes
    ? scopes.split(',')
    : providerConfig.defaultScopes;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: resolvedScopes.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent'
  });

  const authorizationUrl = `${providerConfig.authUrl}?${params.toString()}`;

  return c.json({ url: authorizationUrl });
};

const callback = async (c: Context<AppEnv>) => {
  const provider = c.req.param('provider');
  const query = c.req.query();
  const code = query.code;
  const stateParam = query.state;

  if (!code || !stateParam) {
    throw new Error('Missing code or state parameter');
  }

  const providerConfig = providers[provider];
  if (!providerConfig) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  const state = oauthState.decode(stateParam);
  const { organizationId, projectId } = state;

  if (!organizationId || !projectId) {
    throw new Error('Invalid state: missing organizationId or projectId');
  }

  const clientId = utils.getEnv(c, providerConfig.clientIdEnv);
  const clientSecret = utils.getEnv(c, providerConfig.clientSecretEnv);

  if (!clientId || !clientSecret) {
    throw new Error(
      `Missing env: ${providerConfig.clientIdEnv} or ${providerConfig.clientSecretEnv}`
    );
  }

  const callbackUrl = `${utils.getEnv(c, 'NEXT_PUBLIC_API_URL')}/oauth/${provider}/callback`;

  const tokenResponse = await fetch(providerConfig.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: callbackUrl
    })
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const tokens: any = await tokenResponse.json();

  const encryptionKey = utils.getCredentialEncryptionKey(c);
  const encryptedAccessToken = utils.encryptString(
    tokens.access_token,
    encryptionKey
  );
  const encryptedRefreshToken = tokens.refresh_token
    ? utils.encryptString(tokens.refresh_token, encryptionKey)
    : null;

  const dbInstance = db.create(c);

  await dbInstance.transaction(async tx => {
    const [project] = await tx
      .select()
      .from(db.schema.project)
      .where(
        and(
          eq(db.schema.project.id, projectId),
          eq(db.schema.project.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!project) {
      throw new Error('Project not found');
    }

    const [currentArtifactByProject] = await tx
      .select()
      .from(db.schema.artifact)
      .where(eq(db.schema.artifact.projectId, projectId))
      .limit(1);

    if (!currentArtifactByProject) {
      throw new Error('Artifact not found for the project');
    }

    const [existingCredential] = await tx
      .select()
      .from(db.schema.artifactCredential)
      .where(
        and(
          eq(
            db.schema.artifactCredential.artifactId,
            currentArtifactByProject.id
          ),
          eq(db.schema.artifactCredential.provider, provider)
        )
      )
      .limit(1);

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    if (existingCredential) {
      const previousMetadata =
        existingCredential.metadata &&
        typeof existingCredential.metadata === 'object'
          ? (existingCredential.metadata as Record<string, unknown>)
          : null;
      let nextMetadata: Record<string, unknown> | null = null;
      if (previousMetadata) {
        const cleaned: Record<string, unknown> = { ...previousMetadata };
        delete cleaned.needsReauth;
        delete cleaned.reauthReason;
        delete cleaned.reauthAt;
        nextMetadata = Object.keys(cleaned).length > 0 ? cleaned : null;
      }

      await tx
        .update(db.schema.artifactCredential)
        .set({
          accessToken: encryptedAccessToken,
          refreshToken:
            encryptedRefreshToken || existingCredential.refreshToken,
          expiresAt,
          scopes: tokens.scope || existingCredential.scopes,
          metadata: nextMetadata
        })
        .where(eq(db.schema.artifactCredential.id, existingCredential.id));
    } else {
      await tx.insert(db.schema.artifactCredential).values({
        provider,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        scopes: tokens.scope || null,
        artifactId: currentArtifactByProject.id
      });

      await tx
        .update(db.schema.artifact)
        .set({
          artifactCredentialCount: sql`(${db.schema.artifact.artifactCredentialCount}::int + 1)::int`
        })
        .where(eq(db.schema.artifact.id, currentArtifactByProject.id));
    }
  });

  const redirectUrl = `${utils.getEnv(c, 'NEXT_PUBLIC_WEB_URL')}/organization/${organizationId}/project/${projectId}/tools?connected=${provider}`;

  return c.redirect(redirectUrl);
};

export const OAuthController = {
  authorize,
  callback
};
