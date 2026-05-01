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
}

export interface ExtractedDocument {
  pageContent: string;
  metadata: ExtractedDocumentMetadata;
}
