import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { UI } from '@anju/ui';
import { utils } from '@anju/utils';
import IconButton from '@mui/material/IconButton';
import { Add, DeleteOutline, EditOutlined } from '@mui/icons-material';

import { Wrapper } from './styles';

type Section = 'organization' | 'models' | 'danger';

interface Project {
  id: string;
  name: string;
}

interface Organization {
  id: string;
  name: string;
  ownerId: string;
  projectCount: number;
  organizationUserCount: number;
  projects?: Project[];
  createdAt: string;
  updatedAt: string;
}

interface OrganizationLlm {
  id: string;
  name: string;
  provider: string;
  model: string;
  baseUrl: string | null;
  systemPrompt: string | null;
  config: unknown;
  organizationId: string;
  hasApiKey: boolean;
  createdAt: string;
  updatedAt: string;
}

const INITIAL_LLM_FORM = {
  id: '' as string | null,
  name: '',
  catalogKey: '',
  apiKey: '',
  baseUrl: '',
  systemPrompt: ''
};

const catalogOptions = utils.constants.LLM_CATALOG.map(item => ({
  label: item.label,
  value: `${item.provider}::${item.model}`
}));

const findCatalogEntry = (key: string) => {
  const [provider, model] = key.split('::');
  return utils.constants.LLM_CATALOG.find(
    item => item.provider === provider && item.model === model
  );
};

const llmCatalogKey = (llm: OrganizationLlm) => `${llm.provider}::${llm.model}`;

const llmCatalogLabel = (llm: OrganizationLlm) => {
  const entry = findCatalogEntry(llmCatalogKey(llm));
  if (entry) return entry.label;
  return `${llm.provider} / ${llm.model}`;
};

