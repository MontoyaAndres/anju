import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import { utils } from '@anju/utils';
import {
  FolderOutlined,
  InsertDriveFileOutlined,
  Search,
  CloudOutlined,
  StarOutline,
  ErrorOutline,
  Close
} from '@mui/icons-material';

import { Breadcrumbs } from '../breadcrumbs';
import { Skeleton } from '../skeleton';
import { Wrapper } from './styles';

const FOLDER_MIME = utils.constants.MIMETYPE_APPLICATION_VND_GOOGLE_APPS_FOLDER;
const DRIVE_API_BASE = utils.constants.GOOGLE_DRIVE_API_BASE;
const LIST_FIELDS = utils.constants.GOOGLE_DRIVE_LIST_FIELDS;

export type GoogleDriveTab = (typeof utils.constants.GOOGLE_DRIVE_TABS)[number];

export interface GoogleDriveItem {
  fileId: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  iconLink?: string;
  webViewLink?: string;
  modifiedTime?: string;
  size?: number;
}

interface Crumb {
  id: string;
  name: string;
  driveId?: string;
}

interface DriveApiFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  iconLink?: string;
  webViewLink?: string;
  size?: string;
}

interface DriveListResponse {
  files?: DriveApiFile[];
  nextPageToken?: string;
}

interface SharedDrive {
  id: string;
  name: string;
}

interface SharedDriveListResponse {
  drives?: SharedDrive[];
  nextPageToken?: string;
}

const tabRootCrumb = (tab: GoogleDriveTab): Crumb => {
  if (tab === utils.constants.GOOGLE_DRIVE_TAB_MY_DRIVE) {
    return { id: 'root', name: utils.constants.GOOGLE_DRIVE_TAB_LABEL_MY_DRIVE };
  }
  if (tab === utils.constants.GOOGLE_DRIVE_TAB_SHARED_WITH_ME) {
    return {
      id: '__shared-with-me__',
      name: utils.constants.GOOGLE_DRIVE_TAB_LABEL_SHARED_WITH_ME
    };
  }
  if (tab === utils.constants.GOOGLE_DRIVE_TAB_SHARED_DRIVES) {
    return {
      id: '__shared-drives__',
      name: utils.constants.GOOGLE_DRIVE_TAB_LABEL_SHARED_DRIVES
    };
  }
  return {
    id: '__starred__',
    name: utils.constants.GOOGLE_DRIVE_TAB_LABEL_STARRED
  };
};

const formatRelativeTime = (iso?: string): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return date.toLocaleDateString();
};

const friendlyMime = (mimeType: string): string => {
  if (mimeType === FOLDER_MIME) return 'Folder';
  if (mimeType.startsWith('application/vnd.google-apps.')) {
    return mimeType
      .replace('application/vnd.google-apps.', 'Google ')
      .replace(/^./, c => c.toUpperCase());
  }
  return mimeType;
};

const buildListQuery = (
  tab: GoogleDriveTab,
  path: Crumb[],
  search: string
): { params: URLSearchParams; isDriveList: boolean } => {
  const params = new URLSearchParams({
    fields: LIST_FIELDS,
    pageSize: '100',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
    orderBy: 'folder,name'
  });

  const hasSearch = search.trim().length > 0;
  const nameClause = hasSearch
    ? `name contains '${search.replace(/'/g, "\\'")}'`
    : '';

  const isAtRoot = path.length === 1;

  if (
    tab === utils.constants.GOOGLE_DRIVE_TAB_SHARED_DRIVES &&
    isAtRoot &&
    !hasSearch
  ) {
    return {
      params: new URLSearchParams({ pageSize: '100' }),
      isDriveList: true
    };
  }

  const current = path[path.length - 1];
  const driveId =
    tab === utils.constants.GOOGLE_DRIVE_TAB_SHARED_DRIVES
      ? current.driveId
      : undefined;
  if (driveId) {
    params.set('corpora', 'drive');
    params.set('driveId', driveId);
  }

  const clauses: string[] = ['trashed = false'];

  if (hasSearch) {
    clauses.push(nameClause);
    // Scope to the current tab so search results match the user's mental model.
    if (tab === utils.constants.GOOGLE_DRIVE_TAB_MY_DRIVE) {
      clauses.push("'me' in owners");
    } else if (tab === utils.constants.GOOGLE_DRIVE_TAB_SHARED_WITH_ME) {
      clauses.push('sharedWithMe');
    } else if (tab === utils.constants.GOOGLE_DRIVE_TAB_STARRED) {
      clauses.push('starred');
    }
  } else if (isAtRoot) {
    if (tab === utils.constants.GOOGLE_DRIVE_TAB_MY_DRIVE) {
      clauses.push("'root' in parents");
    } else if (tab === utils.constants.GOOGLE_DRIVE_TAB_SHARED_WITH_ME) {
      clauses.push('sharedWithMe');
    } else if (tab === utils.constants.GOOGLE_DRIVE_TAB_STARRED) {
      clauses.push('starred');
    }
  } else {
    clauses.push(`'${current.id}' in parents`);
  }

  params.set('q', clauses.join(' and '));
  return { params, isDriveList: false };
};

