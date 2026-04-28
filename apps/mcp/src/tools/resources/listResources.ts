import { ToolDefinition } from '../types';

export const listResources: ToolDefinition = {
  title: 'List Resources',
  description:
    'Enumerate every resource attached to this MCP server. Returns a JSON array of {uri, title, description, mimeType} objects so you can pick a URI for read-resource (to load contents) or send-resource (to deliver to the user). Use when you need a complete inventory; prefer search-resources when you are looking for content matching a query rather than browsing the full list.',
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
