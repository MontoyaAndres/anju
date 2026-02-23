import type { Hyperdrive, R2Bucket } from '@cloudflare/workers-types';

export type Variables = {};

export type Bindings = {
  HYPERDRIVE: Hyperdrive;
  STORAGE_BUCKET: R2Bucket;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