export const Settings = () => {
  const router = useRouter();
  const snackbar = UI.Alert.useSnackbar();
  const { id: organizationId } = router.query as { id: string };

  const [section, setSection] = useState<Section>('organization');
  const organizationRef = useRef<HTMLElement | null>(null);
  const modelsRef = useRef<HTMLElement | null>(null);
  const dangerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const refs: Array<{ id: Section; el: HTMLElement | null }> = [
      { id: 'organization', el: organizationRef.current },
      { id: 'models', el: modelsRef.current },
      { id: 'danger', el: dangerRef.current }
    ];
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const target = refs.find(r => r.el === visible[0].target);
          if (target) setSection(target.id);
        }
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    refs.forEach(r => r.el && observer.observe(r.el));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: Section) => {
    const el =
      id === 'organization'
        ? organizationRef.current
        : id === 'models'
          ? modelsRef.current
          : dangerRef.current;
    if (!el) return;
    setSection(id);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgName, setOrgName] = useState('');
  const [orgErrors, setOrgErrors] = useState<{ name?: string }>({});
  const [savingOrg, setSavingOrg] = useState(false);
  const [removingOrg, setRemovingOrg] = useState(false);
  const [orgDeleteAlert, setOrgDeleteAlert] = useState(false);

  const [llms, setLlms] = useState<OrganizationLlm[]>([]);
  const [llmsLoading, setLlmsLoading] = useState(true);
  const [llmForm, setLlmForm] = useState<typeof INITIAL_LLM_FORM | null>(null);
  const [llmErrors, setLlmErrors] = useState<Record<string, string>>({});
  const [llmSubmitting, setLlmSubmitting] = useState(false);
  const [llmDeleteAlert, setLlmDeleteAlert] = useState<OrganizationLlm | null>(
    null
  );
  const [llmDeleting, setLlmDeleting] = useState(false);

  const orgBase = `/organization/${organizationId}`;

  const fetchOrganization = async (signal?: AbortSignal) => {
    if (!organizationId) return;
    setOrgLoading(true);
    try {
      const data = await utils.fetcher({
        url: orgBase,
        config: { credentials: 'include', signal }
      });
      if (signal?.aborted) return;
      if (data && !data.error) {
        setOrganization(data);
        setOrgName(data.name || '');
      }
    } catch {
      // ignore
    } finally {
      if (!signal?.aborted) setOrgLoading(false);
    }
  };

  const fetchLlms = async (signal?: AbortSignal) => {
    if (!organizationId) return;
    setLlmsLoading(true);
    try {
      const data = await utils.fetcher({
        url: `${orgBase}/llm`,
        config: { credentials: 'include', signal }
      });
      if (signal?.aborted) return;
      if (Array.isArray(data)) setLlms(data);
    } catch {
      // ignore
    } finally {
      if (!signal?.aborted) setLlmsLoading(false);
    }
  };

  useEffect(() => {
    if (!organizationId) return;
    const controller = new AbortController();
    fetchOrganization(controller.signal);
    fetchLlms(controller.signal);
    return () => controller.abort();
  }, [organizationId]);

  const handleOrgSave = async () => {
    if (savingOrg || !organization) return;
    const trimmed = orgName.trim();
    if (!trimmed) {
      setOrgErrors({ name: 'Name is required' });
      return;
    }
    setOrgErrors({});
    setSavingOrg(true);
    try {
      const data = await utils.fetcher({
        url: orgBase,
        config: {
          method: 'PUT',
          credentials: 'include',
          body: JSON.stringify({ name: trimmed })
        }
      });
      if (data && !data.error) {
        setOrganization(prev => (prev ? { ...prev, name: trimmed } : prev));
        snackbar.success('Organization updated');
      } else {
        snackbar.error(data?.error?.message || 'Failed to update organization');
      }
    } catch {
      snackbar.error('Failed to update organization');
    } finally {
      setSavingOrg(false);
    }
  };

  const handleOrgRemoveConfirm = async () => {
    if (removingOrg) return;
    setRemovingOrg(true);
    try {
      const data = await utils.fetcher({
        url: orgBase,
        config: { method: 'DELETE', credentials: 'include' }
      });
      if (data && !data.error) {
        snackbar.success('Organization removed');
        router.push('/organization');
      } else {
        snackbar.error(data?.error?.message || 'Failed to remove organization');
        setRemovingOrg(false);
        setOrgDeleteAlert(false);
      }
    } catch {
      snackbar.error('Failed to remove organization');
      setRemovingOrg(false);
      setOrgDeleteAlert(false);
    }
  };

  const handleLlmCreate = () => {
    setLlmErrors({});
    setLlmForm({
      ...INITIAL_LLM_FORM,
      catalogKey: catalogOptions[0]?.value || ''
    });
  };

  const handleLlmEdit = (llm: OrganizationLlm) => {
    setLlmErrors({});
    setLlmForm({
      id: llm.id,
      name: llm.name,
      catalogKey: llmCatalogKey(llm),
      apiKey: '',
      baseUrl: llm.baseUrl || '',
      systemPrompt: llm.systemPrompt || ''
    });
  };

  const handleLlmCancel = () => {
    setLlmForm(null);
    setLlmErrors({});
  };

  const handleLlmSubmit = async () => {
    if (!llmForm || llmSubmitting) return;
    const isEdit = !!llmForm.id;

    const errors: Record<string, string> = {};
    if (!llmForm.name.trim()) errors.name = 'Name is required';
    if (!llmForm.catalogKey) errors.catalogKey = 'Pick a model';
    if (!isEdit && !llmForm.apiKey.trim())
      errors.apiKey = 'API key is required';

    if (Object.keys(errors).length > 0) {
      setLlmErrors(errors);
      return;
    }

    const catalog = findCatalogEntry(llmForm.catalogKey);
    if (!catalog) {
      setLlmErrors({ catalogKey: 'Unknown model' });
      return;
    }

    const body: Record<string, unknown> = {
      name: llmForm.name.trim(),
      provider: catalog.provider,
      model: catalog.model
    };
    if (llmForm.apiKey.trim()) body.apiKey = llmForm.apiKey.trim();
    if (llmForm.baseUrl.trim()) body.baseUrl = llmForm.baseUrl.trim();
    if (llmForm.systemPrompt.trim())
      body.systemPrompt = llmForm.systemPrompt.trim();

    setLlmSubmitting(true);
    try {
      const url = isEdit ? `${orgBase}/llm/${llmForm.id}` : `${orgBase}/llm`;
      const data = await utils.fetcher({
        url,
        config: {
          method: isEdit ? 'PUT' : 'POST',
          credentials: 'include',
          body: JSON.stringify(body)
        }
      });
      if (data && !data.error) {
        snackbar.success(isEdit ? 'Model updated' : 'Model added');
        await fetchLlms();
        setLlmForm(null);
      } else {
        snackbar.error(data?.error?.message || 'Failed to save model');
      }
    } catch {
      snackbar.error('Failed to save model');
    } finally {
      setLlmSubmitting(false);
    }
  };

  const handleLlmDeleteConfirm = async () => {
    if (!llmDeleteAlert || llmDeleting) return;
    setLlmDeleting(true);
    try {
      const data = await utils.fetcher({
        url: `${orgBase}/llm/${llmDeleteAlert.id}`,
        config: { method: 'DELETE', credentials: 'include' }
      });
      if (data && !data.error) {
        snackbar.success('Model removed');
        setLlms(prev => prev.filter(l => l.id !== llmDeleteAlert.id));
        setLlmDeleteAlert(null);
      } else {
        snackbar.error(data?.error?.message || 'Failed to remove model');
      }
    } catch {
      snackbar.error('Failed to remove model');
    } finally {
      setLlmDeleting(false);
    }
  };

  const renderLlmForm = () => {
    if (!llmForm) return null;
    return (
      <div className="llm-form">
        <p className="llm-form-title">
          {llmForm.id ? 'Edit model' : 'New model'}
        </p>

        <UI.Input
          label="Display name"
          name="llmName"
          placeholder="e.g. Production Gemini"
          value={llmForm.name}
          disabled={llmSubmitting}
          error={!!llmErrors.name}
          helperText={llmErrors.name}
          onChange={e => {
            const v = e.target.value;
            setLlmForm(prev => (prev ? { ...prev, name: v } : prev));
            if (llmErrors.name)
              setLlmErrors(prev => {
                const n = { ...prev };
                delete n.name;
                return n;
              });
          }}
        />

        <UI.Select
          label="Model"
          name="llmCatalogKey"
          value={llmForm.catalogKey}
          disabled={llmSubmitting}
          error={!!llmErrors.catalogKey}
          helperText={llmErrors.catalogKey}
          options={catalogOptions}
          onChange={e => {
            const v = e.target.value as string;
            setLlmForm(prev => (prev ? { ...prev, catalogKey: v } : prev));
            if (llmErrors.catalogKey)
              setLlmErrors(prev => {
                const n = { ...prev };
                delete n.catalogKey;
                return n;
              });
          }}
        />

        <UI.Input
          label={llmForm.id ? 'API key (leave blank to keep)' : 'API key'}
          name="llmApiKey"
          type="password"
          placeholder="sk-..."
          value={llmForm.apiKey}
          disabled={llmSubmitting}
          error={!!llmErrors.apiKey}
          helperText={llmErrors.apiKey}
          onChange={e => {
            const v = e.target.value;
            setLlmForm(prev => (prev ? { ...prev, apiKey: v } : prev));
            if (llmErrors.apiKey)
              setLlmErrors(prev => {
                const n = { ...prev };
                delete n.apiKey;
                return n;
              });
          }}
        />

        <UI.Input
          label="Base URL (optional)"
          name="llmBaseUrl"
          placeholder="https://..."
          value={llmForm.baseUrl}
          disabled={llmSubmitting}
          onChange={e => {
            const v = e.target.value;
            setLlmForm(prev => (prev ? { ...prev, baseUrl: v } : prev));
          }}
        />

        <UI.Input
          label="System prompt (optional)"
          name="llmSystemPrompt"
          multiline
          minRows={3}
          maxRows={8}
          value={llmForm.systemPrompt}
          disabled={llmSubmitting}
          onChange={e => {
            const v = e.target.value;
            setLlmForm(prev => (prev ? { ...prev, systemPrompt: v } : prev));
          }}
        />

        <div className="llm-form-actions">
          <UI.Button
            variant="contained"
            size="small"
            disabled={llmSubmitting}
            onClick={handleLlmSubmit}
          >
            {llmSubmitting
              ? 'Saving...'
              : llmForm.id
                ? 'Save changes'
                : 'Create model'}
          </UI.Button>
          <UI.Button
            size="small"
            disabled={llmSubmitting}
            onClick={handleLlmCancel}
          >
            Cancel
          </UI.Button>
        </div>
      </div>
    );
  };

  const navItem = (id: Section, label: string, danger = false) => (
    <button
      key={id}
      type="button"
      className={`settings-nav-item${section === id ? ' active' : ''}${danger ? ' danger' : ''}`}
      onClick={() => scrollToSection(id)}
    >
      {label}
    </button>
  );

  const renderOrganization = () => (
    <section
      ref={el => {
        organizationRef.current = el;
      }}
    >
      <header className="settings-header">
        <h1 className="settings-title">Organization</h1>
        <p className="settings-subtitle">
          Update your organization details and review the projects it owns.
        </p>
      </header>

      <section className="settings-section">
        {orgLoading && !organization ? (
          <>
            <div className="settings-meta-row">
              {[0, 1, 2].map(i => (
                <div key={i} className="settings-meta">
                  <UI.Skeleton variant="text" width={60} height={14} />
                  <UI.Skeleton variant="text" width={40} height={20} />
                </div>
              ))}
            </div>
            <UI.Skeleton variant="rounded" width="100%" height={48} />
            <div className="settings-actions">
              <UI.Skeleton variant="rounded" width={120} height={32} />
            </div>
          </>
        ) : (
          <>
            <div className="settings-meta-row">
              <div className="settings-meta">
                <p className="settings-meta-label">Created</p>
                <p className="settings-meta-value">
                  {organization
                    ? new Date(organization.createdAt).toLocaleDateString()
                    : '—'}
                </p>
              </div>
              <div className="settings-meta">
                <p className="settings-meta-label">Projects</p>
                <p className="settings-meta-value">
                  {organization?.projectCount ?? '—'}
                </p>
              </div>
              <div className="settings-meta">
                <p className="settings-meta-label">Members</p>
                <p className="settings-meta-value">
                  {organization?.organizationUserCount ?? '—'}
                </p>
              </div>
            </div>

            <div className="settings-field-row">
              <div className="field">
                <UI.Input
                  label="Organization name"
                  name="organizationName"
                  value={orgName}
                  disabled={!organization || savingOrg}
                  error={!!orgErrors.name}
                  helperText={orgErrors.name}
                  onChange={e => {
                    setOrgName(e.target.value);
                    if (orgErrors.name) setOrgErrors({});
                  }}
                />
              </div>
            </div>

            <div className="settings-actions">
              <UI.Button
                variant="contained"
                size="small"
                disabled={
                  !organization ||
                  savingOrg ||
                  orgName.trim() === (organization?.name || '')
                }
                onClick={handleOrgSave}
              >
                {savingOrg ? 'Saving...' : 'Save changes'}
              </UI.Button>
            </div>
          </>
        )}
      </section>

      <section className="settings-section">
        <div className="settings-section-header">
          <div className="settings-section-text">
            <h2 className="settings-section-title">Projects</h2>
            <p className="settings-section-description">
              Projects under this organization. Click one to open it.
            </p>
          </div>
        </div>

        {orgLoading && !organization ? (
          <div className="projects-list">
            {[0, 1].map(i => (
              <UI.Skeleton
                key={i}
                variant="rounded"
                width="100%"
                height={48}
              />
            ))}
          </div>
        ) : !organization?.projects || organization.projects.length === 0 ? (
          <p className="projects-empty">No projects yet.</p>
        ) : (
          <div className="projects-list">
            {organization.projects.map(project => (
              <div key={project.id} className="project-item">
                <p className="project-item-name">{project.name}</p>
                <button
                  type="button"
                  className="project-item-link"
                  onClick={() =>
                    router.push(
                      `/organization/${organizationId}/project/${project.id}`
                    )
                  }
                >
                  Open →
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );

  const renderModels = () => (
    <section
      ref={el => {
        modelsRef.current = el;
      }}
    >
      <header className="settings-header">
        <h1 className="settings-title">Models</h1>
        <p className="settings-subtitle">
          The language models available to this organization. Channels can pick
          any of these, or fall back to the system default.
        </p>
      </header>

      <section className="settings-section">
        <div className="settings-section-header">
          <div className="settings-section-text">
            <h2 className="settings-section-title">Configured models</h2>
            <p className="settings-section-description">
              Add a model with its API key once and reuse it across any
              channel in the organization.
            </p>
          </div>
          <UI.Button
            variant="contained"
            size="small"
            disabled={!!llmForm}
            onClick={handleLlmCreate}
          >
            <Add />
            <span className="button-text">Add model</span>
          </UI.Button>
        </div>

        {llmForm && !llmForm.id && renderLlmForm()}

        {llmsLoading && llms.length === 0 ? (
          <div className="llm-list">
            {[0, 1, 2].map(i => (
              <UI.Skeleton
                key={i}
                variant="rounded"
                width="100%"
                height={64}
              />
            ))}
          </div>
        ) : null}

        {!llmsLoading && !llmForm && llms.length === 0 && (
          <p className="llms-empty">
            No models configured yet. Add one to give your channels something
            to talk with.
          </p>
        )}

        {llms.length > 0 && (
          <div className="llm-list">
            {llms.map(llm => (
              <div key={llm.id}>
                <div className="llm-card">
                  <div className="llm-card-info">
                    <p className="llm-card-name">{llm.name}</p>
                    <div className="llm-card-meta">
                      <span>{llmCatalogLabel(llm)}</span>
                      {llm.baseUrl && <span>· custom URL</span>}
                    </div>
                  </div>
                  <div className="llm-card-actions">
                    <IconButton
                      aria-label="Edit"
                      onClick={() => handleLlmEdit(llm)}
                      disabled={llmSubmitting}
                    >
                      <EditOutlined fontSize="small" />
                    </IconButton>
                    <IconButton
                      aria-label="Remove"
                      onClick={() => setLlmDeleteAlert(llm)}
                      disabled={llmSubmitting}
                    >
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </div>
                </div>
                {llmForm?.id === llm.id && renderLlmForm()}
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );

  const renderDanger = () => (
    <section
      ref={el => {
        dangerRef.current = el;
      }}
    >
      <header className="settings-header">
        <h1 className="settings-title">Danger zone</h1>
        <p className="settings-subtitle">
          Destructive actions that affect the entire organization.
        </p>
      </header>

      <section className="settings-section danger-card">
        <div className="settings-section-header">
          <div className="settings-section-text">
            <h2 className="settings-section-title">Remove organization</h2>
            <p className="settings-section-description">
              Permanently delete this organization and everything inside it.
            </p>
          </div>
        </div>

        <p className="danger-warning">
          <strong>This action cannot be undone.</strong> Removing the
          organization will permanently delete every project, channel,
          conversation, message, resource, tool and language model it owns.
          Make sure you really want to do this.
        </p>

        <div className="settings-actions">
          <UI.Button
            variant="contained"
            size="small"
            className="danger-button"
            disabled={!organization || removingOrg}
            onClick={() => setOrgDeleteAlert(true)}
          >
            Remove organization
          </UI.Button>
        </div>
      </section>
    </section>
  );

  return (
    <Wrapper>
      <aside className="settings-nav">
        {navItem('organization', 'Organization')}
        {navItem('models', 'Models')}
        {navItem('danger', 'Danger zone', true)}
      </aside>

      <main className="settings-content">
        {renderOrganization()}
        {renderModels()}
        {renderDanger()}
      </main>

      <UI.Alert
        open={orgDeleteAlert}
        title="Remove organization?"
        description={`This will permanently delete "${organization?.name || 'this organization'}" along with every project, channel, conversation, resource and model inside it. This cannot be undone.`}
        confirmText="Yes, remove permanently"
        cancelText="Cancel"
        loading={removingOrg}
        onConfirm={handleOrgRemoveConfirm}
        onCancel={() => setOrgDeleteAlert(false)}
      />

      <UI.Alert
        open={!!llmDeleteAlert}
        title="Remove model"
        description={`Remove "${llmDeleteAlert?.name || 'this model'}"? Channels using it must be re-pointed first.`}
        confirmText="Remove"
        cancelText="Cancel"
        loading={llmDeleting}
        onConfirm={handleLlmDeleteConfirm}
        onCancel={() => setLlmDeleteAlert(null)}
      />
    </Wrapper>
  );
};
