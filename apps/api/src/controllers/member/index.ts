import { Context } from 'hono';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { utils } from '@anju/utils';
import { db } from '@anju/db';

// types
import { AppEnv } from '../../types';

const memberUserColumns = {
  columns: { id: true, name: true, email: true, image: true }
} as const;

const listForOrganization = async (c: Context<AppEnv>) => {
  const currentValues = await utils.Schema.ORGANIZATION_MEMBER_LIST.parseAsync({
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId')
  });

  const dbInstance = db.create(c);

  const members = await dbInstance.query.organizationUser.findMany({
    where: eq(
      db.schema.organizationUser.organizationId,
      currentValues.organizationId
    ),
    with: { user: memberUserColumns },
    orderBy: asc(db.schema.organizationUser.createdAt)
  });

  return c.json(members);
};

const removeForOrganization = async (c: Context<AppEnv>) => {
  const currentValues =
    await utils.Schema.ORGANIZATION_MEMBER_REMOVE.parseAsync({
      memberUserId: c.req.param('memberUserId'),
      userId: c.get('user').id,
      organizationId: c.req.param('organizationId')
    });

  // A member cannot remove themselves — leaving is a separate, deliberate act.
  if (currentValues.memberUserId === currentValues.userId) {
    throw new Error('You cannot remove yourself from this organization');
  }

  const dbInstance = db.create(c);

  const organization = await dbInstance.query.organization.findFirst({
    where: eq(db.schema.organization.id, currentValues.organizationId),
    columns: { id: true, ownerId: true }
  });

  if (!organization) {
    throw new Error('Organization not found');
  }

  if (organization.ownerId === currentValues.memberUserId) {
    throw new Error('You cannot remove the organization owner');
  }

  const removed = await dbInstance.transaction(async tx => {
    // An organization must always keep at least one member.
    const [{ value: memberCount }] = await tx
      .select({ value: count() })
      .from(db.schema.organizationUser)
      .where(
        eq(
          db.schema.organizationUser.organizationId,
          currentValues.organizationId
        )
      );

    if (memberCount <= 1) {
      throw new Error('You cannot remove the last member of the organization');
    }

    const deleted = await tx
      .delete(db.schema.organizationUser)
      .where(
        and(
          eq(
            db.schema.organizationUser.organizationId,
            currentValues.organizationId
          ),
          eq(db.schema.organizationUser.userId, currentValues.memberUserId)
        )
      )
      .returning({ userId: db.schema.organizationUser.userId });

    if (deleted.length === 0) {
      throw new Error('Member not found');
    }

    await tx
      .update(db.schema.organization)
      .set({
        organizationUserCount: sql`(${db.schema.organization.organizationUserCount}::int - 1)::int`
      })
      .where(eq(db.schema.organization.id, currentValues.organizationId));

    return deleted[0];
  });

  return c.json(removed);
};

const listForProject = async (c: Context<AppEnv>) => {
  const currentValues = await utils.Schema.PROJECT_MEMBER_LIST.parseAsync({
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId'),
    projectId: c.req.param('projectId')
  });

  const dbInstance = db.create(c);

  const members = await dbInstance.query.projectUser.findMany({
    where: eq(db.schema.projectUser.projectId, currentValues.projectId),
    with: { user: memberUserColumns },
    orderBy: asc(db.schema.projectUser.createdAt)
  });

  return c.json(members);
};

const removeForProject = async (c: Context<AppEnv>) => {
  const currentValues = await utils.Schema.PROJECT_MEMBER_REMOVE.parseAsync({
    memberUserId: c.req.param('memberUserId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId'),
    projectId: c.req.param('projectId')
  });

  if (currentValues.memberUserId === currentValues.userId) {
    throw new Error('You cannot remove yourself from this project');
  }

  const dbInstance = db.create(c);

  const removed = await dbInstance.transaction(async tx => {
    // A project must always keep at least one member.
    const [{ value: memberCount }] = await tx
      .select({ value: count() })
      .from(db.schema.projectUser)
      .where(eq(db.schema.projectUser.projectId, currentValues.projectId));

    if (memberCount <= 1) {
      throw new Error('You cannot remove the last member of the project');
    }

    const deleted = await tx
      .delete(db.schema.projectUser)
      .where(
        and(
          eq(db.schema.projectUser.projectId, currentValues.projectId),
          eq(db.schema.projectUser.userId, currentValues.memberUserId)
        )
      )
      .returning({ userId: db.schema.projectUser.userId });

    if (deleted.length === 0) {
      throw new Error('Member not found');
    }

    await tx
      .update(db.schema.project)
      .set({
        projectUserCount: sql`(${db.schema.project.projectUserCount}::int - 1)::int`
      })
      .where(eq(db.schema.project.id, currentValues.projectId));

    return deleted[0];
  });

  return c.json(removed);
};

export const MemberController = {
  listForOrganization,
  removeForOrganization,
  listForProject,
  removeForProject
};
