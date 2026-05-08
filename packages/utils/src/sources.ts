import { constants } from './constants';

export interface Source {
  resourceId: string;
  uri: string;
  title: string;
  sourceType: 'FILE' | 'WEBSITE';
  mimeType: string;
  fileName: string | null;
  pageNumber?: number;
  chunkIndex?: number;
  score?: number;
  excerpt?: string;
}

export interface ResourceUrlContext {
  apiUrl: string;
  organizationId: string;
  projectId: string;
}

export const isResourceSourceEnabled = (
  resource: { showSource?: string | null } | null | undefined
): boolean =>
  (resource?.showSource ?? constants.STATUS_ACTIVE) !==
  constants.STATUS_DISABLED;

export const safeHostname = (url: string): string | null => {
  if (!URL.canParse(url)) return null;
  return new URL(url).hostname.replace(/^www\./, '');
};

export const buildResourceDownloadUrl = (
  ctx: ResourceUrlContext,
  resourceId: string,
  pageNumber?: number
): string => {
  const fragment = pageNumber ? `#page=${pageNumber}` : '';
  return `${ctx.apiUrl}/organization/${ctx.organizationId}/project/${ctx.projectId}/artifact/resource/${resourceId}/download${fragment}`;
};

export interface SourceButton {
  text: string;
  url: string;
}

const truncateLabel = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 1)}…`;

export const formatSourcesAsButtons = (
  sources: Source[],
  ctx: ResourceUrlContext,
  options?: { maxLabelLength?: number }
): SourceButton[] => {
  const maxLabelLength = options?.maxLabelLength ?? 60;
  return sources.map((source, index) => {
    const position = index + 1;
    if (source.sourceType === constants.RESOURCE_SOURCE_TYPE_FILE) {
      const label = source.fileName || source.title;
      const pageSuffix = source.pageNumber ? ` · p.${source.pageNumber}` : '';
      const url = buildResourceDownloadUrl(
        ctx,
        source.resourceId,
        source.pageNumber
      );
      return {
        text: truncateLabel(`${position} ${label}${pageSuffix}`, maxLabelLength),
        url
      };
    }
    const domain = safeHostname(source.uri);
    const base = domain ? `${domain} — ${source.title}` : source.title;
    return {
      text: truncateLabel(`${position} ${base}`, maxLabelLength),
      url: source.uri
    };
  });
};

export const formatSourcesAsMarkdown = (
  sources: Source[],
  ctx: ResourceUrlContext
): string => {
  if (sources.length === 0) return '';
  const lines = sources.map((source, index) => {
    const position = index + 1;
    if (source.sourceType === constants.RESOURCE_SOURCE_TYPE_FILE) {
      const label = source.fileName || source.title;
      const pageSuffix = source.pageNumber ? ` · p. ${source.pageNumber}` : '';
      const url = buildResourceDownloadUrl(
        ctx,
        source.resourceId,
        source.pageNumber
      );
      return `${position}. [${label}${pageSuffix}](${url})`;
    }
    const domain = safeHostname(source.uri);
    const label = domain ? `${domain} — ${source.title}` : source.title;
    return `${position}. [${label}](${source.uri})`;
  });
  return `**Sources**\n${lines.join('\n')}`;
};
