import { create, schema } from './lib';
import { handleError } from './utils';

export const db = {
  create,
  schema
};
export const utils = {
  handleError
};

export type { Database } from './lib';
