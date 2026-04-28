import { greeting } from './greeting';
import {
  sendEmail as gmailSendEmail,
  replyEmail as gmailReplyEmail,
  forwardEmail as gmailForwardEmail,
  listEmails as gmailListEmails,
  readEmail as gmailReadEmail,
  trashEmail as gmailTrashEmail,
  listLabels as gmailListLabels,
  modifyLabels as gmailModifyLabels,
  batchModifyLabels as gmailBatchModifyLabels,
  listThreads as gmailListThreads,
  getThread as gmailGetThread,
  createDraft as gmailCreateDraft,
  listDrafts as gmailListDrafts,
  getDraft as gmailGetDraft,
  updateDraft as gmailUpdateDraft,
  deleteDraft as gmailDeleteDraft,
  sendDraft as gmailSendDraft,
  getProfile as gmailGetProfile
} from './gmail';
import {
  listResources,
  readResource,
  sendResource,
  searchResources
} from './resources';

// types
import { ToolDefinition } from './types';

export const toolRegistry = new Map<string, ToolDefinition>([
  ['greeting', greeting],
  ['list-resources', listResources],
  ['read-resource', readResource],
  ['send-resource', sendResource],
  ['search-resources', searchResources],
  ['gmail-send-email', gmailSendEmail],
  ['gmail-reply-email', gmailReplyEmail],
  ['gmail-forward-email', gmailForwardEmail],
  ['gmail-list-emails', gmailListEmails],
  ['gmail-read-email', gmailReadEmail],
  ['gmail-trash-email', gmailTrashEmail],
  ['gmail-list-labels', gmailListLabels],
  ['gmail-modify-labels', gmailModifyLabels],
  ['gmail-batch-modify-labels', gmailBatchModifyLabels],
  ['gmail-list-threads', gmailListThreads],
  ['gmail-get-thread', gmailGetThread],
  ['gmail-create-draft', gmailCreateDraft],
  ['gmail-list-drafts', gmailListDrafts],
  ['gmail-get-draft', gmailGetDraft],
  ['gmail-update-draft', gmailUpdateDraft],
  ['gmail-delete-draft', gmailDeleteDraft],
  ['gmail-send-draft', gmailSendDraft],
  ['gmail-get-profile', gmailGetProfile]
]);
