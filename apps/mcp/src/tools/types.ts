import { JsonSchema } from '@anju/utils';

export interface ToolDefinition {
  title: string;
  description: string;
  schema: JsonSchema;
  configSchema?: JsonSchema;
  handler: (
    args: Record<string, unknown>,
    config: Record<string, unknown>
  ) => Promise<{ content: Array<{ type: 'text'; text: string }> }>;
}
