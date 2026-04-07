import { useCallback, useEffect, useRef, useState } from 'react';
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
  TextFields
} from '@mui/icons-material';

import { Wrapper } from './styles';

interface Resource {
  id: string;
  title: string;
  uri: string;
  type: string;
  description: string | null;
  mimeType: string;
  content: string | null;
  size: number;
  encoding: string | null;
  fileKey: string | null;
  annotations: Record<string, unknown> | null;
  icons: { src: string }[] | null;
  metadata: Record<string, unknown> | null;
  artifactId: string;
  createdAt: string;
  updatedAt: string;
}

const INITIAL_EDIT_VALUES = {
  title: '',
  uri: '',
  type: 'static',
  description: '',
  mimeType: utils.constants.MIMETYPE_TEXT,
  content: '',
  size: '0',
  encoding: 'utf-8'
};

export const Resources = () => {
  const router = useRouter();
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editValues, setEditValues] = useState(INITIAL_EDIT_VALUES);
  const [status, setStatus] = useState<
    'idle' | 'pending' | 'resolved' | 'rejected'
  >('idle');
  const [deleteAlert, setDeleteAlert] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contentMode, setContentMode] = useState<'text' | 'file'>('text');
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [filePreviewError, setFilePreviewError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [panelWidth, setPanelWidth] = useState(480);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const { id: organizationId, projectId } = router.query as {
    id: string;
    projectId: string;
  };
  const apiBase = `/organization/${organizationId}/project/${projectId}/artifact/resource`;

  const fetchResources = useCallback(async () => {
    if (!organizationId || !projectId) return;
    setStatus('pending');
    try {
      const data = await utils.fetcher({
        url: apiBase,
        config: { credentials: 'include' }
      });
      if (data && !data.error) {
        setResources(data);
      }
    } catch {
      setStatus('rejected');
      return;
    }
    setStatus('resolved');
  }, [organizationId, projectId, apiBase]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

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
    setIsCreating(false);
  };

  const handleCreate = () => {
    setSelectedResource(null);
    setIsEditing(false);
    setIsCreating(true);
    setEditValues(INITIAL_EDIT_VALUES);
    setContentMode('text');
    setFile(null);
  };

  const handleCreateSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const data = await utils.fetcher({
        url: apiBase,
        config: {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({
            title: editValues.title,
            uri: editValues.uri,
            type: editValues.type,
            description: editValues.description,
            mimeType: editValues.mimeType,
            content:
              contentMode === 'text'
                ? editValues.content || undefined
                : undefined,
            size: Number(editValues.size),
            encoding: editValues.encoding || undefined
          })
        }
      });

      if (data && !data.error) {
        if (contentMode === 'file' && file) {
          await uploadFile(data.id);
        }
        setIsCreating(false);
        setFile(null);
        setSelectedResource(data);
        fetchResources();
      }
    } catch {
      // handle error
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = () => {
    if (!selectedResource) return;
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
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (isCreating) {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setSelectedResource(null);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleUpdate = async () => {
    if (!selectedResource || submitting) return;
    setSubmitting(true);
    try {
      const data = await utils.fetcher({
        url: `${apiBase}/${selectedResource.id}`,
        config: {
          method: 'PUT',
          credentials: 'include',
          body: JSON.stringify({
            title: editValues.title,
            uri: editValues.uri,
            type: editValues.type,
            description: editValues.description,
            mimeType: editValues.mimeType,
            content:
              contentMode === 'text'
                ? editValues.content || undefined
                : undefined,
            size: Number(editValues.size),
            encoding: editValues.encoding || undefined
          })
        }
      });

      if (data && !data.error) {
        if (contentMode === 'file' && file) {
          await uploadFile(data.id);
        }
        setSelectedResource(data);
        setFile(null);
        setIsEditing(false);
        fetchResources();
      }
    } catch {
      // handle error
    } finally {
      setSubmitting(false);
    }
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
        config: {
          method: 'DELETE',
          credentials: 'include'
        }
      });

      if (data && !data.error) {
        setDeleteAlert(false);
        setSelectedResource(null);
        setIsEditing(false);
        fetchResources();
      }
    } catch {
      // handle error
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewFile = () => {
    if (filePreviewUrl) {
      window.open(filePreviewUrl, '_blank');
    }
  };

  const isImageMime = (mime: string) => mime.startsWith('image/');

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
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
    setEditValues(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setEditValues(prev => ({
      ...prev,
      mimeType:
        selected.type || utils.constants.MIMETYPE_APPLICATION_OCTET_STREAM,
      size: String(selected.size),
      title: prev.title || selected.name
    }));
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

  return (
    <Wrapper panelWidth={panelWidth}>
      <div
        className={`resources-list ${selectedResource || isCreating ? 'has-selection' : ''}`}
      >
        <div className="resources-header">
          <h1 className="resources-title">Resources</h1>
          <UI.Button variant="contained" size="small" onClick={handleCreate}>
            <Add />
            <span className="button-text">New resource</span>
          </UI.Button>
        </div>
        {status === 'pending' && resources.length === 0 && (
          <p className="resources-empty">Loading...</p>
        )}
        {status !== 'pending' && resources.length === 0 && (
          <p className="resources-empty">No resources yet.</p>
        )}
        <div className="resources-items">
          {resources.map(resource => (
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
              <div className="resource-item-top">
                <p className="resource-item-title">{resource.title}</p>
                <span className="resource-item-type">{resource.type}</span>
              </div>
              <div className="resource-item-meta">
                <span>{resource.mimeType}</span>
                {resource.encoding && <span>{resource.encoding}</span>}
                {resource.size > 0 && <span>{formatSize(resource.size)}</span>}
              </div>
            </div>
          ))}
        </div>
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
              {isCreating
                ? 'New Resource'
                : isEditing
                  ? 'Edit Resource'
                  : selectedResource!.title}
            </h2>
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
            {isCreating || isEditing ? (
              <div className="panel-edit-form">
                <UI.Input
                  label="Title"
                  name="title"
                  value={editValues.title}
                  disabled={submitting}
                  onChange={handleEditChange}
                />
                <UI.Input
                  label="URI"
                  name="uri"
                  value={editValues.uri}
                  disabled={submitting}
                  onChange={handleEditChange}
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
                  options={utils.constants.RESOURCE_TYPES.map(t => ({
                    label: t,
                    value: t
                  }))}
                />
                <UI.Input
                  label="Description"
                  name="description"
                  value={editValues.description}
                  disabled={submitting}
                  onChange={handleEditChange}
                  multiline
                  rows={2}
                />
                {isCreating && (
                  <div className="panel-content-mode">
                    <p className="panel-content-mode-label">Content source</p>
                    <div className="panel-content-mode-toggle">
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
                      <button
                        type="button"
                        className={`panel-content-mode-btn ${contentMode === 'file' ? 'active' : ''}`}
                        disabled={submitting}
                        onClick={() => setContentMode('file')}
                      >
                        <UploadFile />
                        File
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
                  </>
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
                <div className="panel-info-grid">
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
                            {filePreviewUrl ? 'Open file' : 'Loading...'}
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
