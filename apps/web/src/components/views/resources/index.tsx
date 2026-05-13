import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { UI } from '@anju/ui';
import { utils } from '@anju/utils';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import {
  Add,
  Close,
  DeleteOutline,
  EditOutlined,
  ArrowBack,
  OpenInNew,
  UploadFile,
  TextFields,
  ExpandMore,
  ExpandLess,
  RemoveCircleOutline,
  FolderOpenOutlined,
  LanguageOutlined,
  ViewListOutlined,
  GridViewOutlined,
  Search,
  Sync,
  PictureAsPdfOutlined,
  DescriptionOutlined,
  TableChartOutlined,
  SlideshowOutlined,
  ImageOutlined,
  TextSnippetOutlined,
  InsertDriveFileOutlined,
  AudiotrackOutlined,
  VideoFileOutlined
} from '@mui/icons-material';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Wrapper } from './styles';

import type { CloudDriveItem } from '@anju/ui';

interface Resource {
  id: string;
  title: string;
  uri: string;
  type: string;
  sourceType: string;
  status: string;
  showSource: string;
  description: string | null;
  mimeType: (typeof utils.constants.MIMETYPES)[0];
  content: string | null;
  size: number;
  encoding: string | null;
  fileKey: string | null;
  fileName: string | null;
  annotations: Record<string, unknown> | null;
  icons: { src: string }[] | null;
  metadata: Record<string, unknown> | null;
  crawlConfig: { maxPages?: number; maxDepth?: number } | null;
  parentResourceId: string | null;
  childResourceCount: number;
  artifactId: string;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = 'sources' | 'all';
type FolderId = 'files' | 'websites' | 'gdrive' | 'onedrive' | null;
type AddingType = 'file' | 'website' | null;

const isFolderResource = (resource: {
  sourceType: string;
  parentResourceId: string | null;
}): boolean => {
  if (
    resource.sourceType ===
      utils.constants.RESOURCE_SOURCE_TYPE_GOOGLE_DRIVE_FOLDER ||
    resource.sourceType ===
      utils.constants.RESOURCE_SOURCE_TYPE_ONE_DRIVE_FOLDER
  ) {
    return true;
  }
  if (
    resource.sourceType === utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE &&
    !resource.parentResourceId
  ) {
    return true;
  }
  return false;
};

const isGoogleDriveResource = (resource: {
  sourceType: string;
  metadata: Record<string, unknown> | null;
}): boolean => {
  if (
    resource.sourceType ===
    utils.constants.RESOURCE_SOURCE_TYPE_GOOGLE_DRIVE_FOLDER
  ) {
    return true;
  }
  const meta = resource.metadata as { driveFileId?: string } | null;
  return !!meta?.driveFileId;
};

const isOneDriveResource = (resource: {
  sourceType: string;
  metadata: Record<string, unknown> | null;
}): boolean => {
  if (
    resource.sourceType ===
    utils.constants.RESOURCE_SOURCE_TYPE_ONE_DRIVE_FOLDER
  ) {
    return true;
  }
  const meta = resource.metadata as { oneDriveItemId?: string } | null;
  return !!meta?.oneDriveItemId;
};

const ResourceFavicon = ({ favicon }: { favicon: string | null }) => {
  const [errored, setErrored] = useState(false);
  if (!favicon || errored) return <LanguageOutlined />;
  return (
    <img
      src={favicon}
      alt=""
      className="resource-item-favicon"
      onError={() => setErrored(true)}
    />
  );
};

const ResourceIconLink = ({ src }: { src: string }) => {
  const [errored, setErrored] = useState(false);
  if (errored) return <InsertDriveFileOutlined />;
  return (
    <img
      src={src}
      alt=""
      className="resource-item-iconlink"
      onError={() => setErrored(true)}
    />
  );
};

const getMimeIcon = (mimeType: string) => {
  const mime = mimeType || '';
  if (mime.startsWith('image/')) return <ImageOutlined />;
  if (mime.startsWith('audio/')) return <AudiotrackOutlined />;
  if (mime.startsWith('video/')) return <VideoFileOutlined />;
  if (mime === 'application/pdf') return <PictureAsPdfOutlined />;
  if (mime.includes('word') || mime.includes('document'))
    return <DescriptionOutlined />;
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv'))
    return <TableChartOutlined />;
  if (
    mime.includes('presentation') ||
    mime.includes('powerpoint') ||
    mime.includes('slide')
  )
    return <SlideshowOutlined />;
  if (mime.startsWith('text/')) return <TextSnippetOutlined />;
  return <InsertDriveFileOutlined />;
};

const getResourceIcon = (resource: {
  sourceType: string;
  mimeType: string;
  metadata: Record<string, unknown> | null;
}) => {
  if (
    resource.sourceType ===
      utils.constants.RESOURCE_SOURCE_TYPE_GOOGLE_DRIVE_FOLDER ||
    resource.sourceType ===
      utils.constants.RESOURCE_SOURCE_TYPE_ONE_DRIVE_FOLDER
  ) {
    return <FolderOpenOutlined />;
  }
  const meta = resource.metadata as { iconLink?: string } | null;
  if (meta?.iconLink) {
    return <ResourceIconLink src={meta.iconLink} />;
  }
  return getMimeIcon(resource.mimeType);
};

const INITIAL_FILE_VALUES = {
  title: '',
  uri: '',
  type: 'static',
  description: '',
  mimeType: utils.constants.MIMETYPE_TEXT as string,
  content: '',
  size: '0',
  encoding: 'utf-8'
};

const INITIAL_WEBSITE_VALUES = {
  title: '',
  uri: '',
  description: '',
  maxPages: String(utils.constants.CRAWL_DEFAULT_MAX_PAGES),
  maxDepth: String(utils.constants.CRAWL_DEFAULT_MAX_DEPTH)
};

export const Resources = () => {
  const router = useRouter();
  const snackbar = UI.Alert.useSnackbar();
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [addingType, setAddingType] = useState<AddingType>(null);
  const [view, setView] = useState<ViewMode>('sources');
  const [folder, setFolder] = useState<FolderId>(null);
  const [search, setSearch] = useState('');
  const [uriTouched, setUriTouched] = useState(false);
  const [editValues, setEditValues] = useState(INITIAL_FILE_VALUES);
  const [websiteValues, setWebsiteValues] = useState(INITIAL_WEBSITE_VALUES);
  const [status, setStatus] = useState<
    'idle' | 'pending' | 'resolved' | 'rejected'
  >('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteAlert, setDeleteAlert] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [sourceVisibilityUpdating, setSourceVisibilityUpdating] =
    useState(false);
  const [contentMode, setContentMode] = useState<'text' | 'file'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [filePreviewError, setFilePreviewError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [annotations, setAnnotations] = useState<{
    audience: string[];
    priority: string;
  }>({ audience: [], priority: '' });
  const [icons, setIcons] = useState<{ src: string; theme: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [panelWidth, setPanelWidth] = useState(480);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const { id: organizationId, projectId } = router.query as {
    id: string;
    projectId: string;
  };
  const hasPendingResources = resources.some(
    r => r.status === utils.constants.STATUS_PENDING
  );
  const apiBase = `/organization/${organizationId}/project/${projectId}/artifact/resource`;
  const gdriveApiBase = `/organization/${organizationId}/project/${projectId}/artifact/google-drive`;
  const onedriveApiBase = `/organization/${organizationId}/project/${projectId}/artifact/one-drive`;
  const isCreating = addingType !== null;

  const [gdriveOpen, setGdriveOpen] = useState(false);
  const [gdriveToken, setGdriveToken] = useState<string | null>(null);
  const [gdriveLoadingToken, setGdriveLoadingToken] = useState(false);
  const [gdriveSelected, setGdriveSelected] = useState<
    Map<string, CloudDriveItem>
  >(new Map());
  const [gdriveImporting, setGdriveImporting] = useState(false);
  const [gdriveSyncingId, setGdriveSyncingId] = useState<string | null>(null);

  const [onedriveOpen, setOnedriveOpen] = useState(false);
  const [onedriveToken, setOnedriveToken] = useState<string | null>(null);
  const [onedriveLoadingToken, setOnedriveLoadingToken] = useState(false);
  const [onedriveSelected, setOnedriveSelected] = useState<
    Map<string, CloudDriveItem>
  >(new Map());
  const [onedriveImporting, setOnedriveImporting] = useState(false);
  const [onedriveSyncingId, setOnedriveSyncingId] = useState<string | null>(
    null
  );

  const fileResources = useMemo(
    () =>
      resources.filter(
        r =>
          r.sourceType === utils.constants.RESOURCE_SOURCE_TYPE_FILE &&
          !isGoogleDriveResource(r) &&
          !isOneDriveResource(r)
      ),
    [resources]
  );

  const gdriveTopResources = useMemo(
    () =>
      resources.filter(r => !r.parentResourceId && isGoogleDriveResource(r)),
    [resources]
  );

  const gdriveChildrenTotal = useMemo(
    () =>
      gdriveTopResources.reduce(
        (total, r) => total + (r.childResourceCount ?? 0),
        0
      ),
    [gdriveTopResources]
  );

  const onedriveTopResources = useMemo(
    () => resources.filter(r => !r.parentResourceId && isOneDriveResource(r)),
    [resources]
  );

  const onedriveChildrenTotal = useMemo(
    () =>
      onedriveTopResources.reduce(
        (total, r) => total + (r.childResourceCount ?? 0),
        0
      ),
    [onedriveTopResources]
  );

  const websiteParents = useMemo(
    () =>
      resources.filter(
        r =>
          r.sourceType === utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE &&
          !r.parentResourceId
      ),
    [resources]
  );

  const websitePagesCount = useMemo(
    () =>
      websiteParents.reduce(
        (total, w) => total + (w.childResourceCount ?? 0),
        0
      ),
    [websiteParents]
  );

  const [childrenByParent, setChildrenByParent] = useState<
    Record<string, Resource[]>
  >({});
  const [loadingChildrenIds, setLoadingChildrenIds] = useState<Set<string>>(
    new Set()
  );
  const [folderPath, setFolderPath] = useState<string[]>([]);
  const currentFolderId = folderPath[folderPath.length - 1] || null;

  const findResourceById = (id: string): Resource | undefined => {
    const top = resources.find(r => r.id === id);
    if (top) return top;
    for (const list of Object.values(childrenByParent)) {
      const found = list.find(r => r.id === id);
      if (found) return found;
    }
    return undefined;
  };

  const computeAncestry = (resourceId: string): string[] => {
    const chain: string[] = [];
    const seen = new Set<string>();
    let cursor: Resource | undefined = findResourceById(resourceId);
    while (cursor && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      chain.unshift(cursor.id);
      if (!cursor.parentResourceId) break;
      cursor = findResourceById(cursor.parentResourceId);
    }
    return chain;
  };

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list: Resource[];
    if (currentFolderId) {
      list = childrenByParent[currentFolderId] || [];
    } else if (view === 'all') {
      list = resources.filter(r => !r.parentResourceId);
    } else if (folder === 'files') {
      list = fileResources;
    } else if (folder === 'websites') {
      list = websiteParents;
    } else if (folder === 'gdrive') {
      list = gdriveTopResources;
    } else if (folder === 'onedrive') {
      list = onedriveTopResources;
    } else {
      list = [];
    }
    if (!q) return list;
    return list.filter(
      r =>
        r.title.toLowerCase().includes(q) ||
        r.uri.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
    );
  }, [
    view,
    folder,
    currentFolderId,
    childrenByParent,
    fileResources,
    websiteParents,
    gdriveTopResources,
    onedriveTopResources,
    resources,
    search
  ]);

  const getFavicon = (resource: Resource): string | null => {
    const seo = (resource.metadata as { seo?: { favicon?: string } } | null)
      ?.seo;
    if (seo?.favicon) return seo.favicon;
    if (
      resource.sourceType === utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE &&
      !resource.parentResourceId
    ) {
      const children = childrenByParent[resource.id] || [];
      for (const child of children) {
        const childSeo = (
          child.metadata as { seo?: { favicon?: string } } | null
        )?.seo;
        if (childSeo?.favicon) return childSeo.favicon;
      }
    }
    return null;
  };

  const fetchResources = async (signal?: AbortSignal) => {
    if (!organizationId || !projectId) return;
    setStatus('pending');
    try {
      const data = await utils.fetcher({
        url: apiBase,
        config: { credentials: 'include', signal }
      });
      if (signal?.aborted) return;
      if (data && !data.error) {
        setResources(data);
        setSelectedResource(prev =>
          prev ? (data.find((r: Resource) => r.id === prev.id) ?? prev) : prev
        );
      }
      setStatus('resolved');
    } catch {
      if (!signal?.aborted) setStatus('rejected');
    }
  };

  const fetchChildren = async (parentId: string, signal?: AbortSignal) => {
    setLoadingChildrenIds(prev => {
      if (prev.has(parentId)) return prev;
      const next = new Set(prev);
      next.add(parentId);
      return next;
    });
    try {
      const data = await utils.fetcher({
        url: `${apiBase}?parentResourceId=${parentId}`,
        config: { credentials: 'include', signal }
      });
      if (signal?.aborted) return;
      if (Array.isArray(data)) {
        setChildrenByParent(prev => ({ ...prev, [parentId]: data }));
        setSelectedResource(prev =>
          prev && prev.parentResourceId === parentId
            ? (data.find((r: Resource) => r.id === prev.id) ?? prev)
            : prev
        );
      }
    } catch {
      // ignore — UI keeps showing previous data
    } finally {
      if (!signal?.aborted) {
        setLoadingChildrenIds(prev => {
          if (!prev.has(parentId)) return prev;
          const next = new Set(prev);
          next.delete(parentId);
          return next;
        });
      }
    }
  };

  useEffect(() => {
    if (!organizationId || !projectId) return;
    const controller = new AbortController();
    fetchResources(controller.signal);
    return () => controller.abort();
  }, [organizationId, projectId]);

  const openParentId = (() => {
    if (!selectedResource) return null;
    if (
      selectedResource.sourceType ===
        utils.constants.RESOURCE_SOURCE_TYPE_GOOGLE_DRIVE_FOLDER ||
      selectedResource.sourceType ===
        utils.constants.RESOURCE_SOURCE_TYPE_ONE_DRIVE_FOLDER
    ) {
      return selectedResource.id;
    }
    if (
      selectedResource.sourceType ===
        utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE &&
      !selectedResource.parentResourceId
    ) {
      return selectedResource.id;
    }
    return selectedResource.parentResourceId || null;
  })();

  useEffect(() => {
    if (!openParentId) return;
    if (childrenByParent[openParentId]) return;
    const controller = new AbortController();
    fetchChildren(openParentId, controller.signal);
    return () => controller.abort();
  }, [openParentId]);

  useEffect(() => {
    if (!currentFolderId) return;
    if (childrenByParent[currentFolderId]) return;
    const controller = new AbortController();
    fetchChildren(currentFolderId, controller.signal);
    return () => controller.abort();
  }, [currentFolderId]);

  useEffect(() => {
    setFolderPath([]);
  }, [folder, view]);

  const openParentRecord = openParentId
    ? resources.find(r => r.id === openParentId)
    : null;
  const openChildren = openParentId ? childrenByParent[openParentId] || [] : [];
  const openParentPending =
    openParentRecord?.status === utils.constants.STATUS_PENDING;
  const openChildrenPending = openChildren.some(
    c => c.status === utils.constants.STATUS_PENDING
  );

  useEffect(() => {
    if (!hasPendingResources && !openParentPending && !openChildrenPending)
      return;
    const interval = setInterval(() => {
      if (hasPendingResources) fetchResources();
      if (openParentId && (openParentPending || openChildrenPending)) {
        fetchChildren(openParentId);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [
    hasPendingResources,
    openParentPending,
    openChildrenPending,
    openParentId
  ]);

  useEffect(() => {
    const requestedId = router.query.selected;
    if (typeof requestedId !== 'string' || !resources.length) return;
    const match = resources.find(r => r.id === requestedId);
    if (!match) return;
    if (view === 'sources') {
      if (isGoogleDriveResource(match)) {
        setFolder('gdrive');
      } else if (isOneDriveResource(match)) {
        setFolder('onedrive');
      } else if (
        match.sourceType === utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE
      ) {
        setFolder('websites');
      } else if (
        match.sourceType === utils.constants.RESOURCE_SOURCE_TYPE_FILE
      ) {
        setFolder('files');
      }
    }
    if (isFolderResource(match)) {
      setFolderPath(computeAncestry(match.id));
      setSelectedResource(null);
      setIsEditing(false);
      setAddingType(null);
      return;
    }
    if (selectedResource?.id !== match.id) {
      setSelectedResource(match);
      setIsEditing(false);
      setAddingType(null);
    }
  }, [router.query.selected, resources]);

  useEffect(() => {
    if (!selectedResource?.fileKey) {
      setFilePreviewUrl(null);
      setFilePreviewError(null);
      return;
    }

    let revoked = false;
    setFilePreviewError(null);

    const fetchFilePreview = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}${apiBase}/${selectedResource.id}/download`,
          { credentials: 'include' }
        );
        if (!response.ok) {
          if (!revoked) setFilePreviewError('Failed to load file preview');
          return;
        }
        const blob = await response.blob();
        if (revoked) return;
        const url = URL.createObjectURL(blob);
        setFilePreviewUrl(url);
      } catch {
        if (!revoked) setFilePreviewError('Failed to load file preview');
      }
    };

    fetchFilePreview();

    return () => {
      revoked = true;
      setFilePreviewUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [selectedResource?.id, selectedResource?.fileKey, apiBase]);

  useEffect(() => {
    setExpandedSections(new Set());
  }, [selectedResource?.id]);

  const renderCollapsibleJson = (
    sectionKey: string,
    label: string,
    value: unknown,
    threshold = 600
  ) => {
    const json = JSON.stringify(value, null, 2);
    const isLarge = json.length > threshold;
    const expanded = expandedSections.has(sectionKey);
    return (
      <div className="panel-section">
        <h3 className="panel-section-label">{label}</h3>
        {isLarge && !expanded ? (
          <button
            type="button"
            className="panel-section-toggle"
            onClick={() =>
              setExpandedSections(prev => {
                const next = new Set(prev);
                next.add(sectionKey);
                return next;
              })
            }
          >
            Show {label.toLowerCase()} ({json.length.toLocaleString()} chars)
          </button>
        ) : (
          <>
            <pre className="panel-content-pre">{json}</pre>
            {isLarge && (
              <button
                type="button"
                className="panel-section-toggle"
                onClick={() =>
                  setExpandedSections(prev => {
                    const next = new Set(prev);
                    next.delete(sectionKey);
                    return next;
                  })
                }
              >
                Hide {label.toLowerCase()}
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  const fetchResourceDetail = async (resourceId: string) => {
    try {
      const data = await utils.fetcher({
        url: `${apiBase}/${resourceId}`,
        config: { credentials: 'include' }
      });
      if (data && !data.error) {
        setSelectedResource(prev =>
          prev && prev.id === resourceId ? data : prev
        );
      }
    } catch {
      // best-effort — keep showing the cached row
    }
  };

  const handleSelect = (resource: Resource) => {
    if (isFolderResource(resource)) {
      setFolderPath(computeAncestry(resource.id));
      setSelectedResource(null);
      setIsEditing(false);
      setAddingType(null);
      return;
    }
    setSelectedResource(resource);
    setIsEditing(false);
    setAddingType(null);
    fetchResourceDetail(resource.id);
  };

  const startCreate = (type: 'file' | 'website') => {
    setSelectedResource(null);
    setIsEditing(false);
    setAddingType(type);
    setShowAdvanced(false);
    setAnnotations({ audience: [], priority: '' });
    setIcons([]);
    setUriTouched(false);
    setErrors({});
    if (type === 'file') {
      setEditValues(INITIAL_FILE_VALUES);
      setContentMode('file');
      setFile(null);
    } else {
      setWebsiteValues(INITIAL_WEBSITE_VALUES);
    }
  };

  const buildFileBody = () => ({
    title: editValues.title,
    uri: editValues.uri,
    type: editValues.type,
    sourceType: utils.constants.RESOURCE_SOURCE_TYPE_FILE,
    description: editValues.description,
    mimeType: editValues.mimeType,
    content:
      contentMode === 'text' ? editValues.content || undefined : undefined,
    size: Number(editValues.size),
    encoding: editValues.encoding || undefined,
    fileName:
      contentMode === 'file'
        ? file?.name || selectedResource?.fileName || undefined
        : undefined,
    ...buildAdvancedFields()
  });

  const buildWebsiteCreateBody = () => ({
    title: websiteValues.title.trim(),
    uri: websiteValues.uri.trim(),
    sourceType: utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE,
    description: websiteValues.description || undefined,
    crawlConfig: {
      maxPages: Number(websiteValues.maxPages),
      maxDepth: Number(websiteValues.maxDepth)
    }
  });

  const buildWebsiteUpdateBody = () => ({
    title: websiteValues.title.trim(),
    description: websiteValues.description || undefined
  });

  const parseZodErrors = (err: unknown) => {
    if (
      err &&
      typeof err === 'object' &&
      'issues' in err &&
      Array.isArray((err as { issues: unknown[] }).issues)
    ) {
      const formatted = (
        err as { issues: { path: string[]; message: string }[] }
      ).issues.reduce(
        (acc, curr) => ({ ...acc, [curr.path[0]]: curr.message }),
        {} as Record<string, string>
      );
      setErrors(formatted);
    }
  };

  type ResourceKind = 'file' | 'website';
  type SubmitMode = 'create' | 'update';

  interface KindOps {
    validate: () => Promise<boolean>;
    buildBody: () => Record<string, unknown>;
    afterPersist?: (resourceId: string) => Promise<void>;
  }

  const runValidation = async (
    schema: { parseAsync: (data: unknown) => Promise<unknown> },
    data: unknown
  ): Promise<boolean> => {
    try {
      await schema.parseAsync(data);
      setErrors({});
      return true;
    } catch (err) {
      parseZodErrors(err);
      return false;
    }
  };

  const fileOps = (mode: SubmitMode): KindOps => ({
    validate: () =>
      runValidation(
        mode === 'create'
          ? utils.Schema.ARTIFACT_CREATE_RESOURCE_VIEW
          : utils.Schema.ARTIFACT_UPDATE_RESOURCE_VIEW,
        buildFileBody()
      ),
    buildBody: buildFileBody,
    afterPersist: async resourceId => {
      if (contentMode === 'file' && file) await uploadFile(resourceId);
    }
  });

  const websiteOps = (mode: SubmitMode): KindOps =>
    mode === 'create'
      ? {
          validate: () =>
            runValidation(utils.Schema.ARTIFACT_CREATE_WEBSITE_VIEW, {
              title: websiteValues.title.trim(),
              uri: websiteValues.uri.trim(),
              description: websiteValues.description || undefined,
              maxPages: Number(websiteValues.maxPages),
              maxDepth: Number(websiteValues.maxDepth)
            }),
          buildBody: buildWebsiteCreateBody
        }
      : {
          validate: () =>
            runValidation(utils.Schema.ARTIFACT_UPDATE_WEBSITE_VIEW, {
              title: websiteValues.title.trim(),
              description: websiteValues.description || undefined
            }),
          buildBody: buildWebsiteUpdateBody
        };

  const opsFor = (kind: ResourceKind, mode: SubmitMode): KindOps =>
    kind === 'website' ? websiteOps(mode) : fileOps(mode);

  const kindOf = (resource: { sourceType: string } | null): ResourceKind =>
    resource?.sourceType === utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE
      ? 'website'
      : 'file';

  const handleCreateSubmit = async () => {
    if (submitting || !addingType) return;
    const ops = opsFor(addingType, 'create');
    if (!(await ops.validate())) return;

    setSubmitting(true);
    try {
      const data = await utils.fetcher({
        url: apiBase,
        config: {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify(ops.buildBody())
        }
      });

      if (data && !data.error) {
        if (ops.afterPersist) await ops.afterPersist(data.id);
        setAddingType(null);
        setFile(null);
        fetchResources();
        if (addingType === 'website') {
          setSelectedResource(null);
          setIsEditing(false);
          setFolderPath([data.id]);
          fetchChildren(data.id);
        } else {
          setSelectedResource(data);
        }
        snackbar.success(
          addingType === 'website' ? 'Crawl started' : 'Resource created'
        );
      } else {
        snackbar.error(data?.error || 'Failed to create resource');
      }
    } catch {
      snackbar.error('Failed to create resource');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = () => {
    if (!selectedResource) return;
    if (
      selectedResource.sourceType ===
      utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE
    ) {
      setWebsiteValues({
        title: selectedResource.title,
        uri: selectedResource.uri,
        description: selectedResource.description || '',
        maxPages: String(
          selectedResource.crawlConfig?.maxPages ??
            utils.constants.CRAWL_DEFAULT_MAX_PAGES
        ),
        maxDepth: String(
          selectedResource.crawlConfig?.maxDepth ??
            utils.constants.CRAWL_DEFAULT_MAX_DEPTH
        )
      });
      setShowAdvanced(false);
      setIsEditing(true);
      return;
    }
    setEditValues({
      title: selectedResource.title,
      uri: selectedResource.uri,
      type: selectedResource.type,
      description: selectedResource.description || '',
      mimeType: selectedResource.mimeType,
      content: selectedResource.content || '',
      size: String(selectedResource.size || 0),
      encoding: selectedResource.encoding || ''
    });
    setContentMode(selectedResource.fileKey ? 'file' : 'text');
    setFile(null);
    const ann = selectedResource.annotations as Record<string, unknown> | null;
    setAnnotations({
      audience: Array.isArray(ann?.audience) ? (ann.audience as string[]) : [],
      priority: ann?.priority != null ? String(ann.priority) : ''
    });
    const icn = selectedResource.icons as
      | { src: string; theme?: string }[]
      | null;
    setIcons(
      Array.isArray(icn)
        ? icn.map(i => ({ src: i.src, theme: i.theme || '' }))
        : []
    );
    setShowAdvanced(false);
    setUriTouched(true);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (isCreating) setAddingType(null);
  };

  const handleClose = () => {
    setSelectedResource(null);
    setIsEditing(false);
    setAddingType(null);
  };

  const handleShowSourceToggle = async () => {
    if (!selectedResource || sourceVisibilityUpdating) return;
    const enabled = utils.isResourceSourceEnabled(selectedResource);
    const next = enabled
      ? utils.constants.STATUS_DISABLED
      : utils.constants.STATUS_ACTIVE;
    setSourceVisibilityUpdating(true);
    try {
      const data = await utils.fetcher({
        url: `${apiBase}/${selectedResource.id}/show-source`,
        config: {
          method: 'PUT',
          credentials: 'include',
          body: JSON.stringify({ showSource: next })
        }
      });
      if (data && !data.error) {
        setSelectedResource(data);
        fetchResources();
        snackbar.success(
          next === utils.constants.STATUS_ACTIVE
            ? 'Sources enabled'
            : 'Sources hidden'
        );
      } else {
        snackbar.error(data?.error || 'Failed to update source visibility');
      }
    } catch {
      snackbar.error('Failed to update source visibility');
    } finally {
      setSourceVisibilityUpdating(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedResource || submitting) return;
    const ops = opsFor(kindOf(selectedResource), 'update');
    if (!(await ops.validate())) return;

    setSubmitting(true);
    try {
      const data = await utils.fetcher({
        url: `${apiBase}/${selectedResource.id}`,
        config: {
          method: 'PUT',
          credentials: 'include',
          body: JSON.stringify(ops.buildBody())
        }
      });

      if (data && !data.error) {
        if (ops.afterPersist) await ops.afterPersist(data.id);
        setSelectedResource(data);
        setFile(null);
        setIsEditing(false);
        fetchResources();
        snackbar.success('Resource updated');
      } else {
        snackbar.error(data?.error || 'Failed to update resource');
      }
    } catch {
      snackbar.error('Failed to update resource');
    } finally {
      setSubmitting(false);
    }
  };

  const buildAdvancedFields = () => {
    const result: Record<string, unknown> = {};
    if (annotations.audience.length > 0 || annotations.priority !== '') {
      result.annotations = {
        ...(annotations.audience.length > 0 && {
          audience: annotations.audience
        }),
        ...(annotations.priority !== '' && {
          priority: Number(annotations.priority)
        })
      };
    }
    if (icons.length > 0 && icons.some(i => i.src)) {
      result.icons = icons
        .filter(i => i.src)
        .map(i => ({
          src: i.src,
          ...(i.theme && { theme: i.theme })
        }));
    }
    return result;
  };

  const handleDeleteClick = () => {
    if (!selectedResource) return;
    setResourceToDelete(selectedResource);
    setDeleteAlert(true);
  };

  const handleDeleteRow = (e: React.MouseEvent, resource: Resource) => {
    e.stopPropagation();
    setResourceToDelete(resource);
    setDeleteAlert(true);
  };

  const handleDeleteConfirm = async () => {
    if (!resourceToDelete || submitting) return;
    const target = resourceToDelete;
    setSubmitting(true);
    try {
      const data = await utils.fetcher({
        url: `${apiBase}/${target.id}`,
        config: { method: 'DELETE', credentials: 'include' }
      });
      if (data && !data.error) {
        setDeleteAlert(false);
        setResourceToDelete(null);
        if (selectedResource?.id === target.id) {
          setSelectedResource(null);
          setIsEditing(false);
        }
        const folderIdx = folderPath.indexOf(target.id);
        if (folderIdx !== -1) {
          setFolderPath(prev => prev.slice(0, folderIdx));
        }
        fetchResources();
        snackbar.success('Resource deleted');
      } else {
        snackbar.error(data?.error || 'Failed to delete resource');
      }
    } catch {
      snackbar.error('Failed to delete resource');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewFile = () => {
    if (filePreviewUrl) window.open(filePreviewUrl, '_blank');
  };

  const isImageMime = (mime: string) => mime.startsWith('image/');

  const titleToUri = (title: string) =>
    `resource://${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}`;

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = panelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleResizeMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      const diff = startX.current - moveEvent.clientX;
      const newWidth = Math.max(
        360,
        Math.min(startWidth.current + diff, window.innerWidth - 300)
      );
      setPanelWidth(newWidth);
    };

    const handleResizeEnd = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'uri') setUriTouched(true);
    setEditValues(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'title' && !uriTouched) {
        next.uri = titleToUri(value);
      }
      return next;
    });
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleWebsiteChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setWebsiteValues(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > utils.constants.MAX_FILE_SIZE) {
      setErrors(prev => ({
        ...prev,
        file: `File size exceeds the ${utils.constants.MAX_FILE_SIZE / (1024 * 1024)}MB limit`
      }));
      e.target.value = '';
      return;
    }

    const detectedMime =
      selected.type || utils.constants.MIMETYPE_APPLICATION_OCTET_STREAM;
    if (
      !(utils.constants.MIMETYPES as readonly string[]).includes(detectedMime)
    ) {
      setErrors(prev => ({
        ...prev,
        file: `Unsupported mime type: ${detectedMime}`
      }));
      e.target.value = '';
      return;
    }

    setErrors(prev => {
      const next = { ...prev };
      delete next.file;
      delete next.mimeType;
      delete next.size;
      return next;
    });
    setFile(selected);
    const nameWithoutExt = selected.name.replace(/\.[^.]+$/, '');
    setEditValues(prev => {
      const next = {
        ...prev,
        mimeType: detectedMime,
        size: String(selected.size),
        title: prev.title || nameWithoutExt
      };
      if (!uriTouched) {
        next.uri = `resource://${selected.name
          .toLowerCase()
          .replace(/[^a-z0-9.]+/g, '-')
          .replace(/^-|-$/g, '')}`;
      }
      return next;
    });
  };

  const handleContentChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    const size = new TextEncoder().encode(value).length;
    setEditValues(prev => ({ ...prev, content: value, size: String(size) }));
  };

  const uploadFile = async (resourceId: string) => {
    if (!file) return;
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}${apiBase}/${resourceId}/upload`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type':
            file.type || utils.constants.MIMETYPE_APPLICATION_OCTET_STREAM,
          'x-file-name': encodeURIComponent(file.name)
        },
        body: file
      }
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(detail || `Upload failed (${response.status})`);
    }
    return await response.json();
  };

  const startGoogleDriveConnect = async () => {
    try {
      const data = await utils.fetcher({
        url: `/oauth/${utils.constants.OAUTH_PROVIDER_GOOGLE_DRIVE}/authorize?organizationId=${organizationId}&projectId=${projectId}`,
        config: { credentials: 'include' }
      });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        snackbar.error('Unable to start Google Drive connection');
      }
    } catch {
      snackbar.error('Unable to start Google Drive connection');
    }
  };

  const handleOpenGoogleDrive = async () => {
    if (gdriveLoadingToken) return;
    setGdriveLoadingToken(true);
    try {
      const data = await utils.fetcher({
        url: `${gdriveApiBase}/token`,
        config: { credentials: 'include' }
      });
      if (data?.error) {
        snackbar.error('Connect Google Drive to import files');
        await startGoogleDriveConnect();
        return;
      }
      if (data?.accessToken) {
        setGdriveToken(data.accessToken);
        setGdriveSelected(new Map());
        setGdriveOpen(true);
      } else {
        await startGoogleDriveConnect();
      }
    } catch {
      snackbar.error('Failed to open Google Drive');
    } finally {
      setGdriveLoadingToken(false);
    }
  };

  const handleGoogleDriveImport = async () => {
    if (gdriveImporting || gdriveSelected.size === 0) return;
    setGdriveImporting(true);
    try {
      const items = Array.from(gdriveSelected.values()).map(item => ({
        fileId: item.id,
        name: item.name,
        mimeType: item.mimeType,
        isFolder: item.isFolder,
        iconLink: item.iconLink,
        webViewLink: item.webUrl,
        modifiedTime: item.modifiedTime,
        size: item.size
      }));
      const data = await utils.fetcher({
        url: gdriveApiBase,
        config: {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ items })
        }
      });
      if (data && !data.error) {
        setGdriveOpen(false);
        setGdriveSelected(new Map());
        setFolder('gdrive');
        fetchResources();
        const count = items.length;
        snackbar.success(
          `Importing ${count} item${count === 1 ? '' : 's'} from Google Drive`
        );
      } else {
        snackbar.error(data?.error || 'Failed to import from Google Drive');
      }
    } catch {
      snackbar.error('Failed to import from Google Drive');
    } finally {
      setGdriveImporting(false);
    }
  };

  const handleGoogleDriveSync = async () => {
    if (gdriveSyncingId) return;
    const currentFolder = currentFolderId
      ? findResourceById(currentFolderId)
      : null;
    const targets =
      currentFolder && isGoogleDriveResource(currentFolder)
        ? [currentFolder]
        : gdriveTopResources;
    if (targets.length === 0) {
      snackbar.error('Nothing to sync');
      return;
    }
    setGdriveSyncingId(currentFolder?.id ?? '__all__');
    try {
      const results = await Promise.allSettled(
        targets.map(t =>
          utils.fetcher({
            url: `${gdriveApiBase}/${t.id}/sync`,
            config: { method: 'POST', credentials: 'include' }
          })
        )
      );
      fetchResources();
      if (currentFolderId) fetchChildren(currentFolderId);
      const failed = results.filter(
        r =>
          r.status === 'rejected' ||
          (r.status === 'fulfilled' && r.value?.error)
      ).length;
      if (failed > 0) {
        snackbar.error(
          `Sync failed for ${failed} item${failed === 1 ? '' : 's'}`
        );
      } else {
        snackbar.success('Sync started');
      }
    } finally {
      setGdriveSyncingId(null);
    }
  };

  const startOneDriveConnect = async () => {
    try {
      const data = await utils.fetcher({
        url: `/oauth/${utils.constants.OAUTH_PROVIDER_ONE_DRIVE}/authorize?organizationId=${organizationId}&projectId=${projectId}`,
        config: { credentials: 'include' }
      });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        snackbar.error('Unable to start OneDrive connection');
      }
    } catch {
      snackbar.error('Unable to start OneDrive connection');
    }
  };

  const handleOpenOneDrive = async () => {
    if (onedriveLoadingToken) return;
    setOnedriveLoadingToken(true);
    try {
      const data = await utils.fetcher({
        url: `${onedriveApiBase}/token`,
        config: { credentials: 'include' }
      });
      if (data?.error) {
        snackbar.error('Connect OneDrive to import files');
        await startOneDriveConnect();
        return;
      }
      if (data?.accessToken) {
        setOnedriveToken(data.accessToken);
        setOnedriveSelected(new Map());
        setOnedriveOpen(true);
      } else {
        await startOneDriveConnect();
      }
    } catch {
      snackbar.error('Failed to open OneDrive');
    } finally {
      setOnedriveLoadingToken(false);
    }
  };

  const handleOneDriveImport = async () => {
    if (onedriveImporting || onedriveSelected.size === 0) return;
    setOnedriveImporting(true);
    try {
      const items = Array.from(onedriveSelected.values()).map(item => ({
        itemId: item.id,
        driveId: item.driveId,
        name: item.name,
        mimeType: item.mimeType,
        isFolder: item.isFolder,
        webUrl: item.webUrl,
        lastModifiedDateTime: item.modifiedTime,
        size: item.size
      }));
      const data = await utils.fetcher({
        url: onedriveApiBase,
        config: {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ items })
        }
      });
      if (data && !data.error) {
        setOnedriveOpen(false);
        setOnedriveSelected(new Map());
        setFolder('onedrive');
        fetchResources();
        const count = items.length;
        snackbar.success(
          `Importing ${count} item${count === 1 ? '' : 's'} from OneDrive`
        );
      } else {
        snackbar.error(data?.error || 'Failed to import from OneDrive');
      }
    } catch {
      snackbar.error('Failed to import from OneDrive');
    } finally {
      setOnedriveImporting(false);
    }
  };

  const handleOneDriveSync = async () => {
    if (onedriveSyncingId) return;
    const currentFolder = currentFolderId
      ? findResourceById(currentFolderId)
      : null;
    const targets =
      currentFolder && isOneDriveResource(currentFolder)
        ? [currentFolder]
        : onedriveTopResources;
    if (targets.length === 0) {
      snackbar.error('Nothing to sync');
      return;
    }
    setOnedriveSyncingId(currentFolder?.id ?? '__all__');
    try {
      const results = await Promise.allSettled(
        targets.map(t =>
          utils.fetcher({
            url: `${onedriveApiBase}/${t.id}/sync`,
            config: { method: 'POST', credentials: 'include' }
          })
        )
      );
      fetchResources();
      if (currentFolderId) fetchChildren(currentFolderId);
      const failed = results.filter(
        r =>
          r.status === 'rejected' ||
          (r.status === 'fulfilled' && r.value?.error)
      ).length;
      if (failed > 0) {
        snackbar.error(
          `Sync failed for ${failed} item${failed === 1 ? '' : 's'}`
        );
      } else {
        snackbar.success('Sync started');
      }
    } finally {
      setOnedriveSyncingId(null);
    }
  };

  const renderFolderHome = () => (
    <div className="resources-folders">
      <div
        className="resource-folder"
        role="button"
        tabIndex={0}
        onClick={() => setFolder('gdrive')}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setFolder('gdrive');
          }
        }}
      >
        <div className="resource-folder-icon gdrive">
          <img src="/GOOGLE_DRIVE.svg" alt="" />
        </div>
        <div className="resource-folder-body">
          <p className="resource-folder-title">Google Drive</p>
          <p className="resource-folder-meta">
            {gdriveTopResources.length} item
            {gdriveTopResources.length === 1 ? '' : 's'}
            {gdriveChildrenTotal > 0 && (
              <>
                {' · '}
                {gdriveChildrenTotal} document
                {gdriveChildrenTotal === 1 ? '' : 's'}
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          className="resource-folder-action"
          onClick={e => {
            e.stopPropagation();
            handleOpenGoogleDrive();
          }}
          disabled={gdriveLoadingToken}
        >
          <Add />
          {gdriveLoadingToken ? 'Loading…' : 'Add from Google Drive'}
        </button>
      </div>
      <div
        className="resource-folder"
        role="button"
        tabIndex={0}
        onClick={() => setFolder('onedrive')}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setFolder('onedrive');
          }
        }}
      >
        <div className="resource-folder-icon onedrive">
          <img src="/ONEDRIVE.svg" alt="" />
        </div>
        <div className="resource-folder-body">
          <p className="resource-folder-title">OneDrive</p>
          <p className="resource-folder-meta">
            {onedriveTopResources.length} item
            {onedriveTopResources.length === 1 ? '' : 's'}
            {onedriveChildrenTotal > 0 && (
              <>
                {' · '}
                {onedriveChildrenTotal} document
                {onedriveChildrenTotal === 1 ? '' : 's'}
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          className="resource-folder-action"
          onClick={e => {
            e.stopPropagation();
            handleOpenOneDrive();
          }}
          disabled={onedriveLoadingToken}
        >
          <Add />
          {onedriveLoadingToken ? 'Loading…' : 'Add from OneDrive'}
        </button>
      </div>
      <div
        className="resource-folder"
        role="button"
        tabIndex={0}
        onClick={() => setFolder('websites')}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setFolder('websites');
          }
        }}
      >
        <div className="resource-folder-icon websites">
          <LanguageOutlined />
        </div>
        <div className="resource-folder-body">
          <p className="resource-folder-title">Websites</p>
          <p className="resource-folder-meta">
            {websiteParents.length} website
            {websiteParents.length === 1 ? '' : 's'}
            {websitePagesCount > 0 && (
              <>
                {' · '}
                {websitePagesCount} page
                {websitePagesCount === 1 ? '' : 's'}
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          className="resource-folder-action"
          onClick={e => {
            e.stopPropagation();
            startCreate('website');
          }}
        >
          <Add />
          Add website
        </button>
      </div>
      <div
        className="resource-folder"
        role="button"
        tabIndex={0}
        onClick={() => setFolder('files')}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setFolder('files');
          }
        }}
      >
        <div className="resource-folder-icon files">
          <FolderOpenOutlined />
        </div>
        <div className="resource-folder-body">
          <p className="resource-folder-title">My folder</p>
          <p className="resource-folder-meta">
            {fileResources.length} item
            {fileResources.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          className="resource-folder-action"
          onClick={e => {
            e.stopPropagation();
            startCreate('file');
          }}
        >
          <Add />
          Add files
        </button>
      </div>
    </div>
  );

  const renderResourceRow = (resource: Resource) => {
    const isWebsite =
      resource.sourceType === utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE;
    const isFolder = isFolderResource(resource);
    const childCount = isWebsite
      ? (childrenByParent[resource.id]?.length ??
        resource.childResourceCount ??
        0)
      : 0;
    return (
      <div
        key={resource.id}
        className={`resource-item ${selectedResource?.id === resource.id ? 'active' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => handleSelect(resource)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSelect(resource);
          }
        }}
      >
        <div className="resource-item-icon">
          {isWebsite ? (
            <ResourceFavicon favicon={getFavicon(resource)} />
          ) : (
            getResourceIcon(resource)
          )}
        </div>
        <div className="resource-item-body">
          <div className="resource-item-top">
            <div className="resource-item-top-between">
              <p className="resource-item-title">{resource.title}</p>
              <UI.Status status={resource.status} />
            </div>
            <UI.TruncatedText
              text={isWebsite ? 'Website' : resource.mimeType}
              className="resource-item-type"
            />
          </div>
          <div className="resource-item-meta">
            <span className="resource-item-uri">{resource.uri}</span>
            {isWebsite && childCount > 0 && (
              <span>
                {childCount} page{childCount === 1 ? '' : 's'}
              </span>
            )}
            {!isWebsite && resource.size > 0 && (
              <span>{formatSize(resource.size)}</span>
            )}
            <span>{new Date(resource.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
        {isFolder && (
          <IconButton
            size="small"
            aria-label="Delete folder"
            className="resource-item-remove-button"
            onClick={e => handleDeleteRow(e, resource)}
          >
            <DeleteOutline fontSize="small" />
          </IconButton>
        )}
      </div>
    );
  };

  const folderTitle =
    folder === 'files'
      ? 'My folder'
      : folder === 'websites'
        ? 'Websites'
        : folder === 'gdrive'
          ? 'Google Drive'
          : folder === 'onedrive'
            ? 'OneDrive'
            : '';
  const folderEmptyLabel = folder === 'websites' ? 'Add website' : 'Add files';
  const folderEmptyType: 'file' | 'website' =
    folder === 'websites' ? 'website' : 'file';

  return (
    <Wrapper panelWidth={panelWidth}>
      <div
        className={`resources-list ${selectedResource || isCreating ? 'has-selection' : ''}`}
      >
        <div className="resources-header">
          <div className="resources-header-text">
            <h1 className="resources-title">Resources</h1>
            <p className="resources-subtitle">
              Static files and templates this MCP server can serve to clients.
            </p>
          </div>
          <div className="resources-header-actions">
            <div className="resources-view-toggle">
              <button
                type="button"
                className={view === 'sources' ? 'active' : ''}
                onClick={() => {
                  setView('sources');
                }}
              >
                <GridViewOutlined />
                Sources
              </button>
              <button
                type="button"
                className={view === 'all' ? 'active' : ''}
                onClick={() => {
                  setView('all');
                  setFolder(null);
                }}
              >
                <ViewListOutlined />
                All resources
              </button>
            </div>
          </div>
        </div>
        {(view === 'all' || folder !== null) && (
          <div className="resources-toolbar">
            {(folderPath.length > 0 ||
              (view === 'sources' && folder !== null)) && (
              <button
                type="button"
                className="resources-back"
                onClick={() => {
                  if (folderPath.length > 0) {
                    setFolderPath(prev => prev.slice(0, -1));
                  } else {
                    setFolder(null);
                  }
                }}
              >
                <ArrowBack />
                Back
              </button>
            )}
            <div className="resources-search">
              <Search />
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {view === 'sources' &&
              folder === 'files' &&
              folderPath.length === 0 && (
                <UI.Button
                  variant="contained"
                  size="small"
                  onClick={() => startCreate('file')}
                >
                  <Add />
                  <span className="button-text">Add files</span>
                </UI.Button>
              )}
            {view === 'sources' &&
              folder === 'websites' &&
              folderPath.length === 0 && (
                <UI.Button
                  variant="contained"
                  size="small"
                  onClick={() => startCreate('website')}
                >
                  <Add />
                  <span className="button-text">Add website</span>
                </UI.Button>
              )}
            {view === 'sources' &&
              folder === 'gdrive' &&
              folderPath.length === 0 && (
                <UI.Button
                  variant="contained"
                  size="small"
                  onClick={handleOpenGoogleDrive}
                  disabled={gdriveLoadingToken}
                >
                  <Add />
                  <span className="button-text">
                    {gdriveLoadingToken ? 'Loading…' : 'Add from Google Drive'}
                  </span>
                </UI.Button>
              )}
            {folder === 'gdrive' && (
              <UI.Button
                variant="outlined"
                size="small"
                onClick={handleGoogleDriveSync}
                disabled={gdriveSyncingId !== null}
              >
                <Sync />
                <span className="button-text">
                  {gdriveSyncingId !== null ? 'Syncing…' : 'Sync'}
                </span>
              </UI.Button>
            )}
            {view === 'sources' &&
              folder === 'onedrive' &&
              folderPath.length === 0 && (
                <UI.Button
                  variant="contained"
                  size="small"
                  onClick={handleOpenOneDrive}
                  disabled={onedriveLoadingToken}
                >
                  <Add />
                  <span className="button-text">
                    {onedriveLoadingToken ? 'Loading…' : 'Add from OneDrive'}
                  </span>
                </UI.Button>
              )}
            {folder === 'onedrive' && (
              <UI.Button
                variant="outlined"
                size="small"
                onClick={handleOneDriveSync}
                disabled={onedriveSyncingId !== null}
              >
                <Sync />
                <span className="button-text">
                  {onedriveSyncingId !== null ? 'Syncing…' : 'Sync'}
                </span>
              </UI.Button>
            )}
          </div>
        )}
        {view === 'sources' && folder !== null && folderPath.length === 0 && (
          <h2 className="resources-folder-heading">{folderTitle}</h2>
        )}
        {folderPath.length > 0 && (
          <div className="resources-breadcrumbs">
            <UI.Breadcrumbs
              items={[
                ...(view === 'sources' && folder !== null
                  ? [
                      {
                        label: folderTitle,
                        onClick: () => setFolderPath([])
                      }
                    ]
                  : []),
                ...folderPath.map((id, idx) => {
                  const r = findResourceById(id);
                  return {
                    label: r?.title ?? '…',
                    onClick:
                      idx < folderPath.length - 1
                        ? () => setFolderPath(prev => prev.slice(0, idx + 1))
                        : undefined
                  };
                })
              ]}
            />
          </div>
        )}
        {view === 'sources' && folder === null && renderFolderHome()}
        {(view === 'all' || folder !== null) && (
          <>
            {(() => {
              const listLoading = currentFolderId
                ? loadingChildrenIds.has(currentFolderId) &&
                  !childrenByParent[currentFolderId]
                : status === 'pending';
              if (!listLoading || filteredList.length > 0) return null;
              const skeletonCount = currentFolderId
                ? Math.min(
                    findResourceById(currentFolderId)?.childResourceCount ?? 3,
                    6
                  ) || 3
                : 3;
              return (
                <div className="resources-items">
                  {Array.from({ length: skeletonCount }).map((_, i) => (
                    <div
                      key={i}
                      className="resource-item resource-item-skeleton"
                    >
                      <UI.Skeleton variant="rounded" width={32} height={32} />
                      <div className="resource-item-body">
                        <UI.Skeleton variant="text" width="45%" height={18} />
                        <UI.Skeleton variant="text" width="80%" height={12} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {(() => {
              const listLoading = currentFolderId
                ? loadingChildrenIds.has(currentFolderId) &&
                  !childrenByParent[currentFolderId]
                : status === 'pending';
              if (listLoading || filteredList.length > 0) return null;
              return folderPath.length > 0 ? (
                <div className="resources-empty-state">
                  <FolderOpenOutlined />
                  <h3>This folder is empty</h3>
                </div>
              ) : (
                <div className="resources-empty-state">
                  {folder === 'websites' ? (
                    <LanguageOutlined />
                  ) : folder === 'gdrive' ? (
                    <img
                      src="/GOOGLE_DRIVE.svg"
                      alt=""
                      className="resources-empty-icon-img"
                    />
                  ) : folder === 'onedrive' ? (
                    <img
                      src="/ONEDRIVE.svg"
                      alt=""
                      className="resources-empty-icon-img"
                    />
                  ) : (
                    <FolderOpenOutlined />
                  )}
                  <h3>
                    {view === 'all'
                      ? 'No resources yet'
                      : folder === 'websites'
                        ? 'No websites yet'
                        : folder === 'gdrive'
                          ? 'No Google Drive items yet'
                          : folder === 'onedrive'
                            ? 'No OneDrive items yet'
                            : 'No files yet'}
                  </h3>
                  <p>
                    {folder === 'websites'
                      ? 'Add a URL to crawl and index its pages.'
                      : folder === 'gdrive'
                        ? 'Pick files or folders from Google Drive to import and keep in sync.'
                        : folder === 'onedrive'
                          ? 'Pick files or folders from OneDrive to import and keep in sync.'
                          : 'Upload files or paste text content for this MCP server to serve.'}
                  </p>
                  {view === 'sources' &&
                    (folder === 'gdrive' ? (
                      <UI.Button
                        variant="contained"
                        size="small"
                        onClick={handleOpenGoogleDrive}
                        disabled={gdriveLoadingToken}
                      >
                        <Add />
                        <span className="button-text">
                          {gdriveLoadingToken
                            ? 'Loading…'
                            : 'Add from Google Drive'}
                        </span>
                      </UI.Button>
                    ) : folder === 'onedrive' ? (
                      <UI.Button
                        variant="contained"
                        size="small"
                        onClick={handleOpenOneDrive}
                        disabled={onedriveLoadingToken}
                      >
                        <Add />
                        <span className="button-text">
                          {onedriveLoadingToken
                            ? 'Loading…'
                            : 'Add from OneDrive'}
                        </span>
                      </UI.Button>
                    ) : (
                      <UI.Button
                        variant="contained"
                        size="small"
                        onClick={() => startCreate(folderEmptyType)}
                      >
                        <Add />
                        <span className="button-text">{folderEmptyLabel}</span>
                      </UI.Button>
                    ))}
                </div>
              );
            })()}
            <div className="resources-items">
              {filteredList.map(renderResourceRow)}
            </div>
          </>
        )}
      </div>
      {(selectedResource || isCreating) && (
        <div className="resource-panel">
          <div
            className="panel-resize-handle"
            onMouseDown={handleResizeStart}
          />
          <div className="panel-header">
            <IconButton className="panel-back-btn" onClick={handleClose}>
              <ArrowBack />
            </IconButton>
            <h2 className="panel-title">
              {addingType === 'website'
                ? 'Add Website'
                : addingType === 'file'
                  ? 'New Resource'
                  : isEditing
                    ? 'Edit Resource'
                    : selectedResource!.title}
            </h2>
            {!isEditing && !isCreating && selectedResource && (
              <UI.Status status={selectedResource.status} variant="badge" />
            )}
            <div className="panel-actions">
              {!isEditing && !isCreating && (
                <>
                  <IconButton onClick={handleEdit} size="small">
                    <EditOutlined />
                  </IconButton>
                  <IconButton onClick={handleDeleteClick} size="small">
                    <DeleteOutline />
                  </IconButton>
                </>
              )}
              <IconButton className="panel-close-btn" onClick={handleClose}>
                <Close />
              </IconButton>
            </div>
          </div>
          <div className="panel-content">
            {addingType === 'website' ||
            (isEditing &&
              selectedResource?.sourceType ===
                utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE) ? (
              <div className="panel-edit-form">
                {addingType === 'website' && (
                  <UI.Input
                    label="URL"
                    name="uri"
                    placeholder="https://example.com"
                    value={websiteValues.uri}
                    disabled={submitting}
                    onChange={handleWebsiteChange}
                    error={!!errors.uri}
                    helperText={
                      errors.uri ||
                      'The starting URL. Same-origin links are followed.'
                    }
                  />
                )}
                <UI.Input
                  label="Title"
                  name="title"
                  placeholder="A name for this website"
                  value={websiteValues.title}
                  disabled={submitting}
                  onChange={handleWebsiteChange}
                  error={!!errors.title}
                  helperText={errors.title}
                />
                <UI.Input
                  label="Description"
                  name="description"
                  placeholder="What is on this site?"
                  value={websiteValues.description}
                  disabled={submitting}
                  onChange={handleWebsiteChange}
                  error={!!errors.description}
                  helperText={errors.description}
                  multiline
                  rows={2}
                />
                {addingType === 'website' && (
                  <div className="panel-crawl-grid">
                    <UI.Input
                      label="Max pages"
                      name="maxPages"
                      type="number"
                      value={websiteValues.maxPages}
                      disabled={submitting}
                      slotProps={{
                        htmlInput: {
                          min: 1,
                          max: utils.constants.CRAWL_MAX_PAGES_LIMIT
                        }
                      }}
                      onChange={handleWebsiteChange}
                      error={!!errors.maxPages}
                      helperText={
                        errors.maxPages ||
                        `1 – ${utils.constants.CRAWL_MAX_PAGES_LIMIT}`
                      }
                    />
                    <UI.Input
                      label="Max depth"
                      name="maxDepth"
                      type="number"
                      value={websiteValues.maxDepth}
                      disabled={submitting}
                      slotProps={{
                        htmlInput: {
                          min: 0,
                          max: utils.constants.CRAWL_MAX_DEPTH_LIMIT
                        }
                      }}
                      onChange={handleWebsiteChange}
                      error={!!errors.maxDepth}
                      helperText={
                        errors.maxDepth ||
                        `0 – ${utils.constants.CRAWL_MAX_DEPTH_LIMIT}`
                      }
                    />
                  </div>
                )}
                <div className="panel-edit-actions">
                  <UI.Button
                    variant="contained"
                    size="small"
                    className="small"
                    disabled={submitting}
                    onClick={isCreating ? handleCreateSubmit : handleUpdate}
                  >
                    {submitting
                      ? isCreating
                        ? 'Starting crawl...'
                        : 'Saving...'
                      : isCreating
                        ? 'Start crawl'
                        : 'Save'}
                  </UI.Button>
                  <UI.Button
                    size="small"
                    disabled={submitting}
                    onClick={handleCancel}
                  >
                    Cancel
                  </UI.Button>
                </div>
              </div>
            ) : isCreating || isEditing ? (
              <div className="panel-edit-form">
                <UI.Input
                  label="Title"
                  name="title"
                  placeholder="e.g. System Instructions"
                  value={editValues.title}
                  disabled={submitting}
                  onChange={handleEditChange}
                  error={!!errors.title}
                  helperText={
                    errors.title || 'A human-readable name for this resource'
                  }
                />
                <UI.Input
                  label="URI"
                  name="uri"
                  placeholder="resource://my-resource"
                  value={editValues.uri}
                  disabled={submitting}
                  onChange={handleEditChange}
                  error={!!errors.uri}
                  helperText={
                    errors.uri ||
                    'Auto-generated from title. Edit to customize.'
                  }
                />
                <UI.Select
                  label="Type"
                  name="type"
                  value={editValues.type}
                  disabled={submitting}
                  onChange={e =>
                    setEditValues(prev => ({
                      ...prev,
                      type: e.target.value as string
                    }))
                  }
                  helperText={
                    editValues.type === utils.constants.RESOURCE_TYPE_STATIC
                      ? "Fixed content that doesn't change"
                      : 'Dynamic content with variables (e.g. {userId})'
                  }
                  options={[
                    {
                      label: 'Static — Fixed content',
                      value: utils.constants.RESOURCE_TYPE_STATIC
                    },
                    {
                      label: 'Template — Dynamic with variables',
                      value: utils.constants.RESOURCE_TYPE_TEMPLATE
                    }
                  ]}
                />
                <UI.Input
                  label="Description"
                  name="description"
                  placeholder="What is this resource about?"
                  value={editValues.description}
                  disabled={submitting}
                  onChange={handleEditChange}
                  error={!!errors.description}
                  helperText={errors.description}
                  multiline
                  rows={2}
                />
                {isCreating && (
                  <div className="panel-content-mode">
                    <p className="panel-content-mode-label">Content source</p>
                    <div className="panel-content-mode-toggle">
                      <button
                        type="button"
                        className={`panel-content-mode-btn ${contentMode === 'file' ? 'active' : ''}`}
                        disabled={submitting}
                        onClick={() => setContentMode('file')}
                      >
                        <UploadFile />
                        File
                      </button>
                      <button
                        type="button"
                        className={`panel-content-mode-btn ${contentMode === 'text' ? 'active' : ''}`}
                        disabled={submitting}
                        onClick={() => {
                          setContentMode('text');
                          setFile(null);
                        }}
                      >
                        <TextFields />
                        Text
                      </button>
                    </div>
                  </div>
                )}
                {contentMode === 'text' ? (
                  <>
                    <UI.Select
                      label="MIME Type"
                      name="mimeType"
                      value={editValues.mimeType}
                      disabled={submitting}
                      onChange={e =>
                        setEditValues(prev => ({
                          ...prev,
                          mimeType: e.target.value as string
                        }))
                      }
                      options={utils.constants.TEXT_MIME_TYPES.map(t => ({
                        label: t,
                        value: t
                      }))}
                    />
                    <UI.Select
                      label="Encoding"
                      name="encoding"
                      value={editValues.encoding}
                      disabled={submitting}
                      onChange={e =>
                        setEditValues(prev => ({
                          ...prev,
                          encoding: e.target.value as string
                        }))
                      }
                      options={utils.constants.ENCODINGS.map(e => ({
                        label: e,
                        value: e
                      }))}
                    />
                    <UI.Input
                      label="Content"
                      name="content"
                      value={editValues.content}
                      disabled={submitting}
                      onChange={handleContentChange}
                      multiline
                      rows={8}
                    />
                    <p className="panel-size-hint">
                      Size: {formatSize(Number(editValues.size))}
                    </p>
                  </>
                ) : (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="panel-file-input-hidden"
                      onChange={handleFileChange}
                      disabled={submitting}
                    />
                    <div
                      className="panel-file-dropzone"
                      role="button"
                      tabIndex={0}
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                    >
                      {file ? (
                        <div className="panel-file-info">
                          {isImageMime(file.type) && (
                            <img
                              className="panel-file-preview"
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                            />
                          )}
                          <p className="panel-file-name">{file.name}</p>
                          <p className="panel-file-meta">
                            {file.type || 'unknown'} &middot;{' '}
                            {formatSize(file.size)}
                          </p>
                        </div>
                      ) : filePreviewUrl && selectedResource?.fileKey ? (
                        <div className="panel-file-info">
                          {isImageMime(selectedResource.mimeType) && (
                            <img
                              className="panel-file-preview"
                              src={filePreviewUrl}
                              alt={selectedResource.title}
                            />
                          )}
                          <p className="panel-file-name">
                            {selectedResource.title}
                          </p>
                          {selectedResource.fileName && (
                            <p className="panel-file-original">
                              {selectedResource.fileName}
                            </p>
                          )}
                          <p className="panel-file-meta">
                            {selectedResource.mimeType} &middot;{' '}
                            {formatSize(selectedResource.size)}
                          </p>
                          <p className="panel-file-hint">
                            Click to replace file
                          </p>
                        </div>
                      ) : (
                        <div className="panel-file-placeholder">
                          <UploadFile />
                          <p>Click to select a file</p>
                        </div>
                      )}
                    </div>
                    {errors.file && (
                      <p className="panel-file-error">{errors.file}</p>
                    )}
                  </>
                )}
                <div className="panel-advanced">
                  <button
                    type="button"
                    className="panel-advanced-toggle"
                    onClick={() => setShowAdvanced(prev => !prev)}
                  >
                    {showAdvanced ? <ExpandLess /> : <ExpandMore />}
                    Advanced options
                  </button>
                  {showAdvanced && (
                    <div className="panel-advanced-content">
                      <div className="panel-advanced-section">
                        <p className="panel-advanced-label">Audience</p>
                        <div className="panel-audience-checks">
                          {utils.constants.ROLE_MESSAGES.map(role => (
                            <FormControlLabel
                              key={role}
                              control={
                                <Checkbox
                                  size="small"
                                  disabled={submitting}
                                  checked={annotations.audience.includes(role)}
                                  onChange={e =>
                                    setAnnotations(prev => ({
                                      ...prev,
                                      audience: e.target.checked
                                        ? [...prev.audience, role]
                                        : prev.audience.filter(r => r !== role)
                                    }))
                                  }
                                />
                              }
                              label={role}
                            />
                          ))}
                        </div>
                      </div>
                      <UI.Input
                        label="Priority (0 to 1)"
                        name="priority"
                        type="number"
                        value={annotations.priority}
                        disabled={submitting}
                        slotProps={{ htmlInput: { min: 0, max: 1, step: 0.1 } }}
                        onChange={e =>
                          setAnnotations(prev => ({
                            ...prev,
                            priority: e.target.value
                          }))
                        }
                      />
                      <div className="panel-advanced-section">
                        <div className="panel-advanced-section-header">
                          <p className="panel-advanced-label">Icons</p>
                          <IconButton
                            size="small"
                            disabled={submitting}
                            onClick={() =>
                              setIcons(prev => [
                                ...prev,
                                { src: '', theme: '' }
                              ])
                            }
                          >
                            <Add />
                          </IconButton>
                        </div>
                        {icons.map((icon, i) => (
                          <div key={i} className="panel-icon-row">
                            <UI.Input
                              label="URL"
                              value={icon.src}
                              disabled={submitting}
                              onChange={e =>
                                setIcons(prev =>
                                  prev.map((ic, idx) =>
                                    idx === i
                                      ? { ...ic, src: e.target.value }
                                      : ic
                                  )
                                )
                              }
                            />
                            <UI.Select
                              label="Theme"
                              value={icon.theme}
                              disabled={submitting}
                              onChange={e =>
                                setIcons(prev =>
                                  prev.map((ic, idx) =>
                                    idx === i
                                      ? {
                                          ...ic,
                                          theme: e.target.value as string
                                        }
                                      : ic
                                  )
                                )
                              }
                              options={[
                                { label: 'None', value: '' },
                                ...utils.constants.RESOURCE_ICON_THEMES.map(
                                  t => ({
                                    label: t,
                                    value: t
                                  })
                                )
                              ]}
                            />
                            <IconButton
                              size="small"
                              disabled={submitting}
                              onClick={() =>
                                setIcons(prev =>
                                  prev.filter((_, idx) => idx !== i)
                                )
                              }
                            >
                              <RemoveCircleOutline />
                            </IconButton>
                          </div>
                        ))}
                        {icons.length === 0 && (
                          <p className="panel-advanced-hint">
                            No icons added yet.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="panel-edit-actions">
                  <UI.Button
                    variant="contained"
                    size="small"
                    disabled={submitting}
                    onClick={isCreating ? handleCreateSubmit : handleUpdate}
                  >
                    {submitting
                      ? isCreating
                        ? 'Creating...'
                        : 'Saving...'
                      : isCreating
                        ? 'Create'
                        : 'Save'}
                  </UI.Button>
                  <UI.Button
                    size="small"
                    disabled={submitting}
                    onClick={handleCancel}
                  >
                    Cancel
                  </UI.Button>
                </div>
              </div>
            ) : selectedResource ? (
              <div className="panel-view">
                {(() => {
                  const chain: Resource[] = [];
                  const seen = new Set<string>();
                  let cursor: Resource | undefined = selectedResource;
                  while (cursor && !seen.has(cursor.id)) {
                    seen.add(cursor.id);
                    chain.unshift(cursor);
                    if (!cursor.parentResourceId) break;
                    const parentId = cursor.parentResourceId;
                    cursor =
                      resources.find(r => r.id === parentId) ??
                      Object.values(childrenByParent)
                        .flat()
                        .find(r => r.id === parentId);
                  }
                  if (chain.length < 2) return null;
                  return (
                    <UI.Breadcrumbs
                      items={chain.map((item, idx) => ({
                        label: item.title,
                        onClick:
                          idx < chain.length - 1
                            ? () => handleSelect(item)
                            : undefined
                      }))}
                    />
                  );
                })()}
                <div className="panel-info-grid">
                  <div className="panel-info-item">
                    <span className="panel-info-label">Source</span>
                    <span className="panel-info-badge">
                      {selectedResource.sourceType}
                    </span>
                  </div>
                  <div className="panel-info-item">
                    <span className="panel-info-label">Type</span>
                    <span className="panel-info-badge">
                      {selectedResource.type}
                    </span>
                  </div>
                  <div className="panel-info-item">
                    <span className="panel-info-label">MIME Type</span>
                    <span className="panel-info-value">
                      {selectedResource.mimeType}
                    </span>
                  </div>
                  <div className="panel-info-item">
                    <span className="panel-info-label">Size</span>
                    <span className="panel-info-value">
                      {formatSize(selectedResource.size)}
                    </span>
                  </div>
                  {selectedResource.encoding && (
                    <div className="panel-info-item">
                      <span className="panel-info-label">Encoding</span>
                      <span className="panel-info-value">
                        {selectedResource.encoding}
                      </span>
                    </div>
                  )}
                  {selectedResource.fileName && (
                    <div className="panel-info-item">
                      <span className="panel-info-label">File name</span>
                      <UI.TruncatedText
                        text={selectedResource.fileName}
                        className="panel-info-value"
                      />
                    </div>
                  )}
                </div>
                <div className="panel-section">
                  <h3 className="panel-section-label">URI</h3>
                  <p className="panel-section-text">{selectedResource.uri}</p>
                </div>
                <div className="panel-section">
                  <h3 className="panel-section-label">Sources</h3>
                  <div className="panel-toggle-row">
                    <div>
                      <p className="panel-toggle-label">
                        {utils.isResourceSourceEnabled(selectedResource)
                          ? 'Cite this resource in replies'
                          : 'Hidden from citations'}
                      </p>
                      <p className="panel-toggle-hint">
                        When enabled, the agent will reference this resource as
                        a source in answers that use it.
                      </p>
                    </div>
                    <Switch
                      checked={utils.isResourceSourceEnabled(selectedResource)}
                      disabled={sourceVisibilityUpdating}
                      onChange={handleShowSourceToggle}
                    />
                  </div>
                </div>
                {selectedResource.description && (
                  <div className="panel-section">
                    <h3 className="panel-section-label">Description</h3>
                    <p className="panel-section-text">
                      {selectedResource.description}
                    </p>
                  </div>
                )}
                {selectedResource.fileKey && (
                  <div className="panel-section">
                    <h3 className="panel-section-label">File</h3>
                    {filePreviewError ? (
                      <p className="panel-file-error">{filePreviewError}</p>
                    ) : (
                      <>
                        {filePreviewUrl &&
                          isImageMime(selectedResource.mimeType) && (
                            <img
                              className="panel-view-image"
                              src={filePreviewUrl}
                              alt={selectedResource.title}
                            />
                          )}
                        <UI.Button
                          variant="outlined"
                          size="small"
                          onClick={handleViewFile}
                          disabled={!filePreviewUrl}
                        >
                          <OpenInNew />
                          <span className="button-text">
                            {filePreviewUrl ? (
                              'Open file'
                            ) : (
                              <UI.Skeleton
                                variant="text"
                                width={60}
                                height={14}
                              />
                            )}
                          </span>
                        </UI.Button>
                      </>
                    )}
                  </div>
                )}
                {selectedResource.content &&
                  (() => {
                    const text = selectedResource.content;
                    const threshold = 600;
                    const isLarge = text.length > threshold;
                    const expanded = expandedSections.has('content');
                    return (
                      <div className="panel-section">
                        <h3 className="panel-section-label">Content</h3>
                        {isLarge && !expanded ? (
                          <button
                            type="button"
                            className="panel-section-toggle"
                            onClick={() =>
                              setExpandedSections(prev => {
                                const next = new Set(prev);
                                next.add('content');
                                return next;
                              })
                            }
                          >
                            Show content ({text.length.toLocaleString()} chars)
                          </button>
                        ) : (
                          <>
                            <pre className="panel-content-pre">{text}</pre>
                            {isLarge && (
                              <button
                                type="button"
                                className="panel-section-toggle"
                                onClick={() =>
                                  setExpandedSections(prev => {
                                    const next = new Set(prev);
                                    next.delete('content');
                                    return next;
                                  })
                                }
                              >
                                Hide content
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}
                {selectedResource.metadata &&
                  Object.keys(selectedResource.metadata).length > 0 &&
                  renderCollapsibleJson(
                    'metadata',
                    'Metadata',
                    selectedResource.metadata
                  )}
                {selectedResource.annotations &&
                  Object.keys(selectedResource.annotations).length > 0 &&
                  renderCollapsibleJson(
                    'annotations',
                    'Annotations',
                    selectedResource.annotations
                  )}
              </div>
            ) : null}
          </div>
        </div>
      )}
      <UI.Alert
        open={deleteAlert}
        title="Delete resource"
        description={(() => {
          const title = resourceToDelete?.title ?? '';
          const isFolder = resourceToDelete
            ? isFolderResource(resourceToDelete)
            : false;
          const childCount = resourceToDelete?.childResourceCount ?? 0;
          if (isFolder && childCount > 0) {
            return `Are you sure you want to delete "${title}"? This will also remove ${childCount} item${childCount === 1 ? '' : 's'} inside. This action cannot be undone.`;
          }
          return `Are you sure you want to delete "${title}"? This action cannot be undone.`;
        })()}
        confirmText="Delete"
        cancelText="Cancel"
        loading={submitting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteAlert(false);
          setResourceToDelete(null);
        }}
      />
      <UI.Modal
        open={gdriveOpen}
        title="Import from Google Drive"
        width={820}
        onClose={() => {
          if (gdriveImporting) return;
          setGdriveOpen(false);
          setGdriveSelected(new Map());
        }}
        footer={
          <>
            <UI.Button
              size="small"
              className="small"
              disabled={gdriveImporting}
              onClick={() => {
                setGdriveOpen(false);
                setGdriveSelected(new Map());
              }}
            >
              Cancel
            </UI.Button>
            <UI.Button
              variant="contained"
              size="small"
              className="small"
              disabled={gdriveImporting || gdriveSelected.size === 0}
              onClick={handleGoogleDriveImport}
            >
              {gdriveImporting
                ? 'Importing…'
                : gdriveSelected.size === 0
                  ? 'Add selected'
                  : `Add selected (${gdriveSelected.size})`}
            </UI.Button>
          </>
        }
      >
        <UI.CloudDriveBrowser
          provider="google-drive"
          accessToken={gdriveToken}
          selected={gdriveSelected}
          onSelectionChange={setGdriveSelected}
          onTokenExpired={() => {
            setGdriveToken(null);
            setGdriveOpen(false);
            startGoogleDriveConnect();
          }}
        />
      </UI.Modal>
      <UI.Modal
        open={onedriveOpen}
        title="Import from OneDrive"
        width={820}
        onClose={() => {
          if (onedriveImporting) return;
          setOnedriveOpen(false);
          setOnedriveSelected(new Map());
        }}
        footer={
          <>
            <UI.Button
              size="small"
              className="small"
              disabled={onedriveImporting}
              onClick={() => {
                setOnedriveOpen(false);
                setOnedriveSelected(new Map());
              }}
            >
              Cancel
            </UI.Button>
            <UI.Button
              variant="contained"
              size="small"
              className="small"
              disabled={onedriveImporting || onedriveSelected.size === 0}
              onClick={handleOneDriveImport}
            >
              {onedriveImporting
                ? 'Importing…'
                : onedriveSelected.size === 0
                  ? 'Add selected'
                  : `Add selected (${onedriveSelected.size})`}
            </UI.Button>
          </>
        }
      >
        <UI.CloudDriveBrowser
          provider="onedrive"
          accessToken={onedriveToken}
          selected={onedriveSelected}
          onSelectionChange={setOnedriveSelected}
          onTokenExpired={() => {
            setOnedriveToken(null);
            setOnedriveOpen(false);
            startOneDriveConnect();
          }}
        />
      </UI.Modal>
    </Wrapper>
  );
};
