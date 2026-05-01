import { utils } from '@anju/utils';
import type {
  ExtractedDocument,
  ExtractedDocumentMetadata,
  ExtractedDocumentSource
} from '@anju/utils';

const {
  constants,
  decodeEntities,
  parseOpenXmlProps,
  serializeMetadataValue,
  stripBase64Images
} = utils;

const TEXT_MIME_TYPES = constants.TEXT_MIME_TYPES as readonly string[];

const extractPdf = async (
  buffer: ArrayBuffer,
  source: ExtractedDocumentSource
): Promise<ExtractedDocument[]> => {
  const { extractText, getDocumentProxy, getMeta } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text as string];

  let info: Record<string, unknown> | undefined;
  let pdfMetadata: Record<string, unknown> | null = null;
  try {
    const meta = await getMeta(pdf, { parseDates: true });
    info = serializeMetadataValue(meta?.info) as
      | Record<string, unknown>
      | undefined;
    const raw = meta?.metadata as
      | { [Symbol.iterator]?: () => Iterator<unknown> }
      | undefined;
    if (raw && typeof raw[Symbol.iterator] === 'function') {
      const collected: Record<string, unknown> = {};
      for (const entry of raw as Iterable<unknown>) {
        if (Array.isArray(entry) && entry.length === 2) {
          collected[String(entry[0])] = serializeMetadataValue(entry[1]);
        } else if (entry && typeof entry === 'object') {
          const obj = entry as { name?: string; value?: unknown };
          if (obj.name) collected[obj.name] = serializeMetadataValue(obj.value);
        }
      }
      if (Object.keys(collected).length > 0) pdfMetadata = collected;
    }
  } catch {
    // metadata is optional
  }

  const docs: ExtractedDocument[] = [];
  for (let i = 0; i < pages.length; i++) {
    const pageContent = (pages[i] || '').trim();
    if (!pageContent) continue;
    docs.push({
      pageContent,
      metadata: {
        loc: { pageNumber: i + 1, totalPages },
        source,
        pdf: { info, pdfMetadata }
      }
    });
  }
  return docs;
};

