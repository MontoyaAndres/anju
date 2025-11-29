import { Context } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { utils } from '@anju/utils';

import { createDb, schema } from '../../db';

// types
import { AppEnv } from '../../types';

const create = async (c: Context<AppEnv>) => {
  const body = await c.req.json();
  const currentValues = await utils.Schema.ORGANIZATION_CREATE.parseAsync({
    ...body,
    userId: c.get('user').id,
  });

  const db = createDb(c);

  const result = await db.transaction(async tx => {
    let project = null;
    const projectCount = currentValues.projectName ? '1' : '0';

    const [org] = await tx
      .insert(schema.organization)
      .values({
        name: currentValues.name,
        ownerId: currentValues.userId,
        organizationUserCount: '1',
        projectCount,
      })
      .returning();

    await tx
      .insert(schema.organizationUser)
      .values({ userId: currentValues.userId, organizationId: org.id });

    if (currentValues.projectName) {
      [project] = await tx
        .insert(schema.project)
        .values({
          name: currentValues.projectName,
          createdById: currentValues.userId,
          projectUserCount: '1',
          organizationId: org.id,
        })
        .returning();

      await tx
        .insert(schema.projectUser)
        .values({ userId: currentValues.userId, projectId: project.id });
    }

    return { organization: org, project };
  });

  return c.json(result);
};

const update = async (c: Context<AppEnv>) => {
  const body = await c.req.json();
  const param = c.req.param();
  const currentValues = await utils.Schema.ORGANIZATION_UPDATE.parseAsync({
    ...body,
    id: param.id,
    userId: c.get('user').id,
  });

  const db = createDb(c);

  const [org] = await db
    .update(schema.organization)
    .set({ name: currentValues.name })
    .where(
      and(
        eq(schema.organization.id, currentValues.id),
        eq(schema.organization.ownerId, currentValues.userId)
      )
    )
    .returning();

  return c.json(org);
};

const get = async (c: Context<AppEnv>) => {
  const param = c.req.param();
  const userId = c.get('user').id;

  const db = createDb(c);

  const organization = await db.query.organization.findFirst({
    where: and(
      eq(schema.organization.id, param.id),
      eq(schema.organization.ownerId, userId)
    ),
    with: {
      projects: true,
    },
  });

  return c.json(organization);
};

const list = async (c: Context<AppEnv>) => {
  const userId = c.get('user').id;

  const db = createDb(c);

  const organizations = await db
    .select()
    .from(schema.organization)
    .where(eq(schema.organization.ownerId, userId))
    .orderBy(desc(schema.organization.id));

  return c.json(organizations);
};

const remove = async (c: Context<AppEnv>) => {
  const param = c.req.param();
  const userId = c.get('user').id;

  const db = createDb(c);

  await db
    .delete(schema.organization)
    .where(
      and(
        eq(schema.organization.id, param.id),
        eq(schema.organization.ownerId, userId)
      )
    );

  return c.json({ id: param.id });
};

export const OrganizationController = {
  create,
  update,
  get,
  list,
  remove,
};
