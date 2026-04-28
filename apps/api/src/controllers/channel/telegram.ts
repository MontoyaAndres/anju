import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { db, utils as dbUtils } from '@anju/db';
import { utils } from '@anju/utils';

import { runChannelTurn } from './runner';
import { markdownToTelegramHtml } from '../../utils';

import type { ChannelAttachment } from './runner';
import type { AppEnv } from '../../types';

interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
  user?: { id: number };
  url?: string;
}

interface TelegramIncomingMessage {
  message_id: number;
  from: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  chat: { id: number; type: string; title?: string };
  text?: string;
  date: number;
  entities?: TelegramMessageEntity[];
  reply_to_message?: { from?: { id: number; is_bot?: boolean } };
}

interface TelegramUpdate {
  message?: TelegramIncomingMessage;
}

export interface TelegramBotInfo {
  id: number;
  isBot: boolean;
  firstName: string;
  username?: string;
  canJoinGroups?: boolean;
  canReadAllGroupMessages?: boolean;
  supportsInlineQueries?: boolean;
}

export const handleTelegramWebhook = async (c: Context<AppEnv>) => {
  const channelId = c.req.param('channelId');
  if (!channelId) throw new Error('Missing channelId');

  const dbInstance = db.create(c);
  const [channelRow] = await dbInstance
    .select()
    .from(db.schema.channel)
    .where(eq(db.schema.channel.id, channelId))
    .limit(1);

  if (!channelRow) return c.json({ ok: false }, 404);
  if (channelRow.platform !== utils.constants.CHANNEL_PLATFORM_TELEGRAM) {
    return c.json({ ok: false, error: 'Wrong platform' }, 400);
  }
  if (channelRow.status !== utils.constants.STATUS_ACTIVE) {
    return c.json({ ok: true, skipped: 'disabled' });
  }

  const providedSecret = c.req.header(utils.constants.TELEGRAM_SECRET_HEADER);
  if (!providedSecret) {
    return c.json({ ok: false, error: 'Invalid signature' }, 401);
  }
  const providedHash = await utils.sha256Hex(providedSecret);
  if (!utils.timingSafeEqual(providedHash, channelRow.webhookSecret)) {
    return c.json({ ok: false, error: 'Invalid signature' }, 401);
  }

  const update: TelegramUpdate = await c.req.json();
  const message = update.message;
  if (!message?.text || !message.chat) {
    return c.json({ ok: true });
  }

  const encryptionKey = utils.getCredentialEncryptionKey(c);
  const credentials = JSON.parse(
    utils.decryptString(channelRow.credentials, encryptionKey)
  ) as { botToken: string };

  const botMeta =
    (channelRow.metadata as { telegram?: { bot?: TelegramBotInfo } } | null)
      ?.telegram?.bot || null;

  if (
    message.chat.type !== utils.constants.CHANNEL_CONVERSATION_SCOPE_PRIVATE &&
    !messageAddressesBot(message, botMeta)
  ) {
    return c.json({ ok: true });
  }

  const displayName = [message.from.first_name, message.from.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  const participantLabel =
    displayName ||
    (message.from.username ? `@${message.from.username}` : null) ||
    `user-${message.from.id}`;
  const conversationTitle =
    message.chat.title ||
    (message.chat.type === utils.constants.CHANNEL_CONVERSATION_SCOPE_PRIVATE
      ? `DM · ${participantLabel}`
      : `${message.chat.type} · ${message.chat.id}`);

  const cleanText = stripBotMention(message.text, botMeta?.username);

  const slashCommand = parseSlashCommand(message, botMeta?.username);
  const promptMatch = slashCommand
    ? await resolveSlashPrompt(c, channelRow.artifactId, slashCommand)
    : null;

  await sendChatAction(credentials.botToken, message.chat.id, 'typing');

  let replyText: string;
  let attachments: ChannelAttachment[] = [];
  try {
    const result = await runChannelTurn(c, {
      channelId: channelRow.id,
      externalConversationId: String(message.chat.id),
      conversationTitle,
      conversationScope: message.chat.type,
      externalParticipantId: String(message.from.id),
      participantDisplayName: displayName || message.from.username || null,
      participantMetadata: {
        username: message.from.username,
        languageCode: message.from.language_code
      },
      externalMessageId: String(message.message_id),
      userText: cleanText,
      promptId: promptMatch?.promptId || null,
      promptArgs: promptMatch?.args || undefined
    });
    replyText = result.assistantText;
    attachments = result.attachments;
  } catch (err: any) {
    const { refId } = await dbUtils.handleError(c, err, {
      service: utils.constants.SERVICE_NAME_API,
      metadata: {
        source: 'channel-runner',
        platform: utils.constants.CHANNEL_PLATFORM_TELEGRAM,
        channelId: channelRow.id,
        chatId: message.chat.id,
        chatType: message.chat.type,
        messageId: message.message_id
      }
    });
    replyText = `Sorry, something went wrong while processing your message (ref: ${refId}). The team has been notified.`;
  }

  for (const chunk of chunkMessage(replyText)) {
    await sendTelegramMessage(
      credentials.botToken,
      message.chat.id,
      message.message_id,
      chunk
    );
  }

  for (const attachment of attachments) {
    await sendTelegramAttachment(
      credentials.botToken,
      message.chat.id,
      message.message_id,
      attachment,
      c.env.STORAGE_BUCKET
    ).catch(err =>
      dbUtils.handleError(c, err, {
        service: utils.constants.SERVICE_NAME_API,
        metadata: {
          source: 'sendTelegramAttachment',
          channelId: channelRow.id,
          chatId: message.chat.id,
          messageId: message.message_id,
          resourceId: attachment.resource.id
        }
      })
    );
  }

  return c.json({ ok: true });
};

const sendTelegramMessage = async (
  botToken: string,
  chatId: number,
  replyToMessageId: number,
  markdown: string
) => {
  const html = markdownToTelegramHtml(markdown);
  const send = async (body: Record<string, unknown>) =>
    fetch(`${utils.constants.TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

  const response = await send({
    chat_id: chatId,
    text: html,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    reply_to_message_id: replyToMessageId
  });

  if (!response.ok) {
    await send({
      chat_id: chatId,
      text: markdown,
      reply_to_message_id: replyToMessageId
    });
  }
};

const sendTelegramAttachment = async (
  botToken: string,
  chatId: number,
  replyToMessageId: number,
  attachment: ChannelAttachment,
  bucket: {
    get: (
      key: string
    ) => Promise<{ arrayBuffer: () => Promise<ArrayBuffer> } | null>;
  }
) => {
  const { resource, caption } = attachment;
  const mime = resource.mimeType || 'application/octet-stream';

  let method: 'sendPhoto' | 'sendVideo' | 'sendAudio' | 'sendDocument';
  let field: 'photo' | 'video' | 'audio' | 'document';
  if (mime.startsWith('image/')) {
    method = 'sendPhoto';
    field = 'photo';
  } else if (mime.startsWith('video/')) {
    method = 'sendVideo';
    field = 'video';
  } else if (mime.startsWith('audio/')) {
    method = 'sendAudio';
    field = 'audio';
  } else {
    method = 'sendDocument';
    field = 'document';
  }

  let bytes: ArrayBuffer;
  let filename: string;
  if (resource.fileKey) {
    const object = await bucket.get(resource.fileKey);
    if (!object) {
      throw new Error(
        `Resource file not found in storage: ${resource.fileKey}`
      );
    }
    bytes = await object.arrayBuffer();
    filename = resource.fileName || resource.title || 'file';
  } else if (resource.content != null) {
    bytes = new TextEncoder().encode(resource.content).buffer as ArrayBuffer;
    const base = resource.fileName || resource.title || 'file';
    filename = /\.[a-z0-9]+$/i.test(base) ? base : `${base}.txt`;
  } else {
    throw new Error(`Resource has no content or fileKey: ${resource.uri}`);
  }

  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('reply_to_message_id', String(replyToMessageId));
  if (caption) {
    form.append('caption', markdownToTelegramHtml(caption).slice(0, 1024));
    form.append('parse_mode', 'HTML');
  }
  form.append(field, new Blob([bytes], { type: mime }), filename);

  const response = await fetch(
    `${utils.constants.TELEGRAM_API_BASE}/bot${botToken}/${method}`,
    { method: 'POST', body: form }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Telegram ${method} failed: ${response.status} ${body}`);
  }
};

