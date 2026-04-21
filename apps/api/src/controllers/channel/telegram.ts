import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '@anju/db';
import { utils } from '@anju/utils';

import { runChannelTurn } from './runner';

import type { AppEnv } from '../../types';

const TELEGRAM_SECRET_HEADER = 'x-telegram-bot-api-secret-token';
const TELEGRAM_API_BASE = 'https://api.telegram.org';

interface TelegramUpdate {
  message?: {
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
  };
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
  if (channelRow.status !== utils.constants.CHANNEL_STATUS_ACTIVE) {
    return c.json({ ok: true, skipped: 'disabled' });
  }

  const providedSecret = c.req.header(TELEGRAM_SECRET_HEADER);
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

  const displayName = [message.from.first_name, message.from.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  const result = await runChannelTurn(c, {
    channelId: channelRow.id,
    externalConversationId: String(message.chat.id),
    conversationTitle: message.chat.title || null,
    externalParticipantId: String(message.from.id),
    participantDisplayName: displayName || message.from.username || null,
    participantMetadata: {
      username: message.from.username,
      languageCode: message.from.language_code
    },
    externalMessageId: String(message.message_id),
    userText: message.text
  });

  await fetch(
    `${TELEGRAM_API_BASE}/bot${credentials.botToken}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: message.chat.id,
        text: result.assistantText,
        reply_to_message_id: message.message_id
      })
    }
  );

  return c.json({ ok: true });
};

export const registerTelegramWebhook = async (
  botToken: string,
  webhookUrl: string,
  secret: string
) => {
  const response = await fetch(
    `${TELEGRAM_API_BASE}/bot${botToken}/setWebhook`,
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
