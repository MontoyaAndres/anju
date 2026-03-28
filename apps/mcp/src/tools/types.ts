import { JsonSchema } from '@anju/utils';

export interface ToolCredential {
  provider: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scopes?: string | null;
}

export interface ToolContext {
  config: Record<string, unknown>;
  credentials: ToolCredential[];
}

export interface ToolDefinition {
  title: string;
  description: string;
  schema: JsonSchema;
  configSchema?: JsonSchema;
  handler: (
    args: Record<string, unknown>,
    context: ToolContext
  ) => Promise<{ content: Array<{ type: 'text'; text: string }> }>;
}
