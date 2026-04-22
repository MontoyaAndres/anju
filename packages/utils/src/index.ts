import { Schema } from './schema';
import { fetcher } from './fetcher';
import { constants } from './constants';
import { hashObject } from './hashObject';
import { createErrorHandler } from './errorHandler';
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
  fetcher,
  constants,
  hashObject,
  createErrorHandler,
  encryptString,
  decryptString,
  getCredentialEncryptionKey,
  sha256Hex,
  timingSafeEqual,
  jsonSchemaToZodShape,
  validateMessageVariables
};

export type { JsonSchema };
export type {
  ErrorLogPayload,
  CreateErrorHandlerOptions
} from './errorHandler';
