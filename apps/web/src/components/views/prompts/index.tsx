import { useEffect, useRef, useState } from 'react';
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
  RemoveCircleOutline,
  Code,
  ViewList
} from '@mui/icons-material';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

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
    messagesJson: ''
  });
  const [visualMessages, setVisualMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([{ role: 'user', content: '' }]);
  const [messageMode, setMessageMode] = useState<'visual' | 'json'>('visual');
  const [schemaVars, setSchemaVars] = useState<
    {
      name: string;
      type: 'string' | 'number' | 'boolean';
      required: boolean;
      description: string;
    }[]
  >([]);
  const [status, setStatus] = useState<
    'idle' | 'pending' | 'resolved' | 'rejected'
  >('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteAlert, setDeleteAlert] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [schemaViewMode, setSchemaViewMode] = useState<'visual' | 'json'>(
    'visual'
  );
  const [panelWidth, setPanelWidth] = useState(480);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const { id: organizationId, projectId } = router.query as {
    id: string;
    projectId: string;
  };
  const apiBase = `/organization/${organizationId}/project/${projectId}/artifact/prompt`;

  const fetchPrompts = async (signal?: AbortSignal) => {
    if (!organizationId || !projectId) return;
    setStatus('pending');
    try {
      const data = await utils.fetcher({
        url: apiBase,
        config: { credentials: 'include', signal }
      });
      if (signal?.aborted) return;
      if (data && !data.error) {
        setPrompts(data);
      }
      setStatus('resolved');
    } catch {
      if (!signal?.aborted) setStatus('rejected');
    }
  };

  useEffect(() => {
    if (!organizationId || !projectId) return;
    const controller = new AbortController();
    fetchPrompts(controller.signal);
    return () => controller.abort();
  }, [organizationId, projectId]);

  useEffect(() => {
    if (!isCreating && !isEditing) return;
    syncSchemaVars();
  }, [
    visualMessages,
    editValues.messagesJson,
    messageMode,
    isCreating,
    isEditing
  ]);

  const handleSelect = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setSelectedPrompt(null);
    setIsEditing(false);
    setIsCreating(true);
    setEditValues({ title: '', description: '', messagesJson: '' });
    setVisualMessages([{ role: 'user', content: '' }]);
    setMessageMode('visual');
    setSchemaVars([]);
    setErrors({});
  };

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

  const getMessages = (): { role: string; content: string }[] | null => {
    if (messageMode === 'visual') {
      return visualMessages.filter(m => m.content.trim());
    }
    try {
      return JSON.parse(editValues.messagesJson);
    } catch {
      setErrors({ messages: 'Invalid JSON format' });
      return null;
    }
  };

  const detectVariables = () => {
    let allContent = '';
    if (messageMode === 'visual') {
      allContent = visualMessages.map(m => m.content).join(' ');
    } else {
      try {
        const parsed = JSON.parse(editValues.messagesJson);
        if (Array.isArray(parsed)) {
          allContent = parsed
            .map((m: { content?: string }) => m?.content || '')
            .join(' ');
        }
      } catch {
        return [];
      }
    }
    const matches = allContent.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map(m => m.replace(/\{\{|\}\}/g, ''))));
  };

  const syncSchemaVars = () => {
    const detected = detectVariables();
    setSchemaVars(prev => {
      const existing = new Map(prev.map(v => [v.name, v]));
      const synced = detected.map(
        name =>
          existing.get(name) || {
            name,
            type: 'string' as const,
            required: true,
            description: ''
          }
      );
      // keep manually-added vars that aren't in detected
      const manual = prev.filter(
        v => !detected.includes(v.name) && v.description
      );
      return [...synced, ...manual];
    });
  };

  const buildSchema = () => {
    const properties: Record<string, Record<string, unknown>> = {};
    const required: string[] = [];

    for (const v of schemaVars) {
      const prop: Record<string, unknown> = { type: v.type };
      if (v.description) prop.description = v.description;
      properties[v.name] = prop;
      if (v.required) required.push(v.name);
    }

    return {
      type: 'object' as const,
      properties,
      ...(required.length > 0 && { required })
    };
  };

  const handleCreateSubmit = async () => {
    if (submitting) return;
    setErrors({});
    const parsedMessages = getMessages();
    if (!parsedMessages) return;
    if (parsedMessages.length === 0) {
      setErrors({ messages: 'At least one message is required' });
      return;
    }

    const body = {
      title: editValues.title,
      description: editValues.description,
      messages: parsedMessages,
      schema: buildSchema()
    };

    try {
      await utils.Schema.ARTIFACT_CREATE_PROMPT_VIEW.parseAsync(body);
    } catch (err) {
      parseZodErrors(err);
      return;
    }

    setSubmitting(true);
    try {
      const data = await utils.fetcher({
        url: apiBase,
        config: {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify(body)
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
      messagesJson: JSON.stringify(selectedPrompt.messages, null, 2)
    });
    setVisualMessages(
      selectedPrompt.messages.map(m => ({ role: m.role, content: m.content }))
    );
    setMessageMode('visual');
    setErrors({});

    const schema = selectedPrompt.schema as {
      properties?: Record<string, { type?: string; description?: string }>;
      required?: string[];
    };
    const props = schema?.properties || {};
    const required = schema?.required || [];
    setSchemaVars(
      Object.entries(props).map(([name, def]) => ({
        name,
        type: (def.type as 'string' | 'number' | 'boolean') || 'string',
        required: required.includes(name),
        description: def.description || ''
      }))
    );

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
    setErrors({});
    const parsedMessages = getMessages();
    if (!parsedMessages) return;
    if (parsedMessages.length === 0) {
      setErrors({ messages: 'At least one message is required' });
      return;
    }

    const body = {
      title: editValues.title,
      description: editValues.description,
      messages: parsedMessages,
      schema: buildSchema()
    };

    try {
      await utils.Schema.ARTIFACT_UPDATE_PROMPT_VIEW.parseAsync(body);
    } catch (err) {
      parseZodErrors(err);
      return;
    }

    setSubmitting(true);
    try {
      const data = await utils.fetcher({
        url: `${apiBase}/${selectedPrompt.id}`,
        config: {
          method: 'PUT',
          credentials: 'include',
          body: JSON.stringify(body)
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
      <div
        className={`prompts-list ${selectedPrompt || isCreating ? 'has-selection' : ''}`}
      >
        <div className="prompts-header">
          <div>
            <h1 className="prompts-title">Prompts</h1>
            <p className="prompts-subtitle">
              Reusable prompt templates with variables this MCP server can
              expose.
            </p>
          </div>
          <UI.Button variant="contained" size="small" onClick={handleCreate}>
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
                  placeholder="e.g. Summarize Article"
                  value={editValues.title}
                  disabled={submitting}
                  error={!!errors.title}
                  helperText={
                    errors.title || 'A short name to identify this prompt'
                  }
                  onChange={e => {
                    setEditValues(prev => ({ ...prev, title: e.target.value }));
                    if (errors.title)
                      setErrors(prev => {
                        const n = { ...prev };
                        delete n.title;
                        return n;
                      });
                  }}
                />
                <UI.Input
                  label="Description"
                  name="description"
                  placeholder="Describe what this prompt does"
                  value={editValues.description}
                  disabled={submitting}
                  error={!!errors.description}
                  helperText={errors.description}
                  onChange={e => {
                    setEditValues(prev => ({
                      ...prev,
                      description: e.target.value
                    }));
                    if (errors.description)
                      setErrors(prev => {
                        const n = { ...prev };
                        delete n.description;
                        return n;
                      });
                  }}
                  multiline
                  rows={2}
                />
                <div className="panel-messages-section">
                  <div className="panel-messages-header">
                    <p className="panel-messages-label">Messages</p>
                    <div className="panel-messages-mode-toggle">
                      <button
                        type="button"
                        className={`panel-mode-btn ${messageMode === 'visual' ? 'active' : ''}`}
                        disabled={submitting}
                        onClick={() => {
                          if (messageMode === 'json') {
                            try {
                              const parsed = JSON.parse(
                                editValues.messagesJson
                              );
                              setVisualMessages(parsed);
                            } catch {
                              // keep current visual messages
                            }
                          }
                          setMessageMode('visual');
                        }}
                      >
                        <ViewList />
                        Visual
                      </button>
                      <button
                        type="button"
                        className={`panel-mode-btn ${messageMode === 'json' ? 'active' : ''}`}
                        disabled={submitting}
                        onClick={() => {
                          setEditValues(prev => ({
                            ...prev,
                            messagesJson: JSON.stringify(
                              visualMessages,
                              null,
                              2
                            )
                          }));
                          setMessageMode('json');
                        }}
                      >
                        <Code />
                        JSON
                      </button>
                    </div>
                  </div>
                  {errors.messages && (
                    <p className="panel-messages-error">{errors.messages}</p>
                  )}
                  {messageMode === 'visual' ? (
                    <div className="panel-message-builder">
                      {visualMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={`panel-message-card panel-message-card-${msg.role}`}
                        >
                          <div className="panel-message-card-header">
                            <div className="panel-message-role-toggle">
                              <button
                                type="button"
                                className={`panel-role-btn ${msg.role === 'user' ? 'active' : ''}`}
                                disabled={submitting}
                                onClick={() =>
                                  setVisualMessages(prev =>
                                    prev.map((m, idx) =>
                                      idx === i ? { ...m, role: 'user' } : m
                                    )
                                  )
                                }
                              >
                                User
                              </button>
                              <button
                                type="button"
                                className={`panel-role-btn ${msg.role === 'assistant' ? 'active' : ''}`}
                                disabled={submitting}
                                onClick={() =>
                                  setVisualMessages(prev =>
                                    prev.map((m, idx) =>
                                      idx === i
                                        ? { ...m, role: 'assistant' }
                                        : m
                                    )
                                  )
                                }
                              >
                                Assistant
                              </button>
                            </div>
                            {visualMessages.length > 1 && (
                              <IconButton
                                size="small"
                                disabled={submitting}
                                onClick={() =>
                                  setVisualMessages(prev =>
                                    prev.filter((_, idx) => idx !== i)
                                  )
                                }
                              >
                                <RemoveCircleOutline />
                              </IconButton>
                            )}
                          </div>
                          <UI.Input
                            placeholder={
                              msg.role === 'user'
                                ? 'Write the user message... Use {{variable}} for dynamic values'
                                : 'Write the assistant response...'
                            }
                            value={msg.content}
                            disabled={submitting}
                            onChange={e =>
                              setVisualMessages(prev =>
                                prev.map((m, idx) =>
                                  idx === i
                                    ? { ...m, content: e.target.value }
                                    : m
                                )
                              )
                            }
                            multiline
                            rows={3}
                          />
                        </div>
                      ))}
                      <div className="panel-add-message">
                        <UI.Button
                          size="small"
                          disabled={submitting}
                          onClick={() =>
                            setVisualMessages(prev => [
                              ...prev,
                              { role: 'user', content: '' }
                            ])
                          }
                        >
                          <Add />
                          <span className="button-text">Add message</span>
                        </UI.Button>
                      </div>
                    </div>
                  ) : (
                    <UI.Input
                      label="Messages (JSON)"
                      name="messagesJson"
                      value={editValues.messagesJson}
                      disabled={submitting}
                      error={!!errors.messages}
                      helperText={
                        errors.messages || 'Array of {role, content} objects'
                      }
                      onChange={e => {
                        setEditValues(prev => ({
                          ...prev,
                          messagesJson: e.target.value
                        }));
                        if (errors.messages)
                          setErrors(prev => {
                            const n = { ...prev };
                            delete n.messages;
                            return n;
                          });
                      }}
                      multiline
                      rows={10}
                    />
                  )}
                  {schemaVars.length > 0 && (
                    <div className="panel-schema-editor">
                      <p className="panel-schema-label">Variables</p>
                      <p className="panel-schema-hint">
                        Auto-detected from {'{{variables}}'} in your messages.
                        Customize type and requirements below.
                      </p>
                      <div className="panel-schema-vars">
                        {schemaVars.map((v, i) => (
                          <div key={v.name} className="panel-schema-var">
                            <div className="panel-schema-var-header">
                              <span className="panel-schema-var-name">
                                {`{{${v.name}}}`}
                              </span>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    size="small"
                                    checked={v.required}
                                    disabled={submitting}
                                    onChange={e =>
                                      setSchemaVars(prev =>
                                        prev.map((sv, idx) =>
                                          idx === i
                                            ? {
                                                ...sv,
                                                required: e.target.checked
                                              }
                                            : sv
                                        )
                                      )
                                    }
                                  />
                                }
                                label="Required"
                              />
                            </div>
                            <div className="panel-schema-var-fields">
                              <UI.Select
                                label="Type"
                                value={v.type}
                                disabled={submitting}
                                onChange={e =>
                                  setSchemaVars(prev =>
                                    prev.map((sv, idx) =>
                                      idx === i
                                        ? {
                                            ...sv,
                                            type: e.target.value as
                                              | 'string'
                                              | 'number'
                                              | 'boolean'
                                          }
                                        : sv
                                    )
                                  )
                                }
                                options={[
                                  { label: 'String', value: 'string' },
                                  { label: 'Number', value: 'number' },
                                  { label: 'Boolean', value: 'boolean' }
                                ]}
                              />
                              <UI.Input
                                label="Description"
                                placeholder="What is this variable for?"
                                value={v.description}
                                disabled={submitting}
                                onChange={e =>
                                  setSchemaVars(prev =>
                                    prev.map((sv, idx) =>
                                      idx === i
                                        ? {
                                            ...sv,
                                            description: e.target.value
                                          }
                                        : sv
                                    )
                                  )
                                }
                              />
                            </div>
                          </div>
                        ))}
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
                  Object.keys(
                    (selectedPrompt.schema as { properties?: object })
                      ?.properties || {}
                  ).length > 0 && (
                    <div className="panel-section">
                      <div className="panel-schema-header">
                        <h3 className="panel-section-label">Variables</h3>
                        <div className="panel-schema-view-toggle">
                          <button
                            type="button"
                            className={`panel-mode-btn ${schemaViewMode === 'visual' ? 'active' : ''}`}
                            onClick={() => setSchemaViewMode('visual')}
                          >
                            <ViewList />
                            Visual
                          </button>
                          <button
                            type="button"
                            className={`panel-mode-btn ${schemaViewMode === 'json' ? 'active' : ''}`}
                            onClick={() => setSchemaViewMode('json')}
                          >
                            <Code />
                            JSON
                          </button>
                        </div>
                      </div>
                      {schemaViewMode === 'visual' ? (
                        <div className="panel-schema-visual">
                          {(() => {
                            const schema = selectedPrompt.schema as {
                              properties?: Record<
                                string,
                                { type?: string; description?: string }
                              >;
                              required?: string[];
                            };
                            const props = schema?.properties || {};
                            const required = schema?.required || [];
                            return Object.entries(props).map(([name, def]) => (
                              <div
                                key={name}
                                className="panel-schema-visual-var"
                              >
                                <div className="panel-schema-visual-row">
                                  <span className="panel-schema-visual-name">
                                    {`{{${name}}}`}
                                  </span>
                                  <span className="panel-schema-visual-type">
                                    {def.type || 'string'}
                                  </span>
                                  {required.includes(name) ? (
                                    <span className="panel-schema-visual-required">
                                      Required
                                    </span>
                                  ) : (
                                    <span className="panel-schema-visual-optional">
                                      Optional
                                    </span>
                                  )}
                                </div>
                                {def.description && (
                                  <p className="panel-schema-visual-description">
                                    {def.description}
                                  </p>
                                )}
                              </div>
                            ));
                          })()}
                        </div>
                      ) : (
                        <pre className="panel-schema">
                          {JSON.stringify(selectedPrompt.schema, null, 2)}
                        </pre>
                      )}
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
