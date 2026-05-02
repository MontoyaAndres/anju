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
  generateEmbedding
} from '../../utils';

// types
import { AppEnv } from '../../types';

const business = async (c: Context<AppEnv>) => {
  const query = c.req.query();

  const currentValues = await utils.Schema.BUSINESS_QUERY.parseAsync({
    hash: query.hash
  });

  const dbInstance = db.create(c);

  const artifact = await dbInstance.query.artifact.findFirst({
    where: eq(db.schema.artifact.hash, currentValues.hash),
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
      project: true
    }
  });

  if (!artifact) {
    throw new Error('MCP Server not found');
  }

  const refreshedCredentials = await Promise.all(
    artifact.artifactCredentials.map(cred => refreshCredentialIfNeeded(c, cred))
  );

  const mcpServer = new McpServer({
    name: artifact.project.name || 'MCP Server',
    description: artifact.project.description || 'MCP Server Description',
    version: '0.0.1'
  });
  const transport = new StreamableHTTPTransport();
  const bucket = c.env.STORAGE_BUCKET;

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
        const promptMessages = (prompt.messages || []) as Array<{
          role: 'user' | 'assistant';
          content: string;
        }>;

        return {
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
      }
    );
  }

  for (const resource of artifact.artifactResources) {
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

          return result;
        }
      );

      continue;
    }

    mcpServer.registerResource(
      resource.id,
      resource.uri,
      resourceMetadata,
      async (uri: URL) => readResourceContent(resource, uri, bucket)
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
        if (reauthRequired) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${provider} credential needs to be re-authorized. Open the Tools page and re-link ${provider}.`
              }
            ]
          };
        }
        return handler.handler(args, {
          config: toolConfig,
          credentials: toolCredentials,
          resources: artifact.artifactResources,
          bucket,
          env: c.env,
          db: dbInstance,
          artifactId: artifact.id,
          embedQuery: (text: string) => generateEmbedding(c, text)
        });
      }
    );
  }

  await mcpServer.connect(transport);

  return transport.handleRequest(c);
};

const health = async (c: Context<AppEnv>) => {
  return c.json({ status: 'ok' });
};

export const MCPController = {
  business,
  health
};
