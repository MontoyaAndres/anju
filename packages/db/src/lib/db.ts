import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

import * as schema from './schema';
import { getDBConnectionString } from '../utils';

export interface DbEnvSource {
  env: { HYPERDRIVE: { connectionString: string } };
}

export const create = (source: DbEnvSource) => {
  const connectionString = getDBConnectionString(source.env);
  const client = postgres(connectionString, {
    prepare: true
  });
  return drizzle(client, { schema });
};

export type Database = ReturnType<typeof create>;