export interface IProps {
  accessToken: string | null;
  defaultTab?: GoogleDriveTab;
  selected?: Map<string, GoogleDriveItem>;
  onSelectionChange?: (selected: Map<string, GoogleDriveItem>) => void;
  onTokenExpired?: () => void;
  emptyText?: string;
}

export const GoogleDriveBrowser = (props: IProps) => {
  const {
    accessToken,
    defaultTab = utils.constants.GOOGLE_DRIVE_TAB_MY_DRIVE,
    selected: controlledSelected,
    onSelectionChange,
    onTokenExpired,
    emptyText = 'No files in this folder'
  } = props;

  const [tab, setTab] = useState<GoogleDriveTab>(defaultTab);
  const [path, setPath] = useState<Crumb[]>([tabRootCrumb(defaultTab)]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<GoogleDriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalSelected, setInternalSelected] = useState<
    Map<string, GoogleDriveItem>
  >(new Map());

  const selected = controlledSelected ?? internalSelected;

  const onTokenExpiredRef = useRef(onTokenExpired);
  useEffect(() => {
    onTokenExpiredRef.current = onTokenExpired;
  }, [onTokenExpired]);

  useEffect(() => {
    if (searchInput === search) return;
    const handle = setTimeout(() => {
      setSearch(searchInput);
    }, utils.constants.SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput, search]);

  const resetSearch = () => {
    setSearchInput('');
    setSearch('');
  };

  const updateSelected = useCallback(
    (next: Map<string, GoogleDriveItem>) => {
      if (!controlledSelected) setInternalSelected(next);
      onSelectionChange?.(next);
    },
    [controlledSelected, onSelectionChange]
  );

  useEffect(() => {
    if (!accessToken) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { params, isDriveList } = buildListQuery(tab, path, search);
        const endpoint = isDriveList
          ? `${DRIVE_API_BASE}/drives`
          : `${DRIVE_API_BASE}/files`;
        const response = await fetch(`${endpoint}?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (response.status === 401) {
          if (!cancelled) {
            onTokenExpiredRef.current?.();
            setError(
              'Google Drive session expired. Please reconnect and try again.'
            );
            setItems([]);
          }
          return;
        }
        if (!response.ok) {
          const detail = await response.text().catch(() => '');
          throw new Error(`Drive API ${response.status}: ${detail}`);
        }
        if (isDriveList) {
          const payload = (await response.json()) as SharedDriveListResponse;
          if (cancelled) return;
          setItems(
            (payload.drives || []).map(drive => ({
              fileId: drive.id,
              name: drive.name,
              mimeType: FOLDER_MIME,
              isFolder: true
            }))
          );
        } else {
          const payload = (await response.json()) as DriveListResponse;
          if (cancelled) return;
          setItems(
            (payload.files || []).map(file => ({
              fileId: file.id,
              name: file.name,
              mimeType: file.mimeType,
              isFolder: file.mimeType === FOLDER_MIME,
              iconLink: file.iconLink,
              webViewLink: file.webViewLink,
              modifiedTime: file.modifiedTime,
              size: file.size ? Number(file.size) : undefined
            }))
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, tab, path, search]);

  const handleTabChange = (next: GoogleDriveTab) => {
    if (next === tab) return;
    setTab(next);
    setPath([tabRootCrumb(next)]);
    resetSearch();
  };

  const handleOpenFolder = (item: GoogleDriveItem) => {
    const currentDriveId =
      path.length > 0 ? path[path.length - 1].driveId : undefined;
    const nextDriveId =
      tab === utils.constants.GOOGLE_DRIVE_TAB_SHARED_DRIVES &&
      path.length === 1
        ? item.fileId
        : currentDriveId;
    setPath(prev => [
      ...prev,
      { id: item.fileId, name: item.name, driveId: nextDriveId }
    ]);
    resetSearch();
  };

  const handleBreadcrumb = (index: number) => {
    setPath(prev => prev.slice(0, index + 1));
    resetSearch();
  };

  const toggleItem = (item: GoogleDriveItem) => {
    const next = new Map(selected);
    if (next.has(item.fileId)) {
      next.delete(item.fileId);
    } else {
      next.set(item.fileId, item);
    }
    updateSelected(next);
  };

  const breadcrumbItems = useMemo(
    () =>
      path.map((crumb, index) => ({
        label: crumb.name,
        onClick:
          index < path.length - 1 ? () => handleBreadcrumb(index) : undefined
      })),
    [path]
  );

  const ancestorSelectedCrumb = useMemo(() => {
    // path[0] is a synthetic tab root that's never a real Drive file.
    for (let i = 1; i < path.length; i++) {
      const crumb = path[i];
      if (selected.has(crumb.id)) return crumb;
    }
    return null;
  }, [path, selected]);

  const renderRow = (item: GoogleDriveItem) => {
    const isSelected = selected.has(item.fileId);
    const coveredByAncestor = !!ancestorSelectedCrumb && !isSelected;
    const effectiveSelected = isSelected || coveredByAncestor;
    const ancestorTitle = ancestorSelectedCrumb
      ? `Already included via "${ancestorSelectedCrumb.name}"`
      : undefined;

    const onActivate = () => {
      if (item.isFolder) {
        handleOpenFolder(item);
      } else if (!coveredByAncestor) {
        toggleItem(item);
      }
    };

    return (
      <div
        key={item.fileId}
        className={`gdrive-row ${effectiveSelected ? 'selected' : ''} ${coveredByAncestor ? 'covered' : ''}`}
        role="button"
        tabIndex={0}
        title={coveredByAncestor ? ancestorTitle : undefined}
        onClick={onActivate}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onActivate();
          }
        }}
      >
        <Checkbox
          className="gdrive-row-checkbox"
          size="small"
          checked={effectiveSelected}
          disabled={coveredByAncestor}
          onClick={e => e.stopPropagation()}
          onChange={() => {
            if (!coveredByAncestor) toggleItem(item);
          }}
        />
        <div className="gdrive-row-icon">
          {item.isFolder ? (
            <FolderOutlined />
          ) : item.iconLink ? (
            <img src={item.iconLink} alt="" />
          ) : (
            <InsertDriveFileOutlined />
          )}
        </div>
        <div className="gdrive-row-body">
          <p className="gdrive-row-name">{item.name}</p>
          {!item.isFolder && item.size != null && (
            <p className="gdrive-row-meta">
              {(item.size / 1024).toFixed(0)} KB
            </p>
          )}
        </div>
        <div className="gdrive-row-type">{friendlyMime(item.mimeType)}</div>
        <div className="gdrive-row-time">
          {formatRelativeTime(item.modifiedTime)}
        </div>
      </div>
    );
  };

  const showSearch = !(
    tab === utils.constants.GOOGLE_DRIVE_TAB_SHARED_DRIVES && path.length === 1
  );

  return (
    <Wrapper>
      <Tabs
        className="gdrive-tabs"
        value={tab}
        onChange={(_, value) => handleTabChange(value as GoogleDriveTab)}
        variant="scrollable"
        scrollButtons="auto"
      >
        {utils.constants.GOOGLE_DRIVE_TAB_LABELS.map(t => (
          <Tab
            key={t.value}
            value={t.value}
            label={t.label}
            icon={
              t.value === utils.constants.GOOGLE_DRIVE_TAB_SHARED_DRIVES ? (
                <CloudOutlined fontSize="small" />
              ) : t.value === utils.constants.GOOGLE_DRIVE_TAB_STARRED ? (
                <StarOutline fontSize="small" />
              ) : undefined
            }
            iconPosition="start"
          />
        ))}
      </Tabs>

      <Breadcrumbs items={breadcrumbItems} />

      {showSearch && (
        <div className="gdrive-toolbar">
          <div className={`gdrive-search ${searchInput ? 'has-value' : ''}`}>
            <Search />
            <input
              type="text"
              placeholder="Search across this tab"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <IconButton
                className="gdrive-search-clear"
                size="small"
                aria-label="Clear search"
                onClick={resetSearch}
              >
                <Close fontSize="small" />
              </IconButton>
            )}
          </div>
          {selected.size > 0 && (
            <span className="gdrive-selection-info">
              {selected.size} selected
            </span>
          )}
        </div>
      )}

      {selected.size > 0 && (
        <div className="gdrive-selected-tray">
          <div className="gdrive-selected-list">
            {Array.from(selected.values()).map(item => (
              <div
                key={item.fileId}
                className="gdrive-selected-chip"
                title={item.name}
              >
                <span className="gdrive-chip-icon">
                  {item.isFolder ? (
                    <FolderOutlined fontSize="inherit" />
                  ) : item.iconLink ? (
                    <img src={item.iconLink} alt="" />
                  ) : (
                    <InsertDriveFileOutlined fontSize="inherit" />
                  )}
                </span>
                <span className="gdrive-chip-name">{item.name}</span>
                <IconButton
                  className="gdrive-chip-remove"
                  size="small"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => toggleItem(item)}
                >
                  <Close fontSize="inherit" />
                </IconButton>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="gdrive-selected-clear"
            onClick={() => updateSelected(new Map())}
          >
            Clear all
          </button>
        </div>
      )}

      {error && (
        <div className="gdrive-error" role="alert">
          <ErrorOutline fontSize="small" style={{ verticalAlign: 'middle' }} />{' '}
          {error}
        </div>
      )}

      <div className="gdrive-list">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="gdrive-row" style={{ cursor: 'default' }}>
              <Skeleton variant="rounded" width={18} height={18} />
              <Skeleton variant="rounded" width={20} height={20} />
              <Skeleton variant="text" width="60%" height={14} />
              <Skeleton variant="text" width="80%" height={12} />
              <Skeleton variant="text" width="60%" height={12} />
            </div>
          ))}

        {!loading && items.length === 0 && !error && (
          <div className="gdrive-empty">
            <FolderOutlined />
            <p>{emptyText}</p>
          </div>
        )}

        {!loading && items.map(renderRow)}
      </div>
    </Wrapper>
  );
};
