// Wire protocol shared between the worker (which constructs the request) and
// the resource-handler container (which parses it and calls the Gmail API).
//
// The worker sends a multipart/form-data POST with one `metadata` field (JSON
// matching GmailSendRequest) and zero-or-more `attachment` fields (binary
// files). Encoding the multipart MIME body and base64-ing attachments happens
// in the container, where memory isn't capped at 128MB.

export type GmailOperation =
  | 'send-email'
  | 'reply-email'
  | 'create-draft'
  | 'update-draft';

export interface GmailSendRequest {
  accessToken: string;
  operation: GmailOperation;
  to: string;
  body: string;
  subject?: string;
  cc?: string;
  bcc?: string;
  contentType?: 'text/html' | 'text/plain';
  inReplyTo?: string;
  references?: string;
  threadId?: string;
  draftId?: string;
}

export interface GmailSendResponse {
  id: string;
  threadId?: string;
  message?: { id: string; threadId?: string };
}
