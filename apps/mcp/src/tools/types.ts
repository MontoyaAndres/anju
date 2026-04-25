import { JsonSchema } from '@anju/utils';
import { db, Database } from '@anju/db';
import { InferSelectModel } from 'drizzle-orm';
import { R2Bucket } from '@cloudflare/workers-types';

type ArtifactResource = InferSelectModel<typeof db.schema.artifactResource>;

export interface ToolCredential {
  provider: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scopes?: string | null;
  needsReauth?: boolean;
}

export interface ToolContext {
  config: Record<string, unknown>;
  credentials: ToolCredential[];
  resources: ArtifactResource[];
  bucket: R2Bucket;
  db: Database;
  artifactId: string;
  embedQuery: (text: string) => Promise<number[] | null>;
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
