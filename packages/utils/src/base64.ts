// Both Cloudflare Workers (with nodejs_compat) and the Node container expose
// the global Buffer; only pure browsers don't. When available it's an order
// of magnitude faster than the btoa/charCode loop, which matters once payloads
// reach tens of megabytes (e.g. a Gmail attachment).
declare const Buffer:
  | { from(input: Uint8Array | string, encoding?: string): { toString(encoding: string): string } }
  | undefined;

const HAS_BUFFER = typeof Buffer !== 'undefined';

export const bytesToBase64 = (bytes: Uint8Array): string => {
  if (HAS_BUFFER) return Buffer!.from(bytes).toString('base64');
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

export const base64ToBytes = (b64: string): Uint8Array => {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
};

export const utf8ToBase64 = (value: string): string => {
  if (HAS_BUFFER) return Buffer!.from(value, 'utf8').toString('base64');
  return bytesToBase64(new TextEncoder().encode(value));
};

export const base64ToUtf8 = (b64: string): string =>
  new TextDecoder().decode(base64ToBytes(b64));

export const toBase64Url = (b64: string): string =>
  b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const fromBase64Url = (b64url: string): string => {
  const standard = b64url.replace(/-/g, '+').replace(/_/g, '/');
  return standard.padEnd(Math.ceil(standard.length / 4) * 4, '=');
};

export const utf8ToBase64Url = (value: string): string => toBase64Url(utf8ToBase64(value));

export const base64UrlToUtf8 = (b64url: string): string =>
  base64ToUtf8(fromBase64Url(b64url));
