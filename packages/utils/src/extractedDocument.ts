export interface ExtractedDocumentSource {
  fileName?: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ExtractedDocumentMetadata {
  loc: {
    pageNumber: number;
    totalPages: number;
    sheetName?: string;
    slideTitle?: string;
  };
  source: ExtractedDocumentSource;
  pdf?: {
    info?: Record<string, unknown>;
    pdfMetadata?: Record<string, unknown> | null;
  };
  docx?: {
    coreProps?: Record<string, string>;
    appProps?: Record<string, string>;
  };
  xlsx?: {
    sheetIndex: number;
    range?: string;
    rowCount?: number;
    columnCount?: number;
    workbookProps?: Record<string, unknown>;
  };
  pptx?: {
    coreProps?: Record<string, string>;
    appProps?: Record<string, string>;
    notes?: string;
  };
  web?: {
    url: string;
    canonicalUrl?: string;
    title?: string;
    description?: string;
    siteName?: string;
    author?: string;
    keywords?: string[];
    language?: string;
    publishedAt?: string;
    modifiedAt?: string;
    openGraph?: Record<string, string>;
    twitter?: Record<string, string>;
    jsonLd?: unknown[];
    headings?: { tag: string; text: string }[];
    images?: { src: string; alt?: string }[];
    links?: { url: string; text?: string }[];
    favicon?: string;
    httpStatus?: number;
    contentType?: string;
    renderer: 'cheerio' | 'playwright';
  };
}

export interface ExtractedDocument {
  pageContent: string;
  metadata: ExtractedDocumentMetadata;
}
