import { Context } from 'hono';
import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPTransport } from '@hono/mcp';
import { z } from 'zod';

// types
import { AppEnv } from '../../types';

const mcpServer = new McpServer({
  name: 'my-mcp-server',
  version: '0.0.1',
});
const transport = new StreamableHTTPTransport();

mcpServer.registerTool(
  'add',
  {
    title: 'Addition',
    description: 'Add two numbers',
    inputSchema: {
      a: z.number(),
      b: z.number(),
    },
    outputSchema: {
      result: z.number(),
    },
  },
  async ({ a, b }) => {
    const output = { result: a + b };

    return {
      content: [{ type: 'text', text: JSON.stringify(output) }],
      structuredContent: output,
    };
  }
);

mcpServer.registerResource(
  'config',
  'config://app/settings',
  {
    description: 'Application configuration settings',
    mimeType: 'application/json',
  },
  async () => {
    const config = {
      appName: 'Anju',
      version: '0.0.1',
      environment: process.env.NODE_ENV || 'development',
      features: {
        darkMode: true,
        notifications: true,
      },
    };

    return {
      contents: [
        {
          uri: 'config://app/settings',
          mimeType: 'application/json',
          text: JSON.stringify(config, null, 2),
        },
      ],
    };
  }
);

mcpServer.registerResource(
  'user',
  new ResourceTemplate('users://{userId}/profile', { list: undefined }),
  {
    description: 'Get user profile by ID',
    mimeType: 'application/json',
  },
  async (uri, { userId }) => {
    const user = {
      id: userId,
      name: `User ${userId}`,
      email: `user${userId}@example.com`,
      createdAt: new Date().toISOString(),
    };

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(user, null, 2),
        },
      ],
    };
  }
);

mcpServer.registerPrompt(
  'greeting',
  {
    title: 'Greeting Generator',
    description: 'Generate a personalized greeting',
    argsSchema: {
      name: z.string().describe('Name of the person to greet'),
      style: z
        .enum(['formal', 'casual'])
        .optional()
        .describe('Style of greeting'),
    },
  },
  async ({ name, style }) => {
    const greeting =
      style === 'formal'
        ? `Good day, ${name}. It is a pleasure to meet you.`
        : `Hey ${name}! What's up?`;

    return {
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: greeting },
        },
      ],
    };
  }
);

const business = async (c: Context<AppEnv>) => {
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
