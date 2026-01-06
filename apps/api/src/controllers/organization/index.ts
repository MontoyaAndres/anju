import { Context } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { utils } from '@anju/utils';
import { db } from '@anju/db';
import { v7 as uuid } from 'uuid';

// types
import { AppEnv } from '../../types';

const create = async (c: Context<AppEnv>) => {
  const body = await c.req.json();
  const currentValues = await utils.Schema.ORGANIZATION_CREATE.parseAsync({
    ...body,
    userId: c.get('user').id,
  });

  const dbInstance = db.create(c);

  const result = await dbInstance.transaction(async tx => {
    const [org] = await tx
      .insert(db.schema.organization)
      .values({
        name: currentValues.name,
        ownerId: currentValues.userId,
        organizationUserCount: 1,
        projectCount: 1,
      })
      .returning();

    await tx
      .insert(db.schema.organizationUser)
      .values({ userId: currentValues.userId, organizationId: org.id });

    const [project] = await tx
      .insert(db.schema.project)
      .values({
        name: currentValues.projectName,
        description: currentValues.projectDescription || null,
        createdById: currentValues.userId,
        projectUserCount: 1,
        organizationId: org.id,
      })
      .returning();

    await tx
      .insert(db.schema.projectUser)
      .values({ userId: currentValues.userId, projectId: project.id });

    const artifactId = uuid();
    const artifactHash = utils.hashObject({
      organizationId: org.id,
      projectId: project.id,
      artifactId,
    });

    await tx.insert(db.schema.artifact).values({
      id: artifactId,
      hash: artifactHash,
      artifactPromptCount: 0,
      artifactResourceCount: 0,
      projectId: project.id,
    });

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

  const dbInstance = db.create(c);

  const [org] = await dbInstance
    .update(db.schema.organization)
    .set({ name: currentValues.name })
    .where(
      and(
        eq(db.schema.organization.id, currentValues.id),
        eq(db.schema.organization.ownerId, currentValues.userId)
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

  const dbInstance = db.create(c);

  const organization = await dbInstance.query.organization.findFirst({
    where: and(
      eq(db.schema.organization.id, currentValues.id),
      eq(db.schema.organization.ownerId, currentValues.userId)
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

  const dbInstance = db.create(c);

  const organizations = await dbInstance.query.organization.findMany({
    where: eq(db.schema.organization.ownerId, currentValues.userId),
    orderBy: desc(db.schema.organization.id),
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

  const dbInstance = db.create(c);

  await dbInstance
    .delete(db.schema.organization)
    .where(
      and(
        eq(db.schema.organization.id, currentValues.id),
        eq(db.schema.organization.ownerId, currentValues.userId)
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
