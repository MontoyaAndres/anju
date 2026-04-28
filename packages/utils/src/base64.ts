export const bytesToBase64 = (bytes: Uint8Array): string => {
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

export const utf8ToBase64 = (value: string): string =>
  bytesToBase64(new TextEncoder().encode(value));

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
