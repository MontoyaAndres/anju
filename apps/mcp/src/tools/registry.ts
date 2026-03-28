import { greeting } from './greeting';
import {
  sendEmail as gmailSendEmail,
  listEmails as gmailListEmails,
  readEmail as gmailReadEmail,
  searchEmails as gmailSearchEmails,
  listLabels as gmailListLabels,
  modifyLabels as gmailModifyLabels,
  deleteEmail as gmailDeleteEmail,
  createDraft as gmailCreateDraft
} from './gmail';

// types
import { ToolDefinition } from './types';

export const toolRegistry = new Map<string, ToolDefinition>([
  ['greeting', greeting],
  ['gmail-send-email', gmailSendEmail],
  ['gmail-list-emails', gmailListEmails],
  ['gmail-read-email', gmailReadEmail],
  ['gmail-search-emails', gmailSearchEmails],
  ['gmail-list-labels', gmailListLabels],
  ['gmail-modify-labels', gmailModifyLabels],
  ['gmail-delete-email', gmailDeleteEmail],
  ['gmail-create-draft', gmailCreateDraft]
]);
