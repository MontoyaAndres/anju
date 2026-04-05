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
  ArrowBack
} from '@mui/icons-material';

import { Wrapper } from './styles';

interface Prompt {
  id: string;
  title: string;
  description: string | null;
  messages: { role: 'user' | 'assistant'; content: string }[];
  schema: Record<string, unknown>;
  artifactId: string;
  createdAt: string;
  updatedAt: string;
}

export const Prompts = () => {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editValues, setEditValues] = useState({
    title: '',
    description: '',
    messages: ''
  });
  const [status, setStatus] = useState<
    'idle' | 'pending' | 'resolved' | 'rejected'
  >('idle');
  const [deleteAlert, setDeleteAlert] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [panelWidth, setPanelWidth] = useState(480);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const { id: organizationId, projectId } = router.query as {
    id: string;
    projectId: string;
  };
  const apiBase = `/organization/${organizationId}/project/${projectId}/artifact/prompt`;

  const fetchPrompts = useCallback(async () => {
    if (!organizationId || !projectId) return;
    setStatus('pending');
    try {
      const data = await utils.fetcher({
        url: apiBase,
        config: { credentials: 'include' }
      });
      if (data && !data.error) {
        setPrompts(data);
      }
    } catch {
      setStatus('rejected');
      return;
    }
    setStatus('resolved');
  }, [organizationId, projectId, apiBase]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const handleSelect = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setSelectedPrompt(null);
    setIsEditing(false);
    setIsCreating(true);
    setEditValues({
      title: '',
      description: '',
      messages: JSON.stringify([{ role: 'user', content: '' }], null, 2)
    });
  };

  const handleCreateSubmit = async () => {
    if (submitting) return;
    let parsedMessages;
    try {
      parsedMessages = JSON.parse(editValues.messages);
    } catch {
      return;
    }

    setSubmitting(true);
    try {
      const data = await utils.fetcher({
        url: apiBase,
        config: {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({
            title: editValues.title,
            description: editValues.description,
            messages: parsedMessages,
            schema: { type: 'object', properties: {} }
          })
        }
      });

      if (data && !data.error) {
        setIsCreating(false);
        setSelectedPrompt(data);
        fetchPrompts();
      }
    } catch {
      // handle error
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = () => {
    if (!selectedPrompt) return;
    setEditValues({
      title: selectedPrompt.title,
      description: selectedPrompt.description || '',
      messages: JSON.stringify(selectedPrompt.messages, null, 2)
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (isCreating) {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setSelectedPrompt(null);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleUpdate = async () => {
    if (!selectedPrompt || submitting) return;
    let parsedMessages;
    try {
      parsedMessages = JSON.parse(editValues.messages);
    } catch {
      return;
    }

    setSubmitting(true);
    try {
      const data = await utils.fetcher({
        url: `${apiBase}/${selectedPrompt.id}`,
        config: {
          method: 'PUT',
          credentials: 'include',
          body: JSON.stringify({
            title: editValues.title,
            description: editValues.description,
            messages: parsedMessages,
            schema: selectedPrompt.schema
          })
        }
      });

      if (data && !data.error) {
        setSelectedPrompt(data);
        setIsEditing(false);
        fetchPrompts();
      }
    } catch {
      // handle error
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    if (!selectedPrompt) return;
    setDeleteAlert(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPrompt || submitting) return;
    setSubmitting(true);
    try {
      const data = await utils.fetcher({
        url: `${apiBase}/${selectedPrompt.id}`,
        config: {
          method: 'DELETE',
          credentials: 'include'
        }
      });

      if (data && !data.error) {
        setDeleteAlert(false);
        setSelectedPrompt(null);
        setIsEditing(false);
        fetchPrompts();
      }
    } catch {
      // handle error
    } finally {
      setSubmitting(false);
    }
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

  return (
    <Wrapper panelWidth={panelWidth}>
      <div className={`prompts-list ${selectedPrompt || isCreating ? 'has-selection' : ''}`}>
        <div className="prompts-header">
          <h1 className="prompts-title">Prompts</h1>
          <UI.Button
            variant="contained"
            size="small"
            onClick={handleCreate}
          >
            <Add />
            <span className="button-text">New prompt</span>
          </UI.Button>
        </div>
        {status === 'pending' && prompts.length === 0 && (
          <p className="prompts-empty">Loading...</p>
        )}
        {status !== 'pending' && prompts.length === 0 && (
          <p className="prompts-empty">No prompts yet.</p>
        )}
        <div className="prompts-items">
          {prompts.map(prompt => (
            <div
              key={prompt.id}
              className={`prompt-item ${selectedPrompt?.id === prompt.id ? 'active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(prompt)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(prompt);
                }
              }}
            >
              <p className="prompt-item-title">{prompt.title}</p>
              {prompt.description && (
                <p className="prompt-item-description">{prompt.description}</p>
              )}
              <p className="prompt-item-date">
                {new Date(
                  prompt.updatedAt || prompt.createdAt
                ).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {(selectedPrompt || isCreating) && (
        <div className="prompt-panel">
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
                ? 'New Prompt'
                : isEditing
                  ? 'Edit Prompt'
                  : selectedPrompt!.title}
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
                  onChange={e =>
                    setEditValues(prev => ({ ...prev, title: e.target.value }))
                  }
                />
                <UI.Input
                  label="Description"
                  name="description"
                  value={editValues.description}
                  disabled={submitting}
                  onChange={e =>
                    setEditValues(prev => ({
                      ...prev,
                      description: e.target.value
                    }))
                  }
                  multiline
                  rows={2}
                />
                <UI.Input
                  label="Messages (JSON)"
                  name="messages"
                  value={editValues.messages}
                  disabled={submitting}
                  onChange={e =>
                    setEditValues(prev => ({
                      ...prev,
                      messages: e.target.value
                    }))
                  }
                  multiline
                  rows={10}
                />
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
            ) : selectedPrompt ? (
              <div className="panel-view">
                {selectedPrompt.description && (
                  <div className="panel-section">
                    <h3 className="panel-section-label">Description</h3>
                    <p className="panel-section-text">
                      {selectedPrompt.description}
                    </p>
                  </div>
                )}
                <div className="panel-section">
                  <h3 className="panel-section-label">Messages</h3>
                  <div className="panel-messages">
                    {selectedPrompt.messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`panel-message panel-message-${msg.role}`}
                      >
                        <span className="panel-message-role">{msg.role}</span>
                        <p className="panel-message-content">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {selectedPrompt.schema &&
                  Object.keys(selectedPrompt.schema).length > 0 && (
                    <div className="panel-section">
                      <h3 className="panel-section-label">Schema</h3>
                      <pre className="panel-schema">
                        {JSON.stringify(selectedPrompt.schema, null, 2)}
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
        title="Delete prompt"
        description={`Are you sure you want to delete "${selectedPrompt?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        loading={submitting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteAlert(false)}
      />
    </Wrapper>
  );
};