const splitDocxPages = (documentXml: string): string[] => {
  const pages: string[] = [];
  let current = '';
  const tokenRe =
    /<w:lastRenderedPageBreak\s*\/?\s*>|<w:br\s+[^>]*\bw:type=["']page["'][^>]*\/?\s*>|<w:br\b[^>]*\/?\s*>|<w:tab\s*\/?\s*>|<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<\/w:p>/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(documentXml)) !== null) {
    const matched = m[0];
    if (
      /<w:lastRenderedPageBreak/.test(matched) ||
      /<w:br[^>]*type=["']page/.test(matched)
    ) {
      const trimmed = current.trim();
      if (trimmed) pages.push(trimmed);
      current = '';
    } else if (m[1] !== undefined) {
      current += decodeEntities(m[1]);
    } else if (matched.startsWith('<w:tab')) {
      current += '\t';
    } else {
      current += '\n';
    }
  }
  const trimmed = current.trim();
  if (trimmed) pages.push(trimmed);
  return pages;
};

const extractDocx = async (
  buffer: ArrayBuffer,
  source: ExtractedDocumentSource
): Promise<ExtractedDocument[]> => {
  let coreProps: Record<string, string> = {};
  let appProps: Record<string, string> = {};
  let documentXml: string | undefined;
  try {
    const { unzipSync, strFromU8 } = await import('fflate');
    const entries = unzipSync(new Uint8Array(buffer));
    if (entries['docProps/core.xml']) {
      coreProps = parseOpenXmlProps(strFromU8(entries['docProps/core.xml']));
    }
    if (entries['docProps/app.xml']) {
      appProps = parseOpenXmlProps(strFromU8(entries['docProps/app.xml']));
    }
    if (entries['word/document.xml']) {
      documentXml = strFromU8(entries['word/document.xml']);
    }
  } catch {
    // openxml access is best-effort
  }

  const pagesFromXml = documentXml ? splitDocxPages(documentXml) : [];

  if (pagesFromXml.length > 1) {
    return pagesFromXml.map((pageContent, index) => ({
      pageContent,
      metadata: {
        loc: { pageNumber: index + 1, totalPages: pagesFromXml.length },
        source,
        docx: { coreProps, appProps }
      }
    }));
  }

  const mammoth: any = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  const text = (result?.value || '').trim();
  if (!text) return [];

  return [
    {
      pageContent: text,
      metadata: {
        loc: { pageNumber: 1, totalPages: 1 },
        source,
        docx: { coreProps, appProps }
      }
    }
  ];
};

const extractXlsx = async (
  buffer: ArrayBuffer,
  source: ExtractedDocumentSource
): Promise<ExtractedDocument[]> => {
  const XLSX: any = await import('xlsx');
  const workbook = XLSX.read(new Uint8Array(buffer), {
    type: 'array',
    cellDates: true
  });

  const workbookProps: Record<string, unknown> = {
    ...(workbook.Props || {}),
    ...(workbook.Custprops || {})
  };

  const docs: ExtractedDocument[] = [];
  workbook.SheetNames.forEach((sheetName: string, index: number) => {
    const sheet = workbook.Sheets[sheetName];
    const csv: string = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    const trimmed = csv.trim();
    if (!trimmed) return;

    const range = sheet['!ref'] as string | undefined;
    let rowCount: number | undefined;
    let columnCount: number | undefined;
    if (range) {
      const decoded = XLSX.utils.decode_range(range);
      rowCount = decoded.e.r - decoded.s.r + 1;
      columnCount = decoded.e.c - decoded.s.c + 1;
    }

    docs.push({
      pageContent: `# ${sheetName}\n${trimmed}`,
      metadata: {
        loc: {
          pageNumber: index + 1,
          totalPages: workbook.SheetNames.length,
          sheetName
        },
        source,
        xlsx: {
          sheetIndex: index,
          range,
          rowCount,
          columnCount,
          workbookProps:
            Object.keys(workbookProps).length > 0 ? workbookProps : undefined
        }
      }
    });
  });
  return docs;
};

const collectSlideText = (xml: string): string =>
  (xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [])
    .map(m => decodeEntities(m.replace(/<a:t[^>]*>|<\/a:t>/g, '')))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractSlideTitle = (xml: string): string | undefined => {
  const shapeRe = /<p:sp\b[\s\S]*?<\/p:sp>/g;
  let match: RegExpExecArray | null;
  while ((match = shapeRe.exec(xml)) !== null) {
    const shape = match[0];
    const isTitle =
      /<p:ph\b[^>]*\btype=["'](?:ctrTitle|title)["']/i.test(shape) ||
      (/<p:ph\b[^>]*>/i.test(shape) &&
        !/<p:ph\b[^>]*\btype=/i.test(shape) &&
        /<p:ph\b[^>]*\bidx=["']0["']/i.test(shape));
    if (isTitle) {
      const title = collectSlideText(shape);
      if (title) return title;
    }
  }
  return undefined;
};

const extractPptx = async (
  buffer: ArrayBuffer,
  source: ExtractedDocumentSource
): Promise<ExtractedDocument[]> => {
  const { unzipSync, strFromU8 } = await import('fflate');
  const entries = unzipSync(new Uint8Array(buffer));

  const coreProps = entries['docProps/core.xml']
    ? parseOpenXmlProps(strFromU8(entries['docProps/core.xml']))
    : {};
  const appProps = entries['docProps/app.xml']
    ? parseOpenXmlProps(strFromU8(entries['docProps/app.xml']))
    : {};

  const slideNames = Object.keys(entries)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const ai = Number(a.match(/slide(\d+)\.xml$/)?.[1] || 0);
      const bi = Number(b.match(/slide(\d+)\.xml$/)?.[1] || 0);
      return ai - bi;
    });

  const docs: ExtractedDocument[] = [];
  slideNames.forEach((name, index) => {
    const xml = strFromU8(entries[name]);
    const slideText = collectSlideText(xml);
    if (!slideText) return;

    const slideNumber = Number(
      name.match(/slide(\d+)\.xml$/)?.[1] || index + 1
    );
    const slideTitle =
      extractSlideTitle(xml) || slideText.split(' ').slice(0, 12).join(' ');

    const notesPath = `ppt/notesSlides/notesSlide${slideNumber}.xml`;
    const notes = entries[notesPath]
      ? collectSlideText(strFromU8(entries[notesPath]))
      : undefined;

    docs.push({
      pageContent: slideText,
      metadata: {
        loc: {
          pageNumber: index + 1,
          totalPages: slideNames.length,
          slideTitle
        },
        source,
        pptx: {
          coreProps,
          appProps,
          notes: notes || undefined
        }
      }
    });
  });
  return docs;
};

const extractPlainText = (
  buffer: ArrayBuffer,
  source: ExtractedDocumentSource
): ExtractedDocument[] => {
  const text = new TextDecoder('utf-8').decode(buffer).trim();
  if (!text) return [];
  return [
    {
      pageContent: text,
      metadata: {
        loc: { pageNumber: 1, totalPages: 1 },
        source
      }
    }
  ];
};

export const extractDocuments = async (
  buffer: ArrayBuffer,
  mimeType: string,
  fileName?: string
): Promise<ExtractedDocument[] | null> => {
  if (!utils.isEmbeddableMimeType(mimeType)) return null;

  const source: ExtractedDocumentSource = {
    fileName: fileName || undefined,
    mimeType,
    sizeBytes: buffer.byteLength
  };

  try {
    let docs: ExtractedDocument[] = [];

    if (TEXT_MIME_TYPES.includes(mimeType)) {
      docs = extractPlainText(buffer, source);
    } else {
      switch (mimeType) {
        case constants.MIMETYPE_APPLICATION_PDF:
          docs = await extractPdf(buffer, source);
          break;
        case constants.MIMETYPE_APPLICATION_VND_OPENXMLFORMATS_OFFICEDOCUMENT_WORDPROCESSINGML_DOCUMENT:
        case constants.MIMETYPE_APPLICATION_MSWORD:
          docs = await extractDocx(buffer, source);
          break;
        case constants.MIMETYPE_APPLICATION_VND_OPENXMLFORMATS_OFFICEDOCUMENT_SPREADSHEETML_SHEET:
        case constants.MIMETYPE_APPLICATION_VND_MS_EXCEL:
          docs = await extractXlsx(buffer, source);
          break;
        case constants.MIMETYPE_APPLICATION_VND_OPENXMLFORMATS_OFFICEDOCUMENT_PRESENTATIONML_PRESENTATION:
          docs = await extractPptx(buffer, source);
          break;
        default:
          return null;
      }
    }

    const sanitized = docs
      .map(doc => {
        const cleanedContent = stripBase64Images(doc.pageContent);
        if (!cleanedContent) return null;
        const cleanedMetadata = serializeMetadataValue(
          doc.metadata
        ) as ExtractedDocumentMetadata;
        return {
          ...doc,
          pageContent: cleanedContent,
          metadata: cleanedMetadata
        };
      })
      .filter((doc): doc is ExtractedDocument => doc !== null);

    return sanitized.length ? sanitized : null;
  } catch (error) {
    return null;
  }
};
