import { ToolDefinition } from '../types';

export const greeting: ToolDefinition = {
  title: 'Greeting',
  description: 'Generates a personalized greeting message for the given name and language',
  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The name of the person to greet'
      },
      language: {
        type: 'string',
        description: 'The language for the greeting (e.g. en, es)',
        enum: ['en', 'es']
      }
    },
    required: ['name']
  },
  handler: async (args, _config) => {
    const name = String(args.name);
    const language = String(args.language || 'en');

    const greetings: Record<string, string> = {
      en: `Hello, ${name}! Welcome.`,
      es: `¡Hola, ${name}! Bienvenido.`
    };

    const text = greetings[language] || greetings['en'];

    return {
      content: [{ type: 'text', text }]
    };
  }
};
