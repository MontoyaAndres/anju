import { Context } from 'hono';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@anju/db';

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

  const clientId = (c.env as any)[providerConfig.clientIdEnv];
  if (!clientId) {
    throw new Error(`Missing env: ${providerConfig.clientIdEnv}`);
  }

  const callbackUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/oauth/${provider}/callback`;

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

  const clientId = (c.env as any)[providerConfig.clientIdEnv];
  const clientSecret = (c.env as any)[providerConfig.clientSecretEnv];

  if (!clientId || !clientSecret) {
    throw new Error(
      `Missing env: ${providerConfig.clientIdEnv} or ${providerConfig.clientSecretEnv}`
    );
  }

  const callbackUrl = `${process.env.NEXT_PUBLIC_API_URL || ''}/oauth/${provider}/callback`;

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

    await tx.insert(db.schema.artifactCredential).values({
      provider,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
      scopes: tokens.scope || null,
      artifactId: currentArtifactByProject.id
    });

    await tx
      .update(db.schema.artifact)
      .set({
        artifactCredentialCount: sql`(${db.schema.artifact.artifactCredentialCount}::int + 1)::int`
      })
      .where(eq(db.schema.artifact.id, currentArtifactByProject.id));
  });

  const redirectUrl = `${process.env.NEXT_PUBLIC_WEB_URL || ''}/organization/${organizationId}/project/${projectId}/credentials?connected=${provider}`;

  return c.redirect(redirectUrl);
};

export const OAuthController = {
  authorize,
  callback
};
