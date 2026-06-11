import { utils } from '@anju/utils';

// Name a forwarded (remote MCP) resource file: prefer the uri's last path
// segment, then give it an extension from its mime type so the chat shows a
// sensible filename. Shared by the Telegram / Slack / Discord remote-resource
// send handlers, which all deliver a proxied resource as a file.
export const filenameForResource = (uri: string, mimeType: string): string => {
  let base = uri;
  try {
    const segment = new URL(uri).pathname.split('/').filter(Boolean).pop();
    if (segment) base = decodeURIComponent(segment);
  } catch {
    base = uri.split(/[?#]/)[0].split('/').filter(Boolean).pop() || uri;
  }
  base = utils.sanitizeFilename(base).slice(0, 80);
  if (/\.[a-z0-9]+$/i.test(base)) return base;
  const ext =
    utils.constants.EXTENSION_BY_MIME[mimeType] ||
    (mimeType.startsWith('text/') ? 'txt' : 'bin');
  return `${base}.${ext}`;
};
