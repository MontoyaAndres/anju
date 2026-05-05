import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { UI } from '@anju/ui';
import { utils } from '@anju/utils';
import IconButton from '@mui/material/IconButton';
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
  Search
} from '@mui/icons-material';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Wrapper } from './styles';

interface Resource {
  id: string;
  title: string;
  uri: string;
  type: string;
  sourceType: string;
  status: string;
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
type FolderId = 'files' | 'websites' | null;
type AddingType = 'file' | 'website' | null;

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
  const [submitting, setSubmitting] = useState(false);
  const [contentMode, setContentMode] = useState<'text' | 'file'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [filePreviewError, setFilePreviewError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
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
  const isCreating = addingType !== null;

  const fileResources = useMemo(
    () =>
      resources.filter(
        r => r.sourceType === utils.constants.RESOURCE_SOURCE_TYPE_FILE
      ),
    [resources]
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

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list: Resource[];
    if (view === 'all') {
      list = resources.filter(r => !r.parentResourceId);
    } else if (folder === 'files') {
      list = fileResources;
    } else if (folder === 'websites') {
      list = websiteParents;
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
  }, [view, folder, fileResources, websiteParents, resources, search]);

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

  const openParentId =
    selectedResource?.parentResourceId ||
    (selectedResource?.sourceType ===
      utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE &&
    !selectedResource?.parentResourceId
      ? selectedResource.id
      : null);

  useEffect(() => {
    if (!openParentId) return;
    if (childrenByParent[openParentId]) return;
    const controller = new AbortController();
    fetchChildren(openParentId, controller.signal);
    return () => controller.abort();
  }, [openParentId]);

  const openParentRecord = openParentId
    ? resources.find(r => r.id === openParentId)
    : null;
  const openChildren = openParentId
    ? childrenByParent[openParentId] || []
    : [];
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
    if (match && selectedResource?.id !== match.id) {
      setSelectedResource(match);
      setIsEditing(false);
      setAddingType(null);
      if (
        match.sourceType === utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE &&
        view === 'sources'
      ) {
        setFolder('websites');
      } else if (
        match.sourceType === utils.constants.RESOURCE_SOURCE_TYPE_FILE &&
        view === 'sources'
      ) {
        setFolder('files');
      }
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

  const handleSelect = (resource: Resource) => {
    setSelectedResource(resource);
    setIsEditing(false);
    setAddingType(null);
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
        setSelectedResource(data);
        fetchResources();
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
    setDeleteAlert(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedResource || submitting) return;
    setSubmitting(true);
    try {
      const data = await utils.fetcher({
        url: `${apiBase}/${selectedResource.id}`,
        config: { method: 'DELETE', credentials: 'include' }
      });
      if (data && !data.error) {
        setDeleteAlert(false);
        setSelectedResource(null);
        setIsEditing(false);
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
    const formData = new FormData();
    formData.append('file', file);
    await utils.fetcher({
      url: `${apiBase}/${resourceId}/upload`,
      config: {
        method: 'POST',
        credentials: 'include',
        body: formData
      }
    });
  };

  const renderFolderHome = () => (
    <div className="resources-folders">
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
    </div>
  );

  const renderResourceRow = (resource: Resource) => {
    const isWebsite =
      resource.sourceType === utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE;
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
            <FolderOpenOutlined />
          )}
        </div>
        <div className="resource-item-body">
          <div className="resource-item-top">
            <p className="resource-item-title">{resource.title}</p>
            <UI.Status status={resource.status} />
            <span className="resource-item-type">
              {isWebsite ? 'Website' : resource.mimeType}
            </span>
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
      </div>
    );
  };

  const folderTitle =
    folder === 'files'
      ? 'My folder'
      : folder === 'websites'
        ? 'Websites'
        : '';
  const folderEmptyLabel =
    folder === 'websites' ? 'Add website' : 'Add files';
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
            {view === 'sources' && folder !== null && (
              <button
                type="button"
                className="resources-back"
                onClick={() => setFolder(null)}
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
            {view === 'sources' && folder === 'files' && (
              <UI.Button
                variant="contained"
                size="small"
                onClick={() => startCreate('file')}
              >
                <Add />
                <span className="button-text">Add files</span>
              </UI.Button>
            )}
            {view === 'sources' && folder === 'websites' && (
              <UI.Button
                variant="contained"
                size="small"
                onClick={() => startCreate('website')}
              >
                <Add />
                <span className="button-text">Add website</span>
              </UI.Button>
            )}
          </div>
        )}
        {view === 'sources' && folder !== null && (
          <h2 className="resources-folder-heading">{folderTitle}</h2>
        )}
        {view === 'sources' && folder === null && renderFolderHome()}
        {(view === 'all' || folder !== null) && (
          <>
            {status === 'pending' && filteredList.length === 0 && (
              <div className="resources-items">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="resource-item resource-item-skeleton">
                    <UI.Skeleton variant="rounded" width={32} height={32} />
                    <div className="resource-item-body">
                      <UI.Skeleton variant="text" width="45%" height={18} />
                      <UI.Skeleton variant="text" width="80%" height={12} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {status !== 'pending' && filteredList.length === 0 && (
              <div className="resources-empty-state">
                {folder === 'websites' ? (
                  <LanguageOutlined />
                ) : (
                  <FolderOpenOutlined />
                )}
                <h3>
                  {view === 'all'
                    ? 'No resources yet'
                    : folder === 'websites'
                      ? 'No websites yet'
                      : 'No files yet'}
                </h3>
                <p>
                  {folder === 'websites'
                    ? 'Add a URL to crawl and index its pages.'
                    : 'Upload files or paste text content for this MCP server to serve.'}
                </p>
                {view === 'sources' && (
                  <UI.Button
                    variant="contained"
                    size="small"
                    onClick={() => startCreate(folderEmptyType)}
                  >
                    <Add />
                    <span className="button-text">{folderEmptyLabel}</span>
                  </UI.Button>
                )}
              </div>
            )}
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
                {selectedResource.parentResourceId &&
                  (() => {
                    const parent = resources.find(
                      r => r.id === selectedResource.parentResourceId
                    );
                    if (!parent) return null;
                    return (
                      <button
                        type="button"
                        className="panel-parent-back"
                        onClick={() => handleSelect(parent)}
                      >
                        <ArrowBack />
                        <span>Back to {parent.title}</span>
                      </button>
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
                      <span className="panel-info-value">
                        {selectedResource.fileName}
                      </span>
                    </div>
                  )}
                </div>
                <div className="panel-section">
                  <h3 className="panel-section-label">URI</h3>
                  <p className="panel-section-text">{selectedResource.uri}</p>
                </div>
                {selectedResource.description && (
                  <div className="panel-section">
                    <h3 className="panel-section-label">Description</h3>
                    <p className="panel-section-text">
                      {selectedResource.description}
                    </p>
                  </div>
                )}
                {selectedResource.sourceType ===
                  utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE &&
                  selectedResource.crawlConfig && (
                    <div className="panel-section">
                      <h3 className="panel-section-label">Crawl config</h3>
                      <p className="panel-section-text">
                        Max pages:{' '}
                        {selectedResource.crawlConfig.maxPages ??
                          utils.constants.CRAWL_DEFAULT_MAX_PAGES}{' '}
                        · Max depth:{' '}
                        {selectedResource.crawlConfig.maxDepth ??
                          utils.constants.CRAWL_DEFAULT_MAX_DEPTH}
                      </p>
                    </div>
                  )}
                {selectedResource.sourceType ===
                  utils.constants.RESOURCE_SOURCE_TYPE_WEBSITE &&
                  !selectedResource.parentResourceId &&
                  (() => {
                    const children = childrenByParent[selectedResource.id];
                    const isLoading =
                      children === undefined &&
                      loadingChildrenIds.has(selectedResource.id);
                    const expectedCount =
                      selectedResource.childResourceCount ?? 0;
                    if (
                      !isLoading &&
                      (!children || children.length === 0) &&
                      expectedCount === 0
                    )
                      return null;
                    return (
                      <div className="panel-section">
                        <h3 className="panel-section-label">
                          Pages ({children?.length ?? expectedCount})
                        </h3>
                        {isLoading && !children ? (
                          <div className="panel-children">
                            {Array.from({ length: Math.min(expectedCount, 3) || 1 }).map(
                              (_, i) => (
                                <UI.Skeleton
                                  key={i}
                                  variant="rounded"
                                  height={36}
                                />
                              )
                            )}
                          </div>
                        ) : (
                          <div className="panel-children">
                            {(children || []).map(child => (
                              <button
                                type="button"
                                key={child.id}
                                className="panel-child-row"
                                onClick={() => handleSelect(child)}
                              >
                                <span className="panel-child-title">
                                  {child.title}
                                </span>
                                <UI.Status status={child.status} />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
                {selectedResource.content && (
                  <div className="panel-section">
                    <h3 className="panel-section-label">Content</h3>
                    <pre className="panel-content-pre">
                      {selectedResource.content}
                    </pre>
                  </div>
                )}
                {selectedResource.metadata &&
                  Object.keys(selectedResource.metadata).length > 0 && (
                    <div className="panel-section">
                      <h3 className="panel-section-label">Metadata</h3>
                      <pre className="panel-content-pre">
                        {JSON.stringify(selectedResource.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                {selectedResource.annotations &&
                  Object.keys(selectedResource.annotations).length > 0 && (
                    <div className="panel-section">
                      <h3 className="panel-section-label">Annotations</h3>
                      <pre className="panel-content-pre">
                        {JSON.stringify(selectedResource.annotations, null, 2)}
                      </pre>
                    </div>
                  )}
              </div>
            ) : null}
          </div>
        </div>
      )}
      <UI.Alert
        open={deleteAlert}
        title="Delete resource"
        description={`Are you sure you want to delete "${selectedResource?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        loading={submitting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteAlert(false)}
      />
    </Wrapper>
  );
};
