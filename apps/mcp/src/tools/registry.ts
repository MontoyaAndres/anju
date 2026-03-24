import { greeting } from './greeting';

// types
import { ToolDefinition } from './types';

export const toolRegistry = new Map<string, ToolDefinition>([
  ['greeting', greeting]
]);
