import { Context } from 'hono';
import { and, desc, eq, sql } from 'drizzle-orm';
import { v7 as uuid } from 'uuid';
import { db } from '@anju/db';
import { utils } from '@anju/utils';

import {
  handleTelegramWebhook,
  registerTelegramWebhook,
  registerTelegramBotCommands,
  getTelegramBotInfo
} from './telegram';

import type { AppEnv } from '../../types';

const list = async (c: Context<AppEnv>) => {
  const currentValues = await utils.Schema.CHANNEL_GET.parseAsync({
    projectId: c.req.param('projectId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId')
  });

  const dbInstance = db.create(c);

  const artifact = await dbInstance.query.artifact.findFirst({
    where: eq(db.schema.artifact.projectId, currentValues.projectId),
    with: { channels: true }
  });

  if (!artifact) throw new Error('Artifact not found for the project');

  return c.json(
    artifact.channels.map(
      ({ credentials: _c, webhookSecret: _w, ...rest }) => ({
        ...rest,
        hasCredentials: true
      })
    )
  );
};

const create = async (c: Context<AppEnv>) => {
  const body = await c.req.json();
  const currentValues = await utils.Schema.CHANNEL_CREATE.parseAsync({
    ...body,
    projectId: c.req.param('projectId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId')
  });

  const dbInstance = db.create(c);
  const encryptionKey = utils.getCredentialEncryptionKey(c);
  const encryptedCredentials = utils.encryptString(
    JSON.stringify(currentValues.credentials),
    encryptionKey
  );

  const rawSecret = uuid().replace(/-/g, '') + uuid().replace(/-/g, '');
  const hashedSecret = await utils.sha256Hex(rawSecret);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) throw new Error('Missing env: NEXT_PUBLIC_API_URL');

  let platformMetadata: Record<string, unknown> | null = null;
  if (currentValues.platform === utils.constants.CHANNEL_PLATFORM_TELEGRAM) {
    const botInfo = await getTelegramBotInfo(currentValues.credentials.botToken);
    platformMetadata = { telegram: { bot: botInfo } };
  }

  const result = await dbInstance.transaction(async tx => {
    const [project] = await tx
      .select()
      .from(db.schema.project)
      .where(
        and(
          eq(db.schema.project.id, currentValues.projectId),
          eq(db.schema.project.organizationId, currentValues.organizationId)
        )
      )
      .limit(1);

    if (!project) throw new Error('Project not found');

    const [artifactRow] = await tx
      .select()
      .from(db.schema.artifact)
      .where(eq(db.schema.artifact.projectId, currentValues.projectId))
      .limit(1);

    if (!artifactRow) throw new Error('Artifact not found for the project');

    const [channelRow] = await tx
      .insert(db.schema.channel)
      .values({
        platform: currentValues.platform,
        status: utils.constants.CHANNEL_STATUS_ACTIVE,
        config: currentValues.config || null,
        metadata: platformMetadata,
        credentials: encryptedCredentials,
        webhookSecret: hashedSecret,
        artifactId: artifactRow.id
      })
      .returning();

    await tx
      .update(db.schema.artifact)
      .set({
        channelCount: sql`(${db.schema.artifact.channelCount}::int + 1)::int`
      })
      .where(eq(db.schema.artifact.id, artifactRow.id));

    if (currentValues.platform === utils.constants.CHANNEL_PLATFORM_TELEGRAM) {
      const webhookUrl = `${apiUrl}/channel/${channelRow.id}/webhook/telegram`;
      await registerTelegramWebhook(
        currentValues.credentials.botToken,
        webhookUrl,
        rawSecret
      );

      const prompts = await tx
        .select({
          title: db.schema.artifactPrompt.title,
          description: db.schema.artifactPrompt.description
        })
        .from(db.schema.artifactPrompt)
        .where(eq(db.schema.artifactPrompt.artifactId, artifactRow.id));

      await registerTelegramBotCommands(
        currentValues.credentials.botToken,
        prompts
      );
    }

    return channelRow;
  });

  const { credentials: _c, webhookSecret: _w, ...safe } = result;
  return c.json({
    ...safe,
    webhookUrl: buildWebhookUrl(result.id, result.platform)
  });
};

