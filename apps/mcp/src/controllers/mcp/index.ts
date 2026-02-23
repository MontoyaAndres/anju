import { Context } from 'hono';
import {
  McpServer,
  ResourceTemplate
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPTransport } from '@hono/mcp';
import { JsonSchema, utils } from '@anju/utils';
import { db } from '@anju/db';
import { eq } from 'drizzle-orm';

import { readResourceContent } from '../utils';

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
      project: true
    }
  });

  if (!artifact) {
    throw new Error('MCP Server not found');
  }

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
        argsSchema: schema as any
      },
      async (args: any) => {
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
      annotations: (resource.annotations as any) || undefined,
      icons: (resource.icons as any) || undefined
    };

    if (resource.type === 'template') {
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
