import {
  pgTable,
  text,
  timestamp,
  json,
  index,
  integer,
  primaryKey,
  boolean,
  halfvec
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
      .$onUpdate(() => new Date())
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
      .$onUpdate(() => new Date())
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
      .$onUpdate(() => new Date())
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
      .$onUpdate(() => new Date())
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
  projectCount: integer('project_count').notNull().default(0),
  organizationUserCount: integer('organization_user_count')
    .notNull()
    .default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
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
      .$onUpdate(() => new Date())
  },
  table => [primaryKey({ columns: [table.userId, table.organizationId] })]
);

export const project = pgTable('project', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuid()),
  name: text('name').notNull(),
  artifactCount: integer('artifact_count').notNull().default(0),
  projectUserCount: integer('project_user_count').notNull().default(0),
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
    .$onUpdate(() => new Date())
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
      .$onUpdate(() => new Date())
  },
  table => [primaryKey({ columns: [table.projectId, table.userId] })]
);

export const artifact = pgTable('artifact', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuid()),
  hash: text('hash').notNull().unique(),
  artifactPromptCount: integer('artifact_prompt_count').notNull().default(0),
  artifactResourceCount: integer('artifact_resource_count')
    .notNull()
    .default(0),
  artifactToolCount: integer('artifact_tool_count').notNull().default(0),
  artifactCredentialCount: integer('artifact_credential_count')
    .notNull()
    .default(0),
  channelCount: integer('channel_count').notNull().default(0),
  metadata: json('metadata'),
  projectId: text('project_id')
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});

export const artifactLlm = pgTable('artifact_llm', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuid()),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  baseUrl: text('base_url'),
  apiKey: text('api_key').notNull(),
  systemPrompt: text('system_prompt'),
  config: json('config'),
  artifactId: text('artifact_id')
    .notNull()
    .unique()
    .references(() => artifact.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});

export const channel = pgTable(
  'channel',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    platform: text('platform').notNull(),
    status: text('status').notNull().default(utils.constants.STATUS_ACTIVE),
    config: json('config'),
    metadata: json('metadata'),
    credentials: text('credentials').notNull(),
    webhookSecret: text('webhook_secret').notNull(),
    conversationCount: integer('conversation_count').notNull().default(0),
    messageCount: integer('message_count').notNull().default(0),
    artifactId: text('artifact_id')
      .notNull()
      .references(() => artifact.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  table => [index('channel_artifactId_idx').on(table.artifactId)]
);

export const channelConversation = pgTable(
  'channel_conversation',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    externalConversationId: text('external_conversation_id').notNull(),
    title: text('title'),
    scope: text('scope')
      .notNull()
      .default(utils.constants.CHANNEL_CONVERSATION_SCOPE_PRIVATE),
    metadata: json('metadata'),
    messageCount: integer('message_count').notNull().default(0),
    lastMessageAt: timestamp('last_message_at', { mode: 'date' }),
    channelId: text('channel_id')
      .notNull()
      .references(() => channel.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  table => [
    index('channel_conversation_channelId_idx').on(table.channelId),
    index('channel_conversation_external_idx').on(
      table.channelId,
      table.externalConversationId
    )
  ]
);

export const channelParticipant = pgTable(
  'channel_participant',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    externalUserId: text('external_user_id').notNull(),
    displayName: text('display_name'),
    metadata: json('metadata'),
    linkedUserId: text('linked_user_id').references(() => user.id, {
      onDelete: 'set null'
    }),
    channelId: text('channel_id')
      .notNull()
      .references(() => channel.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  table => [
    index('channel_participant_channelId_idx').on(table.channelId),
    index('channel_participant_external_idx').on(
      table.channelId,
      table.externalUserId
    )
  ]
);

export const channelMessage = pgTable(
  'channel_message',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    role: text('role').notNull(),
    content: text('content'),
    externalMessageId: text('external_message_id'),
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    latencyMs: integer('latency_ms'),
    metadata: json('metadata'),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => channelConversation.id, { onDelete: 'cascade' }),
    participantId: text('participant_id').references(
      () => channelParticipant.id,
      { onDelete: 'set null' }
    ),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow()
  },
  table => [
    index('channel_message_conversationId_idx').on(table.conversationId),
    index('channel_message_createdAt_idx').on(table.createdAt)
  ]
);

export const errorLog = pgTable(
  'error_log',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    service: text('service').notNull(),
    referenceId: text('reference_id'),
    name: text('name'),
    message: text('message'),
    stack: text('stack'),
    status: integer('status'),
    method: text('method'),
    path: text('path'),
    query: text('query'),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
    userId: text('user_id'),
    organizationId: text('organization_id'),
    projectId: text('project_id'),
    metadata: json('metadata'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow()
  },
  table => [
    index('error_log_service_idx').on(table.service),
    index('error_log_createdAt_idx').on(table.createdAt)
  ]
);

export const channelMessageUsage = pgTable(
  'channel_message_usage',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    kind: text('kind').notNull(),
    input: json('input'),
    output: json('output'),
    latencyMs: integer('latency_ms'),
    errorMessage: text('error_message'),
    messageId: text('message_id')
      .notNull()
      .references(() => channelMessage.id, { onDelete: 'cascade' }),
    artifactPromptId: text('artifact_prompt_id').references(
      () => artifactPrompt.id,
      { onDelete: 'set null' }
    ),
    artifactResourceId: text('artifact_resource_id').references(
      () => artifactResource.id,
      { onDelete: 'set null' }
    ),
    artifactToolId: text('artifact_tool_id').references(() => artifactTool.id, {
      onDelete: 'set null'
    }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow()
  },
  table => [index('channel_message_usage_messageId_idx').on(table.messageId)]
);

export const artifactPrompt = pgTable('artifact_prompt', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuid()),
  title: text('title').notNull(),
  description: text('description'),
  messages: json('messages').notNull().default([]),
  schema: json('schema'),
  metadata: json('metadata'),
  artifactId: text('artifact_id')
    .notNull()
    .references(() => artifact.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});

