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
  jsonSchemaToZodShape,
  validateMessageVariables,
  formatRelative
};

export type { JsonSchema };