const sendChatAction = async (
  botToken: string,
  chatId: number,
  action: 'typing'
) => {
  await fetch(
    `${utils.constants.TELEGRAM_API_BASE}/bot${botToken}/sendChatAction`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action })
    }
  ).catch(() => undefined);
};

interface ParsedSlashCommand {
  name: string;
  trailingText: string;
}

const parseSlashCommand = (
  message: TelegramIncomingMessage,
  botUsername: string | undefined
): ParsedSlashCommand | null => {
  const text = message.text || '';
  const entities = message.entities || [];
  const cmdEntity = entities.find(
    e => e.type === 'bot_command' && e.offset === 0
  );
  if (!cmdEntity) return null;

  const raw = text.slice(cmdEntity.offset, cmdEntity.offset + cmdEntity.length);
  if (!raw.startsWith('/')) return null;

  let name = raw.slice(1);
  const atIndex = name.indexOf('@');
  if (atIndex !== -1) {
    const target = name.slice(atIndex + 1);
    if (botUsername && target.toLowerCase() !== botUsername.toLowerCase()) {
      return null;
    }
    name = name.slice(0, atIndex);
  }

  const trailingText = text.slice(cmdEntity.offset + cmdEntity.length).trim();
  return { name: name.toLowerCase(), trailingText };
};

