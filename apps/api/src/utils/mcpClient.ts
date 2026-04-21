import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export const createMcpClient = async (hash: string) => {
  const mcpBaseUrl = process.env.NEXT_PUBLIC_MCP_URL;
  if (!mcpBaseUrl) {
    throw new Error('Missing env: NEXT_PUBLIC_MCP_URL');
  }

  const url = new URL(mcpBaseUrl);
  url.searchParams.set('hash', hash);

  const transport = new StreamableHTTPClientTransport(url);
  const client = new Client({ name: 'anju-channel', version: '0.0.1' });
  await client.connect(transport);

  return {
    client,
    close: async () => {
      await client.close();
    }
  };
};

export type McpClientHandle = Awaited<ReturnType<typeof createMcpClient>>;
