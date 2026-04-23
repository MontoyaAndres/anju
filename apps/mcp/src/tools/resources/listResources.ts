import { ToolDefinition } from '../types';

export const listResources: ToolDefinition = {
  title: 'List Resources',
  description:
    'List all resources available to this MCP server. Returns an array of {uri, title, description, mimeType} objects. Call this before read-resource to discover what is available.',
  schema: {
    type: 'object',
    properties: {}
  },
  handler: async (_args, context) => {
    const list = context.resources.map(r => ({
      uri: r.uri,
      title: r.title,
      description: r.description || undefined,
      mimeType: r.mimeType
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify(list) }]
    };
  }
};
