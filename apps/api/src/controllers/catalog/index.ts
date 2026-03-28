import { Context } from 'hono';
import { db } from '@anju/db';

// types
import { AppEnv } from '../../types';

const listGroups = async (c: Context<AppEnv>) => {
  const dbInstance = db.create(c);

  const groups = await dbInstance.query.toolGroup.findMany({
    with: {
      toolDefinitions: true
    }
  });

  return c.json(groups);
};

export const CatalogController = {
  listGroups
};
