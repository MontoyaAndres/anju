import crypto from 'crypto';

export const hashObject = (obj: Object): string => {
  return crypto
    .createHash('md5')
    .update(JSON.stringify(obj))
    .digest('hex')
    .substring(0, 8);
};
