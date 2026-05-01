import { constants } from './constants';

export const isEmbeddableMimeType = (mimeType: string): boolean =>
  (constants.EMBEDDABLE_MIME_TYPES as readonly string[]).includes(mimeType);
