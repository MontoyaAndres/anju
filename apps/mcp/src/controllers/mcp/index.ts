import { Context } from 'hono';
import {
  McpServer,
  ResourceTemplate
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPTransport } from '@hono/mcp';
import { JsonSchema, utils } from '@anju/utils';
import { db } from '@anju/db';
import { eq } from 'drizzle-orm';

import { toolRegistry } from '../../tools';
import {
  readResourceContent,
  refreshCredentialIfNeeded,
  generateEmbedding,
  resolveArtifactSlug,
  parseJsonRpcMessages,
  collectBodyOnlyRequests,
  parseClient,
  resolveExternalSessionId,
  upsertSession,
  flushRequests,
  type PendingRequest
} from '../../utils';

// types
import { AppEnv } from '../../types';

const business = async (c: Context<AppEnv>) => {
  const slug = c.req.param('slug') ?? resolveArtifactSlug(c.req.raw);

  if (!slug) {
    return c.json({ error: 'Missing MCP slug' }, 400);
  }
  if (!utils.isValidSlugFormat(slug) || utils.isReservedSlug(slug)) {
    return c.json({ error: 'Invalid MCP slug' }, 400);
  }

  const authContext = c.get('authContext');
  const jwtUserId =
    authContext?.kind === 'jwt' ? authContext.userId : undefined;

  if (authContext?.kind === 'jwt' && !jwtUserId) {
    return c.json({ error: 'Token missing subject' }, 401);
  }

  const dbInstance = db.create(c);

  const artifact = await dbInstance.query.artifact.findFirst({
    where: eq(db.schema.artifact.slug, slug),
    with: {
      artifactPrompts: true,
      artifactResources: true,
      artifactTools: {
        with: {
          toolDefinition: {
            with: {
              group: true
            }
          }
        }
      },
      artifactCredentials: true,
      project: {
        with: {
          projectUsers: jwtUserId
            ? {
                where: eq(db.schema.projectUser.userId, jwtUserId),
                columns: { userId: true },
                limit: 1
              }
            : { limit: 0, columns: { userId: true } }
        }
      }
    }
  });

  if (!artifact) {
    throw new Error('MCP Server not found');
  }

  if (jwtUserId && artifact.project.projectUsers.length === 0) {
    return c.json({ error: 'You do not have access to this artifact' }, 403);
  }

  // Folders aren't queryable resources: website parents collide with their
  // seed page indexed as a child, and Google Drive folders are pure
  // references whose content lives in their children. Hide both from MCP.
  const exposedResources = artifact.artifactResources.filter(r => {
    if (
      r.sourceType === utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE &&
      !r.parentResourceId
    ) {
      return false;
    }
    if (
      r.sourceType === utils.constants.RESOURCE_SOURCE_TYPE_GOOGLE_DRIVE_FOLDER
    ) {
      return false;
    }
    if (
      r.sourceType === utils.constants.RESOURCE_SOURCE_TYPE_ONE_DRIVE_FOLDER
    ) {
      return false;
    }
    return true;
  });

  const refreshedCredentials = await Promise.all(
    artifact.artifactCredentials.map(cred => refreshCredentialIfNeeded(c, cred))
  );

  const mcpServer = new McpServer({
    name: artifact.project.name || 'MCP Server',
    description: artifact.project.description || 'MCP Server Description',
    version: '0.0.1'
  });
  const transport = new StreamableHTTPTransport({
    enableJsonResponse: true
  });
  const bucket = c.env.STORAGE_BUCKET;
  const pendingRequests: PendingRequest[] = [];

  for (const prompt of artifact.artifactPrompts) {
    const schema = utils.jsonSchemaToZodShape(prompt.schema as JsonSchema);

    mcpServer.registerPrompt(
      prompt.id,
      {
        title: prompt.title,
        description: prompt.description || undefined,
        argsSchema: schema
      },
      async args => {
        const startedAt = Date.now();
        const promptMessages = (prompt.messages || []) as Array<{
          role: 'user' | 'assistant';
          content: string;
        }>;

        const result = {
          messages: promptMessages.map(msg => {
            let text = msg.content;

            for (const [key, value] of Object.entries(args)) {
              text = text.replaceAll(`{{${key}}}`, value ? String(value) : '');
            }

            text = text.replaceAll(/\{\{[^}]+\}\}/g, '');

            return {
              role: msg.role,
              content: { type: 'text' as const, text }
            };
          })
        };

        pendingRequests.push({
          method: utils.constants.MCP_REQUEST_METHOD_PROMPTS_GET,
          promptId: prompt.id,
          artifactPromptId: prompt.id,
          input: args,
          output: result,
          latencyMs: Date.now() - startedAt
        });

        return result;
      }
    );
  }

  for (const resource of exposedResources) {
    const resourceMetadata = {
      title: resource.title,
      description: resource.description || undefined,
      mimeType: resource.mimeType || undefined,
      annotations: resource.annotations || undefined,
      icons:
        (resource.icons as
          | {
              src: string;
              mimeType?: string | undefined;
              sizes?: string[] | undefined;
              theme?: 'light' | 'dark' | undefined;
            }[]
          | undefined) || undefined
    };

    if (resource.type === utils.constants.RESOURCE_TYPE_TEMPLATE) {
      const template = new ResourceTemplate(resource.uri, {
        list: undefined
      });

      mcpServer.registerResource(
        resource.id,
        template,
        resourceMetadata,
        async (uri: URL, variables) => {
          const startedAt = Date.now();
          try {
            const result = await readResourceContent(resource, uri, bucket);

            for (const content of result.contents) {
              if ('text' in content && content.text) {
                for (const [key, value] of Object.entries(variables)) {
                  const replacement = Array.isArray(value)
                    ? value.join(', ')
                    : value;
                  content.text = content.text.replaceAll(
                    `{{${key}}}`,
                    replacement || ''
                  );
                }

                content.text = content.text.replaceAll(/\{\{[^}]+\}\}/g, '');
              }
            }

            pendingRequests.push({
              method: utils.constants.MCP_REQUEST_METHOD_RESOURCES_READ,
              resourceUri: uri.toString(),
              artifactResourceId: resource.id,
              input: { uri: uri.toString(), variables },
              output: result,
              latencyMs: Date.now() - startedAt
            });
            return result;
          } catch (error) {
            pendingRequests.push({
              method: utils.constants.MCP_REQUEST_METHOD_RESOURCES_READ,
              resourceUri: uri.toString(),
              artifactResourceId: resource.id,
              input: { uri: uri.toString(), variables },
              output: null,
              latencyMs: Date.now() - startedAt,
              errorMessage:
                error instanceof Error ? error.message : String(error)
            });
            throw error;
          }
        }
      );

      continue;
    }

    mcpServer.registerResource(
      resource.id,
      resource.uri,
      resourceMetadata,
      async (uri: URL) => {
        const startedAt = Date.now();
        try {
          const result = await readResourceContent(resource, uri, bucket);
          pendingRequests.push({
            method: utils.constants.MCP_REQUEST_METHOD_RESOURCES_READ,
            resourceUri: uri.toString(),
            artifactResourceId: resource.id,
            input: { uri: uri.toString() },
            output: result,
            latencyMs: Date.now() - startedAt
          });
          return result;
        } catch (error) {
          pendingRequests.push({
            method: utils.constants.MCP_REQUEST_METHOD_RESOURCES_READ,
            resourceUri: uri.toString(),
            artifactResourceId: resource.id,
            input: { uri: uri.toString() },
            output: null,
            latencyMs: Date.now() - startedAt,
            errorMessage: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }
      }
    );
  }

  for (const artifactTool of artifact.artifactTools) {
    const toolDef = artifactTool.toolDefinition;
    if (!toolDef) continue;

    const handler = toolRegistry.get(toolDef.key);
    if (!handler) continue;

    const schema = utils.jsonSchemaToZodShape(handler.schema);
    const toolConfig = (artifactTool.config as Record<string, unknown>) || {};
    const provider = toolDef.group?.provider;
    const toolCredentials = provider
      ? refreshedCredentials
          .filter(cred => cred.provider === provider)
          .map(cred => ({
            provider: cred.provider,
            accessToken: cred.accessToken,
            refreshToken: cred.refreshToken,
            expiresAt: cred.expiresAt,
            scopes: cred.scopes,
            needsReauth: cred.needsReauth === true
          }))
      : [];
    const reauthRequired =
      provider &&
      toolCredentials.length > 0 &&
      toolCredentials.every(cred => cred.needsReauth);

    mcpServer.registerTool(
      toolDef.key,
      {
        title: toolDef.title || handler.title,
        description: toolDef.description || handler.description,
        inputSchema: schema
      },
      async args => {
        const startedAt = Date.now();
        if (reauthRequired) {
          const result = {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${provider} credential needs to be re-authorized. Open the Tools page and re-link ${provider}.`
              }
            ]
          };
          pendingRequests.push({
            method: utils.constants.MCP_REQUEST_METHOD_TOOLS_CALL,
            toolName: toolDef.key,
            artifactToolId: artifactTool.id,
            input: args,
            output: result,
            latencyMs: Date.now() - startedAt,
            errorMessage: `${provider} credential needs re-authorization`
          });
          return result;
        }
        try {
          const result = await handler.handler(args, {
            config: toolConfig,
            credentials: toolCredentials,
            resources: exposedResources,
            bucket,
            env: c.env,
            db: dbInstance,
            artifactId: artifact.id,
            embedQuery: (text: string) => generateEmbedding(c, text)
          });
          pendingRequests.push({
            method: utils.constants.MCP_REQUEST_METHOD_TOOLS_CALL,
            toolName: toolDef.key,
            artifactToolId: artifactTool.id,
            input: args,
            output: result,
            latencyMs: Date.now() - startedAt
          });
          return result;
        } catch (error) {
          pendingRequests.push({
            method: utils.constants.MCP_REQUEST_METHOD_TOOLS_CALL,
            toolName: toolDef.key,
            artifactToolId: artifactTool.id,
            input: args,
            output: null,
            latencyMs: Date.now() - startedAt,
            errorMessage: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }
      }
    );
  }

  await mcpServer.connect(transport);

  // Read the body once so we can both inspect JSON-RPC method names (for
  // list/discovery calls the SDK auto-handles) and forward it to the transport.
  // GET (SSE stream) and DELETE (session teardown) have no body.
  let parsedBody: unknown | undefined;
  if (c.req.method === 'POST') {
    try {
      parsedBody = await c.req.json();
    } catch {
      parsedBody = undefined;
    }
  }

  const messages = parseJsonRpcMessages(parsedBody);
  const bodyOnly = collectBodyOnlyRequests(messages);

  const response = await transport.handleRequest(c, parsedBody);

  // Drop notifications (no `id`) and ping if nothing actually happened.
  const allRequests: PendingRequest[] = [...bodyOnly, ...pendingRequests];
  if (allRequests.length === 0) return response;

  const userAgent = c.req.header('user-agent') ?? null;
  const ipAddress =
    c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? null;
  const client = parseClient(userAgent);

  // Channel-relayed self-fetches from the API worker tag themselves so we can
  // distinguish them from direct MCP clients (Claude Desktop, mcp-inspector).
  // Only honor these on trusted auth paths — internal-secret (the API holds
  // it) or bot-on-behalf-of JWTs (minted in-process by the API, never issued
  // to external OAuth clients). Otherwise a Claude Desktop user could spoof
  // them and pollute the session metadata.
  const channelTrust =
    authContext?.kind === 'internal' || authContext?.isBotToken === true;
  const channelIdHeader = channelTrust
    ? (c.req.header(utils.constants.MCP_CHANNEL_ID_HEADER) ?? null)
    : null;
  const channelPlatformHeader = channelTrust
    ? (c.req.header(utils.constants.MCP_CHANNEL_PLATFORM_HEADER) ?? null)
    : null;
  const sessionMetadata: Record<string, unknown> | null = channelIdHeader
    ? {
        via: 'channel',
        channelId: channelIdHeader,
        platform: channelPlatformHeader
      }
    : null;

  const externalSessionId = resolveExternalSessionId(
    c,
    artifact.id,
    jwtUserId,
    userAgent
  );

  c.executionCtx.waitUntil(
    (async () => {
      try {
        const session = await upsertSession(dbInstance, {
          artifactId: artifact.id,
          externalSessionId,
          authKind: authContext?.kind ?? utils.constants.MCP_AUTH_KIND_JWT,
          userId: jwtUserId,
          userAgent,
          ipAddress,
          clientName: client.name,
          clientVersion: client.version,
          metadata: sessionMetadata
        });
        await flushRequests(dbInstance, session.id, allRequests);
      } catch (error) {
        console.error('Failed to record MCP usage', error);
      }
    })()
  );

  return response;
};

const health = async (c: Context<AppEnv>) => {
  return c.json({ status: 'ok' });
};

export const MCPController = {
  business,
  health
};
