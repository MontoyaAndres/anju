import { Context } from 'hono';
import { and, eq, sql } from 'drizzle-orm';
import { utils } from '@anju/utils';

import { createDb, schema } from '../../db';

// types
import { AppEnv } from '../../types';

const create = async (c: Context<AppEnv>) => {
  const body = await c.req.json();
  const currentValues = await utils.Schema.PROJECT_CREATE.parseAsync({
    ...body,
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId'),
  });

  const db = createDb(c);

  const result = await db.transaction(async tx => {
    const [project] = await tx
      .insert(schema.project)
      .values({
        name: currentValues.name,
        description: currentValues.description || null,
        createdById: currentValues.userId,
        projectUserCount: '1',
        organizationId: currentValues.organizationId,
      })
      .returning();

    await tx
      .insert(schema.projectUser)
      .values({ userId: currentValues.userId, projectId: project.id });

    await tx
      .update(schema.organization)
      .set({
        projectCount: sql`(${schema.organization.projectCount}::int + 1)::text`,
      })
      .where(eq(schema.organization.id, currentValues.organizationId));

    return project;
  });

  return c.json(result);
};

const update = async (c: Context<AppEnv>) => {
  const body = await c.req.json();
  const currentValues = await utils.Schema.PROJECT_UPDATE.parseAsync({
    ...body,
    id: c.req.param('projectId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId'),
  });

  const db = createDb(c);

  const result = await db
    .update(schema.project)
    .set({
      name: currentValues.name,
      description: currentValues.description || null,
    })
    .where(
      and(
        eq(schema.project.id, currentValues.id),
        eq(schema.project.organizationId, currentValues.organizationId)
      )
    )
    .returning();

  return c.json(result);
};

const get = async (c: Context<AppEnv>) => {
  const currentValues = await utils.Schema.PROJECT_GET.parseAsync({
    id: c.req.param('projectId'),
    organizationId: c.req.param('organizationId'),
    userId: c.get('user').id,
  });

  const db = createDb(c);

  const result = await db
    .select()
    .from(schema.project)
    .where(
      and(
        eq(schema.project.id, currentValues.id),
        eq(schema.project.organizationId, currentValues.organizationId)
      )
    );

  return c.json(result);
};

const remove = async (c: Context<AppEnv>) => {
  const currentValues = await utils.Schema.PROJECT_GET.parseAsync({
    id: c.req.param('projectId'),
    organizationId: c.req.param('organizationId'),
    userId: c.get('user').id,
  });

  const db = createDb(c);

  await db.transaction(async tx => {
    await tx
      .delete(schema.project)
      .where(
        and(
          eq(schema.project.id, currentValues.id),
          eq(schema.project.organizationId, currentValues.organizationId)
        )
      );

    await tx
      .update(schema.organization)
      .set({
        projectCount: sql`(${schema.organization.projectCount}::int - 1)::text`,
      })
      .where(eq(schema.organization.id, currentValues.organizationId));
  });

  return c.json(currentValues);
};

export const ProjectController = {
  create,
  update,
  get,
  remove,
};
