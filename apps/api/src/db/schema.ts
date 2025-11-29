import {
  pgTable,
  text,
  timestamp,
  json,
  index,
  primaryKey,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { v7 as uuid } from 'uuid';
import { utils } from '@anju/utils';

export const user = pgTable(
  'user',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => [index('user_email_idx').on(table.email)]
);

export const session = pgTable(
  'session',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => [index('session_userId_idx').on(table.userId)]
);

export const account = pgTable(
  'account',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => [index('account_userId_idx').on(table.userId)]
);

export const verification = pgTable(
  'verification',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => [index('verification_identifier_idx').on(table.identifier)]
);

export const organization = pgTable('organization', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuid()),
  name: text('name').notNull(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => user.id),
  projectCount: text('project_count').notNull().default('0'),
  organizationUserCount: text('organization_user_count').notNull().default('0'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const organizationUser = pgTable(
  'organization_user',
  {
    role: text('role').notNull().default(utils.constants.USER_ROLE_ADMIN),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => [primaryKey({ columns: [table.userId, table.organizationId] })]
);

export const project = pgTable('project', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuid()),
  name: text('name').notNull(),
  artifactCount: text('artifact_count').notNull().default('0'),
  projectUserCount: text('project_user_count').notNull().default('0'),
  description: text('description'),
  createdById: text('created_by_id')
    .notNull()
    .references(() => user.id),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const projectUser = pgTable(
  'project_user',
  {
    role: text('role').notNull().default(utils.constants.USER_ROLE_ADMIN),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => [primaryKey({ columns: [table.projectId, table.userId] })]
);

export const artifact = pgTable('artifact', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuid()),
  name: text('name').notNull(),
  artifactResourceCount: text('artifact_resource_count').notNull().default('0'),
  artifactUserCount: text('artifact_user_count').notNull().default('0'),
  metadata: json('metadata'),
  projectId: text('project_id')
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const artifactResource = pgTable('artifact_resource', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuid()),
  type: text('type').notNull(),
  metadata: json('metadata'),
  artifactId: text('artifact_id')
    .notNull()
    .references(() => artifact.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const artifactUser = pgTable(
  'artifact_user',
  {
    role: text('role').notNull().default(utils.constants.USER_ROLE_ADMIN),
    artifactId: text('artifact_id')
      .notNull()
      .references(() => artifact.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => [primaryKey({ columns: [table.artifactId, table.userId] })]
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  ownedOrganizations: many(organization),
  createdProjects: many(project),
  organizationUsers: many(organizationUser),
  projectUsers: many(projectUser),
  artifactUsers: many(artifactUser),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const organizationRelations = relations(
  organization,
  ({ one, many }) => ({
    owner: one(user, {
      fields: [organization.ownerId],
      references: [user.id],
    }),
    projects: many(project),
    organizationUsers: many(organizationUser),
  })
);

export const organizationUserRelations = relations(
  organizationUser,
  ({ one }) => ({
    user: one(user, {
      fields: [organizationUser.userId],
      references: [user.id],
    }),
    organization: one(organization, {
      fields: [organizationUser.organizationId],
      references: [organization.id],
    }),
  })
);

export const projectRelations = relations(project, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [project.createdById],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [project.organizationId],
    references: [organization.id],
  }),
  artifacts: many(artifact),
  projectUsers: many(projectUser),
}));

export const projectUserRelations = relations(projectUser, ({ one }) => ({
  project: one(project, {
    fields: [projectUser.projectId],
    references: [project.id],
  }),
  user: one(user, {
    fields: [projectUser.userId],
    references: [user.id],
  }),
}));

export const artifactRelations = relations(artifact, ({ one, many }) => ({
  project: one(project, {
    fields: [artifact.projectId],
    references: [project.id],
  }),
  artifactResources: many(artifactResource),
  artifactUsers: many(artifactUser),
}));

export const artifactResourceRelations = relations(
  artifactResource,
  ({ one }) => ({
    artifact: one(artifact, {
      fields: [artifactResource.artifactId],
      references: [artifact.id],
    }),
  })
);

export const artifactUserRelations = relations(artifactUser, ({ one }) => ({
  artifact: one(artifact, {
    fields: [artifactUser.artifactId],
    references: [artifact.id],
  }),
  user: one(user, {
    fields: [artifactUser.userId],
    references: [user.id],
  }),
}));
