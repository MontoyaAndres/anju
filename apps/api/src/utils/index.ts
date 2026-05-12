import { createAuth } from './better-auth';
import { oauthState } from './oauthState';
import { providers } from './providers';
import { getLlmAdapter } from './llm';
import { createMcpClient } from './mcpClient';
import {
  generateEmbedding,
  generateEmbeddings,
  reindexResourceChunks
} from './embedding';
import { markdownToTelegramHtml } from './telegramFormat';
import {
  enqueueIndex,
  enqueueCrawlDiscover,
  enqueueGdriveDiscover,
  enqueueGdriveFile
} from './queue';
import {
  getDriveAccessToken,
  getDriveFile,
  listDriveFolderChildren,
  downloadDriveFile,
  driveUri,
  isFolderMime,
  buildDriveResourceMetadata
} from './googleDrive';

export {
  createAuth,
  oauthState,
  providers,
  getLlmAdapter,
  createMcpClient,
  generateEmbedding,
  generateEmbeddings,
  reindexResourceChunks,
  markdownToTelegramHtml,
  enqueueIndex,
  enqueueCrawlDiscover,
  enqueueGdriveDiscover,
  enqueueGdriveFile,
  getDriveAccessToken,
  getDriveFile,
  listDriveFolderChildren,
  downloadDriveFile,
  driveUri,
  isFolderMime,
  buildDriveResourceMetadata
};

export type { McpClientHandle } from './mcpClient';
export type { Auth } from './better-auth';
export type { OAuthProviderConfig } from './providers';
export type {
  LlmAdapter,
  LlmAdapterInput,
  LlmCompletion,
  LlmMessage,
  LlmToolCall,
  LlmToolDefinition,
  LlmStopReason,
  LlmUsage
} from './llm';
