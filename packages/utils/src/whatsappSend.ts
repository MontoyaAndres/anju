// Wire protocol shared between the worker (which constructs the request) and
// the resource-handler container (which parses it and calls the WhatsApp Cloud
// API). Worker sends a multipart/form-data POST with one `metadata` field
// (JSON matching WhatsappSendRequest) and exactly one `file` field (binary).
//
// The Cloud API can't send raw bytes inline: the container first uploads the
// file to `/<phoneNumberId>/media` to obtain a media id, then sends a message
// of the matching type (image/video/audio/document) referencing that id. One
// media object per send call.

export interface WhatsappSendRequest {
  accessToken: string;
  phoneNumberId: string;
  // The recipient's WhatsApp id (their phone number in international format,
  // digits only) — the inbound message's `from` / contact `wa_id`.
  to: string;
  // Quote the user's message so the file reads as a reply (context.message_id).
  replyToMessageId?: string;
  // Caption rendered with the media (image/video/document only; ignored for
  // audio, which the Cloud API sends without a caption).
  caption?: string;
}

export interface WhatsappSendResponse {
  messaging_product?: string;
  messages?: Array<{ id: string }>;
  error?: { message?: string; code?: number };
}

// Wire protocol for sending a PROXIED (remote MCP) resource as a file. Unlike
// WhatsappSendRequest (where the worker has already read the bytes and posts
// them as multipart), here the worker sends only the connection details as JSON
// and the resource-handler container does the remote read + decode + upload +
// send itself — so a large file's bytes never transit the 128 MiB worker. The
// worker resolves the (small) auth header; the file itself stays in the
// container.
export interface WhatsappSendRemoteResourceRequest {
  whatsapp: WhatsappSendRequest;
  remote: {
    url: string;
    transport: string;
    // Single header injected on the remote MCP connection (e.g. Authorization).
    authHeader?: { name: string; value: string } | null;
    uri: string;
    timeoutMs: number;
  };
}