export const toolGroup = pgTable('tool_group', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuid()),
  key: text('key').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  icon: text('icon'),
  provider: text('provider'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});

export const toolDefinition = pgTable('tool_definition', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuid()),
  key: text('key').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  requiredScopes: text('required_scopes'),
  groupId: text('group_id')
    .notNull()
    .references(() => toolGroup.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});

export const artifactTool = pgTable('artifact_tool', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuid()),
  config: json('config'),
  metadata: json('metadata'),
  toolDefinitionId: text('tool_definition_id')
    .notNull()
    .references(() => toolDefinition.id, { onDelete: 'cascade' }),
  artifactId: text('artifact_id')
    .notNull()
    .references(() => artifact.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});

export const artifactCredential = pgTable('artifact_credential', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuid()),
  provider: text('provider').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  scopes: text('scopes'),
  metadata: json('metadata'),
  artifactId: text('artifact_id')
    .notNull()
    .references(() => artifact.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});

export const artifactResource = pgTable('artifact_resource', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuid()),
  title: text('title').notNull(),
  uri: text('uri').notNull(),
  type: text('type').notNull().default(utils.constants.RESOURCE_TYPE_STATIC),
  description: text('description'),
  mimeType: text('mime_type').notNull(),
  content: text('content'),
  size: integer('size'),
  encoding: text('encoding'),
  fileKey: text('file_key'),
  fileName: text('file_name'),
  annotations: json('annotations'),
  icons: json('icons'),
  metadata: json('metadata'),
  artifactId: text('artifact_id')
    .notNull()
    .references(() => artifact.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});

export const artifactResourceChunk = pgTable(
  'artifact_resource_chunk',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuid()),
    resourceId: text('resource_id')
      .notNull()
      .references(() => artifactResource.id, { onDelete: 'cascade' }),
    artifactId: text('artifact_id')
      .notNull()
      .references(() => artifact.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    embedding: halfvec('embedding', { dimensions: 3072 }).notNull(),
    metadata: json('metadata'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow()
  },
  table => [
    index('artifact_resource_chunk_resource_idx').on(table.resourceId),
    index('artifact_resource_chunk_artifact_idx').on(table.artifactId),
    index('artifact_resource_chunk_embedding_idx').using(
      'hnsw',
      table.embedding.op('halfvec_cosine_ops')
    )
  ]
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  ownedOrganizations: many(organization),
  createdProjects: many(project),
  organizationUsers: many(organizationUser),
  projectUsers: many(projectUser)
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id]
  })
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id]
  })
}));

export const organizationRelations = relations(
  organization,
  ({ one, many }) => ({
    owner: one(user, {
      fields: [organization.ownerId],
      references: [user.id]
    }),
    projects: many(project),
    organizationUsers: many(organizationUser)
  })
);

export const organizationUserRelations = relations(
  organizationUser,
  ({ one }) => ({
    user: one(user, {
      fields: [organizationUser.userId],
      references: [user.id]
    }),
    organization: one(organization, {
      fields: [organizationUser.organizationId],
      references: [organization.id]
    })
  })
);

export const projectRelations = relations(project, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [project.createdById],
    references: [user.id]
  }),
  organization: one(organization, {
    fields: [project.organizationId],
    references: [organization.id]
  }),
  artifacts: many(artifact),
  projectUsers: many(projectUser)
}));

