import { utils } from '@anju/utils';

const extractPdf = async (buffer: ArrayBuffer): Promise<string> => {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join('\n') : (text as string);
};

const extractDocx = async (buffer: ArrayBuffer): Promise<string> => {
  const mammoth: any = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return result?.value || '';
};

const extractXlsx = async (buffer: ArrayBuffer): Promise<string> => {
  const XLSX: any = await import('xlsx');
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  const parts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName], {
      blankrows: false
    });
    if (csv.trim()) parts.push(`# ${sheetName}\n${csv}`);
  }
  return parts.join('\n\n');
};

const decodeEntities = (value: string): string =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const extractPptx = async (buffer: ArrayBuffer): Promise<string> => {
  const { unzipSync, strFromU8 } = await import('fflate');
  const entries = unzipSync(new Uint8Array(buffer));
  const slideNames = Object.keys(entries)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const ai = Number(a.match(/slide(\d+)\.xml$/)?.[1] || 0);
      const bi = Number(b.match(/slide(\d+)\.xml$/)?.[1] || 0);
      return ai - bi;
    });

  const slides: string[] = [];
  for (const name of slideNames) {
    const xml = strFromU8(entries[name]);
    const matches = xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [];
    const slideText = matches
      .map(m => decodeEntities(m.replace(/<a:t[^>]*>|<\/a:t>/g, '')))
      .join(' ')
      .trim();
    if (slideText) slides.push(slideText);
  }
  return slides.join('\n\n');
};

export const extractTextFromFile = async (
  file: File
): Promise<string | null> => {
  const mimeType = file.type;
  if (
    !(utils.constants.EMBEDDABLE_MIME_TYPES as readonly string[]).includes(
      mimeType
    )
  ) {
    return null;
  }

  try {
    if (
      (utils.constants.TEXT_MIME_TYPES as readonly string[]).includes(mimeType)
    ) {
      return await file.text();
    }

    const buffer = await file.arrayBuffer();

    switch (mimeType) {
      case utils.constants.MIMETYPE_APPLICATION_PDF:
        return (await extractPdf(buffer)) || null;
      case utils.constants
        .MIMETYPE_APPLICATION_VND_OPENXMLFORMATS_OFFICEDOCUMENT_WORDPROCESSINGML_DOCUMENT:
      case utils.constants.MIMETYPE_APPLICATION_MSWORD:
        return (await extractDocx(buffer)) || null;
      case utils.constants
        .MIMETYPE_APPLICATION_VND_OPENXMLFORMATS_OFFICEDOCUMENT_SPREADSHEETML_SHEET:
      case utils.constants.MIMETYPE_APPLICATION_VND_MS_EXCEL:
        return (await extractXlsx(buffer)) || null;
      case utils.constants
        .MIMETYPE_APPLICATION_VND_OPENXMLFORMATS_OFFICEDOCUMENT_PRESENTATIONML_PRESENTATION:
        return (await extractPptx(buffer)) || null;
      default:
        return null;
    }
  } catch (error) {
    console.error('Failed to extract text from resource', {
      mimeType,
      error: error instanceof Error ? error.message : error
    });
    return null;
  }
};
