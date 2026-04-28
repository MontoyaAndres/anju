import { Schema } from './schema';
import { getEnv } from './getEnv';
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
import { parseHttpErrorMessage } from './parseHttpError';
import { toStringArray } from './coerce';
import { validateMessageVariables } from './validateMessageVariables';
import { JsonSchema, jsonSchemaToZodShape } from './jsonSchemaToZodShape';
import { formatRelative } from './formatRelative';

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
  parseHttpErrorMessage,
  toStringArray,
  jsonSchemaToZodShape,
  validateMessageVariables,
  formatRelative
};

export type { JsonSchema };
