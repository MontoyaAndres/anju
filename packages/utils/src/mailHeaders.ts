import { utf8ToBase64 } from './base64';

const ASCII_ONLY = /^[\x00-\x7F]*$/;

export const sanitizeMailHeader = (value: string): string =>
  value.replace(/[\r\n]+/g, ' ').trim();

export const encodeRfc2047 = (value: string): string =>
  ASCII_ONLY.test(value) ? value : `=?UTF-8?B?${utf8ToBase64(value)}?=`;

export const formatMailHeader = (value: string): string =>
  encodeRfc2047(sanitizeMailHeader(value));
