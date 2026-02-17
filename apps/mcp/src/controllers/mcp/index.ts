import { Context } from 'hono';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPTransport } from '@hono/mcp';
import { utils } from '@anju/utils';
import { db } from '@anju/db';
import { eq } from 'drizzle-orm';
import * as z from 'zod';

// types
import { AppEnv } from '../../types';

type JsonSchemaProperty = {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
};

type JsonSchema = {
  type: 'object';
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
};

function jsonSchemaToZodObject(schema: JsonSchema): z.ZodObject<z.ZodRawShape> {
  const properties = schema.properties ?? {};
  const required = schema.required ?? [];

  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, prop] of Object.entries(properties)) {
    let field: z.ZodTypeAny;

    switch (prop.type) {
      case 'string': {
        if (prop.enum) {
          field = z.enum(prop.enum as [string, ...string[]]);
        } else {
          let str = z.string();
          if (prop.minLength !== undefined) str = str.min(prop.minLength);
          if (prop.maxLength !== undefined) str = str.max(prop.maxLength);
          if (prop.pattern !== undefined)
            str = str.regex(new RegExp(prop.pattern));
          field = str;
        }
        break;
      }
      case 'number': {
        let num = z.number();
        if (prop.minimum !== undefined) num = num.min(prop.minimum);
        if (prop.maximum !== undefined) num = num.max(prop.maximum);
        field = num;
        break;
      }
      case 'boolean':
        field = z.boolean();
        break;
      case 'array':
        field = z.array(z.any());
        break;
      case 'object':
        field = z.record(z.string(), z.any());
        break;
      default:
        field = z.any();
    }

    if (prop.description) {
      field = field.describe(prop.description);
    }

    if (!required.includes(key)) {
      field = field.optional();
    }

    shape[key] = field;
  }

  return z.object(shape);
}

const business = async (c: Context<AppEnv>) => {
  const query = c.req.query();

  const currentValues = await utils.Schema.BUSINESS_QUERY.parseAsync({
    hash: query.hash,
  });

  const dbInstance = db.create(c);

  const artifact = await dbInstance.query.artifact.findFirst({
    where: eq(db.schema.artifact.hash, currentValues.hash),
    with: {
      artifactPrompts: true,
      artifactResources: true,
      project: true,
    },
  });

  if (!artifact) {
    throw new Error('MCP Server not found');
  }

  const mcpServer = new McpServer({
    name: artifact.project.name || 'MCP Server',
    description: artifact.project.description || 'MCP Server Description',
    version: '0.0.1',
  });

  const transport = new StreamableHTTPTransport();

  for (const prompt of artifact.artifactPrompts) {
    const schema = jsonSchemaToZodObject(prompt.schema as JsonSchema);

    mcpServer.registerPrompt(
      prompt.id,
      {
        title: prompt.title,
        description: prompt.description || undefined,
        argsSchema: schema as any,
      },
      async (args: any, extra: any) => {
        const { name, style } = args;
        const greeting =
          style === 'formal'
            ? `Good day, ${name}. It is a pleasure to meet you.`
            : `Hey ${name}! What's up?`;

        return {
          messages: [
            {
              role: 'user' as 'user',
              content: { type: 'text', text: greeting },
            },
          ],
        };
      }
    );
  }

  if (!mcpServer.isConnected()) {
    await mcpServer.connect(transport);
  }

  return transport.handleRequest(c);
};

const health = async (c: Context<AppEnv>) => {
  return c.json({ status: 'ok' });
};

export const MCPController = {
  business,
  health,
};
