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
          description: currentValues.projectDescription || null,
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
  const currentValues = await utils.Schema.ORGANIZATION_UPDATE.parseAsync({
    ...body,
    id: c.req.param('organizationId'),
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
  const currentValues = await utils.Schema.ORGANIZATION_GET.parseAsync({
    id: c.req.param('organizationId'),
    userId: c.get('user').id,
  });

  const db = createDb(c);

  const organization = await db.query.organization.findFirst({
    where: and(
      eq(schema.organization.id, currentValues.id),
      eq(schema.organization.ownerId, currentValues.userId)
    ),
    with: {
      projects: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  });

  return c.json(organization);
};

const list = async (c: Context<AppEnv>) => {
  const currentValues = await utils.Schema.AUTH_USER_GET.parseAsync({
    userId: c.get('user').id,
  });

  const db = createDb(c);

  const organizations = await db.query.organization.findMany({
    where: eq(schema.organization.ownerId, currentValues.userId),
    orderBy: desc(schema.organization.id),
    with: {
      projects: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  });

  return c.json(organizations);
};

const remove = async (c: Context<AppEnv>) => {
  const currentValues = await utils.Schema.ORGANIZATION_GET.parseAsync({
    id: c.req.param('organizationId'),
    userId: c.get('user').id,
  });

  const db = createDb(c);

  await db
    .delete(schema.organization)
    .where(
      and(
        eq(schema.organization.id, currentValues.id),
        eq(schema.organization.ownerId, currentValues.userId)
      )
    );

  return c.json({ id: currentValues.id });
};

export const OrganizationController = {
  create,
  update,
  get,
  list,
  remove,
};
