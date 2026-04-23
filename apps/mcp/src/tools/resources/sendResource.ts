import { ToolDefinition } from '../types';

export const sendResource: ToolDefinition = {
  title: 'Send Resource',
  description:
    'Send a resource to the user so they can see or download it (image preview, audio player, document, etc.). Use when the user asks to see, receive, or download a specific resource. Chain with list-resources to find URIs. Do not use for inline quoting — use read-resource for that.',
  schema: {
    type: 'object',
    properties: {
      uri: {
        type: 'string',
        description: 'The URI of the resource to send'
      },
      caption: {
        type: 'string',
        description: 'Optional short caption shown with the attachment'
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

    return {
      content: [
        {
          type: 'text',
          text: `Queued for delivery: ${resource.title} (${resource.mimeType})`
        }
      ]
    };
  }
};
