import { Schema } from './schema';
import { getEnv } from './getEnv';
import { fetcher } from './fetcher';
import { constants } from './constants';
import { hashObject } from './hashObject';
import { handleError } from './errorHandler';
import {
  encryptString,
  decryptString,
  getCredentialEncryptionKey,
  sha256Hex,
  timingSafeEqual
} from './crypto';
import { validateMessageVariables } from './validateMessageVariables';
import { JsonSchema, jsonSchemaToZodShape } from './jsonSchemaToZodShape';

export const utils = {
  Schema,
  getEnv,
  fetcher,
  constants,
  hashObject,
  handleError,
  encryptString,
  decryptString,
  getCredentialEncryptionKey,
  sha256Hex,
  timingSafeEqual,
  jsonSchemaToZodShape,
  validateMessageVariables
};

export type { JsonSchema };
export type { HandleErrorOptions, HandleErrorResult } from './errorHandler';
