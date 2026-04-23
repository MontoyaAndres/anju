import { readResourceContent } from '../../utils';

import { ToolDefinition } from '../types';

export const readResource: ToolDefinition = {
  title: 'Read Resource',
  description:
    'Read the contents of a resource by its URI. Use list-resources first to discover available URIs.',
  schema: {
    type: 'object',
    properties: {
      uri: {
        type: 'string',
        description: 'The URI of the resource to read'
      }
    },
    required: ['uri']
  },
  handler: async (args, context) => {
    const uri = String(args.uri);
    const resource = context.resources.find(r => r.uri === uri);

    if (!resource) {
      return {
        content: [{ type: 'text', text: `Resource not found: ${uri}` }]
      };
    }

    const result = await readResourceContent(
      resource,
      new URL(uri),
      context.bucket
    );

    const text = result.contents
      .map(c => ('text' in c && c.text ? c.text : ''))
      .filter(Boolean)
      .join('\n');

    return {
      content: [{ type: 'text', text: text || JSON.stringify(result) }]
    };
  }
};
