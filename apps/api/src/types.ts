import type { Auth } from './utils';

export type Variables = {
  user: Auth['$Infer']['Session']['user'];
  session: Auth['$Infer']['Session']['session'];
};

export type AppEnv = {
  Variables: Variables;
};