const resolveSlashPrompt = async (
  c: Context<AppEnv>,
  artifactId: string,
  command: ParsedSlashCommand
): Promise<{ promptId: string; args: Record<string, string> } | null> => {
  const dbInstance = db.create(c);
  const prompts = await dbInstance
    .select()
    .from(db.schema.artifactPrompt)
    .where(eq(db.schema.artifactPrompt.artifactId, artifactId));

  const match = prompts.find(
    p => utils.slugifyPromptTitle(p.title) === command.name
  );
  if (!match) return null;

  const schema = match.schema as {
    properties?: Record<string, { type: string }>;
  } | null;
  const args: Record<string, string> = {};
  const firstProp = schema?.properties
    ? Object.keys(schema.properties)[0]
    : null;
  if (firstProp && command.trailingText) {
    args[firstProp] = command.trailingText;
  }

  return { promptId: match.id, args };
};

const messageAddressesBot = (
  message: TelegramIncomingMessage,
  bot: TelegramBotInfo | null
): boolean => {
  if (!bot) return true;

  if (message.reply_to_message?.from?.id === bot.id) return true;

  const text = message.text || '';
  const entities = message.entities || [];

  for (const entity of entities) {
    if (entity.type === 'mention') {
      const mention = text.slice(entity.offset, entity.offset + entity.length);
      if (
        bot.username &&
        mention.toLowerCase() === `@${bot.username.toLowerCase()}`
      ) {
        return true;
      }
    }

    if (entity.type === 'text_mention' && entity.user?.id === bot.id) {
      return true;
    }

    if (entity.type === 'text_link' && entity.url && bot.username) {
      const match = entity.url.toLowerCase().match(/t\.me\/([a-z0-9_]+)/);
      if (match && match[1] === bot.username.toLowerCase()) {
        return true;
      }
    }

    if (entity.type === 'bot_command' && bot.username) {
      const raw = text.slice(entity.offset, entity.offset + entity.length);
      const atIndex = raw.indexOf('@');
      if (
        atIndex !== -1 &&
        raw.slice(atIndex + 1).toLowerCase() === bot.username.toLowerCase()
      ) {
        return true;
      }
    }
  }

  return false;
};

const stripBotMention = (text: string, botUsername?: string): string => {
  if (!botUsername) return text;
  const pattern = new RegExp(`@${botUsername}\\b`, 'gi');
  return text.replace(pattern, '').replace(/\s+/g, ' ').trim();
};

const chunkMessage = (text: string): string[] => {
  if (!text) return ['...'];
  if (text.length <= utils.constants.TELEGRAM_MESSAGE_LIMIT) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > utils.constants.TELEGRAM_MESSAGE_LIMIT) {
    let cut = remaining.lastIndexOf(
      '\n\n',
      utils.constants.TELEGRAM_MESSAGE_LIMIT
    );
    if (cut < utils.constants.TELEGRAM_MESSAGE_LIMIT / 2) {
      cut = remaining.lastIndexOf('\n', utils.constants.TELEGRAM_MESSAGE_LIMIT);
    }
    if (cut < utils.constants.TELEGRAM_MESSAGE_LIMIT / 2) {
      cut = remaining.lastIndexOf(' ', utils.constants.TELEGRAM_MESSAGE_LIMIT);
    }
    if (cut <= 0) cut = utils.constants.TELEGRAM_MESSAGE_LIMIT;

    chunks.push(remaining.slice(0, cut).trimEnd());
    remaining = remaining.slice(cut).trimStart();
  }

  if (remaining.length) chunks.push(remaining);
  return chunks;
};

export const registerTelegramBotCommands = async (
  botToken: string,
  prompts: Array<{ title: string; description: string | null }>
) => {
  const commands = prompts
    .map(p => ({
      command: slugifyPromptTitle(p.title).slice(0, 32),
      description: (p.description || p.title).slice(0, 256)
    }))
    .filter(c => /^[a-z][a-z0-9_]*$/.test(c.command))
    .slice(0, 100);

  await fetch(
    `${utils.constants.TELEGRAM_API_BASE}/bot${botToken}/setMyCommands`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands })
    }
  ).catch(() => undefined);
};

export const registerTelegramWebhook = async (
  botToken: string,
  webhookUrl: string,
  secret: string
) => {
  const response = await fetch(
    `${utils.constants.TELEGRAM_API_BASE}/bot${botToken}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret,
        allowed_updates: ['message']
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram setWebhook failed: ${error}`);
  }
};

export const getTelegramBotInfo = async (
  botToken: string
): Promise<TelegramBotInfo> => {
  const response = await fetch(
    `${utils.constants.TELEGRAM_API_BASE}/bot${botToken}/getMe`
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram getMe failed: ${error}`);
  }
  const data: any = await response.json();
  const bot = data.result;
  return {
    id: bot.id,
    isBot: bot.is_bot,
    firstName: bot.first_name,
    username: bot.username,
    canJoinGroups: bot.can_join_groups,
    canReadAllGroupMessages: bot.can_read_all_group_messages,
    supportsInlineQueries: bot.supports_inline_queries
  };
};
