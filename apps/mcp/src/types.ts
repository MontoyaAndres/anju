import type { Hyperdrive, R2Bucket } from '@cloudflare/workers-types';
import type { ResourceHandler } from '@anju/containers';

export type Variables = {};

export type Bindings = {
  HYPERDRIVE: Hyperdrive;
  STORAGE_BUCKET: R2Bucket;
  RESOURCE_HANDLER: DurableObjectNamespace<ResourceHandler>;
  RESOURCE_HANDLER_PORT: string;
  DATABASE_URL?: string;
  NODE_ENV?: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
