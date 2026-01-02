import { Context } from 'hono';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

import * as schema from './schema';
import { getDBConnectionString } from '../utils';

export const create = (c: Context) => {
  const connectionString = getDBConnectionString(c.env);
  const client = postgres(connectionString, {
    prepare: true,
  });
  return drizzle(client, { schema });
};

export type Database = ReturnType<typeof create>;