const update = async (c: Context<AppEnv>) => {
  const body = await c.req.json();
  const currentValues = await utils.Schema.CHANNEL_UPDATE.parseAsync({
    ...body,
    channelId: c.req.param('channelId'),
    projectId: c.req.param('projectId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId')
  });

  const dbInstance = db.create(c);
  const updates: Record<string, unknown> = {};

  if (currentValues.status) updates.status = currentValues.status;
  if (currentValues.config !== undefined) updates.config = currentValues.config;
  if (currentValues.credentials) {
    const encryptionKey = utils.getCredentialEncryptionKey(c);
    updates.credentials = utils.encryptString(
      JSON.stringify(currentValues.credentials),
      encryptionKey
    );
  }

  const [updated] = await dbInstance
    .update(db.schema.channel)
    .set(updates)
    .where(eq(db.schema.channel.id, currentValues.channelId))
    .returning();

  if (!updated) throw new Error('Channel not found');

  const { credentials: _c, webhookSecret: _w, ...safe } = updated;
  return c.json(safe);
};

const remove = async (c: Context<AppEnv>) => {
  const currentValues = await utils.Schema.CHANNEL_REMOVE.parseAsync({
    channelId: c.req.param('channelId'),
    projectId: c.req.param('projectId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId')
  });

  const dbInstance = db.create(c);

  await dbInstance.transaction(async tx => {
    const [channelRow] = await tx
      .select()
      .from(db.schema.channel)
      .where(eq(db.schema.channel.id, currentValues.channelId))
      .limit(1);

    if (!channelRow) throw new Error('Channel not found');

    await tx
      .delete(db.schema.channel)
      .where(eq(db.schema.channel.id, currentValues.channelId));

    await tx
      .update(db.schema.artifact)
      .set({
        channelCount: sql`(${db.schema.artifact.channelCount}::int - 1)::int`
      })
      .where(eq(db.schema.artifact.id, channelRow.artifactId));
  });

  return c.json(currentValues);
};

const listConversations = async (c: Context<AppEnv>) => {
  const currentValues =
    await utils.Schema.CHANNEL_LIST_CONVERSATIONS.parseAsync({
      channelId: c.req.param('channelId'),
      projectId: c.req.param('projectId'),
      userId: c.get('user').id,
      organizationId: c.req.param('organizationId')
    });

  const dbInstance = db.create(c);
  const rows = await dbInstance
    .select()
    .from(db.schema.channelConversation)
    .where(eq(db.schema.channelConversation.channelId, currentValues.channelId))
    .orderBy(desc(db.schema.channelConversation.lastMessageAt));

  return c.json(rows);
};

const listMessages = async (c: Context<AppEnv>) => {
  const currentValues = await utils.Schema.CHANNEL_LIST_MESSAGES.parseAsync({
    channelId: c.req.param('channelId'),
    conversationId: c.req.param('conversationId'),
    projectId: c.req.param('projectId'),
    userId: c.get('user').id,
    organizationId: c.req.param('organizationId')
  });

  const dbInstance = db.create(c);

  const messages = await dbInstance.query.channelMessage.findMany({
    where: eq(
      db.schema.channelMessage.conversationId,
      currentValues.conversationId
    ),
    orderBy: desc(db.schema.channelMessage.createdAt),
    with: {
      participant: true,
      usages: true
    }
  });

  return c.json(messages);
};

const webhook = async (c: Context<AppEnv>) => {
  const platform = c.req.param('platform');
  if (platform === utils.constants.CHANNEL_PLATFORM_TELEGRAM) {
    return handleTelegramWebhook(c);
  }
  return c.json({ error: `Unsupported platform: ${platform}` }, 400);
};

const buildWebhookUrl = (channelId: string, platform: string) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  return `${apiUrl}/channel/${channelId}/webhook/${platform}`;
};

export const ChannelController = {
  list,
  create,
  update,
  remove,
  listConversations,
  listMessages,
  webhook
};
