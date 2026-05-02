// Wire protocol shared between the worker (which constructs the request) and
// the resource-handler container (which parses it and calls the Telegram Bot
// API). Worker sends a multipart/form-data POST with one `metadata` field
// (JSON matching TelegramSendRequest) and exactly one `file` field (binary).
//
// Telegram supports one media object per send call, so unlike Gmail this is
// always a single attachment.

export interface TelegramSendRequest {
  botToken: string;
  chatId: number;
  replyToMessageId?: number;
  caption?: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export interface TelegramSendResponse {
  ok: boolean;
  result?: { message_id: number };
  description?: string;
}
