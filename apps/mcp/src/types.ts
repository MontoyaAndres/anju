import type { Hyperdrive } from '@cloudflare/workers-types';

export type Variables = {};

export type Bindings = {
  HYPERDRIVE: Hyperdrive;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
