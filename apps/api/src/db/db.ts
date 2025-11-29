import { Context } from 'hono';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

import * as schema from './schema';
import { getDBConnectionString } from '../utils';

export const createDb = (c: Context) => {
  const connectionString = getDBConnectionString(c.env);
  const pool = new Pool({ connectionString });
  return drizzle(pool, { schema });
};

export type Database = ReturnType<typeof createDb>;
