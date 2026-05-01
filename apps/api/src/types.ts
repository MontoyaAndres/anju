import type { Hyperdrive, Queue, R2Bucket } from '@cloudflare/workers-types';

import type { Auth } from './utils';
import type { IndexJob } from './queue';
import type { ResourceHandler } from './containers';

export type Variables = {
  user: Auth['$Infer']['Session']['user'];
  session: Auth['$Infer']['Session']['session'];
};

export type Bindings = {
  HYPERDRIVE: Hyperdrive;
  STORAGE_BUCKET: R2Bucket;
  INDEX_QUEUE: Queue<IndexJob>;
  RESOURCE_HANDLER: DurableObjectNamespace<ResourceHandler>;
  RESOURCE_HANDLER_PORT: string;
  DATABASE_URL?: string;
  NODE_ENV?: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
