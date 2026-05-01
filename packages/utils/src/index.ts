import { Schema } from './schema';
import { getEnv } from './getEnv';
import type { EnvSource } from './getEnv';
import { fetcher } from './fetcher';
import { constants } from './constants';
import { hashObject } from './hashObject';
import {
  encryptString,
  decryptString,
  getCredentialEncryptionKey,
  sha256Hex,
  timingSafeEqual
} from './crypto';
import {
  bytesToBase64,
  base64ToBytes,
  utf8ToBase64,
  base64ToUtf8,
  toBase64Url,
  fromBase64Url,
  utf8ToBase64Url,
  base64UrlToUtf8
} from './base64';
import {
  sanitizeMailHeader,
  encodeRfc2047,
  formatMailHeader
} from './mailHeaders';
import {
  buildMimeMessage,
  sanitizeFilename,
  formatFilenameHeader,
  chunkBase64
} from './mimeMessage';
import type {
  MimeAttachment,
  MimeMessageInput
} from './mimeMessage';
import { parseHttpErrorMessage } from './parseHttpError';
import { toStringArray } from './coerce';
import { validateMessageVariables } from './validateMessageVariables';
import { JsonSchema, jsonSchemaToZodShape } from './jsonSchemaToZodShape';
import { formatRelative } from './formatRelative';
import { slugifyPromptTitle } from './slugifyPromptTitle';
import {
  decodeEntities,
  parseOpenXmlProps,
  stripBase64Images,
  sanitizeMetadataString,
  serializeMetadataValue
} from './sanitize';
import {
  chunkText,
  splitRecursive,
  buildHeader,
  prepareChunks
} from './chunking';
import type { Separator, ChunkMetadata, PreparedChunk } from './chunking';
import { isEmbeddableMimeType } from './embeddable';
import type {
  ExtractedDocument,
  ExtractedDocumentMetadata,
  ExtractedDocumentSource
} from './extractedDocument';

export const utils = {
  Schema,
  getEnv,
  fetcher,
  constants,
  hashObject,
  encryptString,
  decryptString,
  getCredentialEncryptionKey,
  sha256Hex,
  timingSafeEqual,
  bytesToBase64,
  base64ToBytes,
  utf8ToBase64,
  base64ToUtf8,
  toBase64Url,
  fromBase64Url,
  utf8ToBase64Url,
  base64UrlToUtf8,
  sanitizeMailHeader,
  encodeRfc2047,
  formatMailHeader,
  buildMimeMessage,
  sanitizeFilename,
  formatFilenameHeader,
  chunkBase64,
  parseHttpErrorMessage,
  toStringArray,
  jsonSchemaToZodShape,
  validateMessageVariables,
  formatRelative,
  slugifyPromptTitle,
  decodeEntities,
  parseOpenXmlProps,
  stripBase64Images,
  sanitizeMetadataString,
  serializeMetadataValue,
  chunkText,
  splitRecursive,
  buildHeader,
  prepareChunks,
  isEmbeddableMimeType
};

export type {
  JsonSchema,
  MimeAttachment,
  MimeMessageInput,
  EnvSource,
  Separator,
  ChunkMetadata,
  PreparedChunk,
  ExtractedDocument,
  ExtractedDocumentMetadata,
  ExtractedDocumentSource
};
