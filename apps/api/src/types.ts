import type { Hyperdrive, R2Bucket } from '@cloudflare/workers-types';

import type { Auth } from './utils';

export type Variables = {
  user: Auth['$Infer']['Session']['user'];
  session: Auth['$Infer']['Session']['session'];
};

export type Bindings = {
  HYPERDRIVE: Hyperdrive;
  STORAGE_BUCKET: R2Bucket;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
