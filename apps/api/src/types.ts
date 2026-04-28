import type { Hyperdrive, Queue, R2Bucket } from '@cloudflare/workers-types';

import type { Auth } from './utils';
import type { IndexJob } from './queue';

export type Variables = {
  user: Auth['$Infer']['Session']['user'];
  session: Auth['$Infer']['Session']['session'];
};

export type Bindings = {
  HYPERDRIVE: Hyperdrive;
  STORAGE_BUCKET: R2Bucket;
  INDEX_QUEUE: Queue<IndexJob>;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
