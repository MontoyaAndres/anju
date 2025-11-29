import type { Hyperdrive } from '@cloudflare/workers-types';

import type { Auth } from './utils';

export type Variables = {
  user: Auth['$Infer']['Session']['user'];
  session: Auth['$Infer']['Session']['session'];
};

export type Bindings = {
  HYPERDRIVE: Hyperdrive;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
