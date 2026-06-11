// Wire protocol shared between the worker (which constructs the request) and the
// resource-handler container (which parses it and calls the Discord API). The
// worker sends a multipart/form-data POST with one `metadata` field (JSON
// matching DiscordSendRequest) and exactly one `file` field (binary). Discord
// uploads a file by posting a `payload_json` + `files[0]` multipart to
// POST /channels/{channelId}/messages.

export interface DiscordSendRequest {
  botToken: string;
  // Discord channel id (a DM channel or a guild text channel) — Discord replies
  // are posted into the same channel the message arrived in.
  channelId: string;
  // Optional message id to reply to (Discord message_reference).
  replyToMessageId?: string;
  // Text posted alongside the file (Discord has no separate "caption" — it's the
  // message content, capped at 2000 chars by the caller).
  content?: string;
}

export interface DiscordSendResponse {
  ok: boolean;
  id?: string;
  error?: string;
}

// Wire protocol for sending a PROXIED (remote MCP) resource as a Discord file.
// Mirrors TelegramSendRemoteResourceRequest / SlackSendRemoteResourceRequest:
// the worker sends only the remote connection details + resolved auth header as
// JSON, and the resource-handler container does the remote read + decode + upload
// itself — so a large file's bytes never transit the 128 MiB worker.
export interface DiscordSendRemoteResourceRequest {
  discord: DiscordSendRequest;
  remote: {
    url: string;
    transport: string;
    // Single header injected on the remote MCP connection (e.g. Authorization).
    authHeader?: { name: string; value: string } | null;
    uri: string;
    timeoutMs: number;
  };
}