export const projectUserRelations = relations(projectUser, ({ one }) => ({
  project: one(project, {
    fields: [projectUser.projectId],
    references: [project.id]
  }),
  user: one(user, {
    fields: [projectUser.userId],
    references: [user.id]
  })
}));

export const artifactRelations = relations(artifact, ({ one, many }) => ({
  project: one(project, {
    fields: [artifact.projectId],
    references: [project.id]
  }),
  artifactPrompts: many(artifactPrompt),
  artifactResources: many(artifactResource),
  artifactTools: many(artifactTool),
  artifactCredentials: many(artifactCredential),
  artifactLlm: one(artifactLlm, {
    fields: [artifact.id],
    references: [artifactLlm.artifactId]
  }),
  channels: many(channel)
}));

export const artifactLlmRelations = relations(artifactLlm, ({ one }) => ({
  artifact: one(artifact, {
    fields: [artifactLlm.artifactId],
    references: [artifact.id]
  })
}));

export const channelRelations = relations(channel, ({ one, many }) => ({
  artifact: one(artifact, {
    fields: [channel.artifactId],
    references: [artifact.id]
  }),
  conversations: many(channelConversation),
  participants: many(channelParticipant)
}));

export const channelConversationRelations = relations(
  channelConversation,
  ({ one, many }) => ({
    channel: one(channel, {
      fields: [channelConversation.channelId],
      references: [channel.id]
    }),
    messages: many(channelMessage)
  })
);

export const channelParticipantRelations = relations(
  channelParticipant,
  ({ one, many }) => ({
    channel: one(channel, {
      fields: [channelParticipant.channelId],
      references: [channel.id]
    }),
    linkedUser: one(user, {
      fields: [channelParticipant.linkedUserId],
      references: [user.id]
    }),
    messages: many(channelMessage)
  })
);

export const channelMessageRelations = relations(
  channelMessage,
  ({ one, many }) => ({
    conversation: one(channelConversation, {
      fields: [channelMessage.conversationId],
      references: [channelConversation.id]
    }),
    participant: one(channelParticipant, {
      fields: [channelMessage.participantId],
      references: [channelParticipant.id]
    }),
    usages: many(channelMessageUsage)
  })
);

export const channelMessageUsageRelations = relations(
  channelMessageUsage,
  ({ one }) => ({
    message: one(channelMessage, {
      fields: [channelMessageUsage.messageId],
      references: [channelMessage.id]
    }),
    artifactPrompt: one(artifactPrompt, {
      fields: [channelMessageUsage.artifactPromptId],
      references: [artifactPrompt.id]
    }),
    artifactResource: one(artifactResource, {
      fields: [channelMessageUsage.artifactResourceId],
      references: [artifactResource.id]
    }),
    artifactTool: one(artifactTool, {
      fields: [channelMessageUsage.artifactToolId],
      references: [artifactTool.id]
    })
  })
);

export const artifactPromptRelations = relations(artifactPrompt, ({ one }) => ({
  artifact: one(artifact, {
    fields: [artifactPrompt.artifactId],
    references: [artifact.id]
  })
}));

export const toolGroupRelations = relations(toolGroup, ({ many }) => ({
  toolDefinitions: many(toolDefinition)
}));

export const toolDefinitionRelations = relations(
  toolDefinition,
  ({ one, many }) => ({
    group: one(toolGroup, {
      fields: [toolDefinition.groupId],
      references: [toolGroup.id]
    }),
    artifactTools: many(artifactTool)
  })
);

export const artifactToolRelations = relations(artifactTool, ({ one }) => ({
  artifact: one(artifact, {
    fields: [artifactTool.artifactId],
    references: [artifact.id]
  }),
  toolDefinition: one(toolDefinition, {
    fields: [artifactTool.toolDefinitionId],
    references: [toolDefinition.id]
  })
}));

export const artifactCredentialRelations = relations(
  artifactCredential,
  ({ one }) => ({
    artifact: one(artifact, {
      fields: [artifactCredential.artifactId],
      references: [artifact.id]
    })
  })
);

export const artifactResourceRelations = relations(
  artifactResource,
  ({ one, many }) => ({
    artifact: one(artifact, {
      fields: [artifactResource.artifactId],
      references: [artifact.id]
    }),
    chunks: many(artifactResourceChunk)
  })
);

export const artifactResourceChunkRelations = relations(
  artifactResourceChunk,
  ({ one }) => ({
    resource: one(artifactResource, {
      fields: [artifactResourceChunk.resourceId],
      references: [artifactResource.id]
    }),
    artifact: one(artifact, {
      fields: [artifactResourceChunk.artifactId],
      references: [artifact.id]
    })
  })
);
