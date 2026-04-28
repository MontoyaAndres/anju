import { ToolDefinition } from '../types';

export const greeting: ToolDefinition = {
  title: 'Greeting',
  description:
    'Return a templated hello message in English or Spanish for the given name. This is a demo / smoke-test tool with no real-world side effects — do NOT use it to greet the user in normal conversation; just respond directly. Only call when the user explicitly asks for the templated greeting (e.g. "test the greeting tool").',
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
  handler: async (args, _context) => {
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
