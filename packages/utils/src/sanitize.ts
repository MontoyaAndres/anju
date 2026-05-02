import { constants } from './constants';

export const decodeEntities = (value: string): string =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

export const parseOpenXmlProps = (xml: string): Record<string, string> => {
  const out: Record<string, string> = {};
  const re =
    /<(?:[A-Za-z][\w-]*:)?([A-Za-z][\w-]*)(?:\s[^>]*)?>([^<]*)<\/(?:[A-Za-z][\w-]*:)?\1>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    const value = decodeEntities(match[2]).trim();
    if (value) out[match[1]] = value;
  }
  return out;
};

export const stripBase64Images = (text: string): string =>
  text
    .replace(/<img\b[^>]*\bsrc=["']?data:image\/[^>]*>/gi, '')
    .replace(/!\[[^\]]*\]\(\s*data:image\/[^)]*\)/g, '')
    .replace(constants.BASE64_DATA_URI_RE, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const sanitizeMetadataString = (value: string): string =>
  value
    .replace(constants.BASE64_DATA_URI_RE, '')
    .replace(constants.RAW_BASE64_BLOB_RE, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim();

export const serializeMetadataValue = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const cleaned = sanitizeMetadataString(value);
    return cleaned || undefined;
  }
  if (Array.isArray(value)) return value.map(serializeMetadataValue);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const serialized = serializeMetadataValue(v);
      if (serialized !== undefined) out[k] = serialized;
    }
    return out;
  }
  return value;
};
