import { useState } from 'react';
import { useRouter } from 'next/router';
import { UI } from '@anju/ui';
import { utils } from '@anju/utils';
import IconButton from '@mui/material/IconButton';
import { AddOutlined, Close } from '@mui/icons-material';

import {
  CreateOrganizationWrapper,
  ModalDialog,
  ModalOverlay,
  Wrapper
} from './styles';

// types
import { IProps } from '../../../pages/organization';

const INITIAL_FORM_STATE = {
  name: '',
  projectName: '',
  projectDescription: ''
};

export const Organization = (props: IProps) => {
  const { organizations } = props;
  const [values, setValues] = useState(INITIAL_FORM_STATE);
  const [status, setStatus] = useState<
    'idle' | 'pending' | 'rejected' | 'resolved'
  >('idle');
  const [error, setError] = useState(INITIAL_FORM_STATE);
  const [apiError, setApiError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
    if (error[name as keyof typeof error]) {
      setError(prev => ({ ...prev, [name]: '' }));
    }
  };

  const resetForm = () => {
    setValues(INITIAL_FORM_STATE);
    setError(INITIAL_FORM_STATE);
    setApiError('');
    setStatus('idle');
  };

  const handleModalOpen = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleModalClose = () => {
    if (status === 'pending') return;
    setModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setStatus('pending');
      setApiError('');
      const currentValues =
        await utils.Schema.ORGANIZATION_CREATE_VIEW.parseAsync({
          name: values.name,
          projectName: values.projectName,
          projectDescription: values.projectDescription
        });

      const newOrganization = await utils.fetcher({
        url: '/organization',
        config: {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify(currentValues)
        }
      });

      if (newOrganization?.error) {
        setStatus('rejected');
        setApiError(
          newOrganization.error.message ||
            'Something went wrong. Please try again.'
        );
        return;
      }

      router.push(
        `/organization/${newOrganization.organization.id}/project/${newOrganization.project.id}`
      );
    } catch (err) {
      setStatus('rejected');
      if (
        err &&
        typeof err === 'object' &&
        'issues' in err &&
        Array.isArray((err as { issues: unknown[] }).issues)
      ) {
        const formattedErrors = (
          err as { issues: { path: string[]; message: string }[] }
        ).issues.reduce(
          (acc, curr) => ({ ...acc, [curr.path[0]]: curr.message }),
          {} as typeof INITIAL_FORM_STATE
        );
        setError(formattedErrors);
      }
    }
  };

  if (organizations.length === 0) {
    return (
      <CreateOrganizationWrapper>
        <div className="create-organization-header">
          <h1 className="create-organization-title">
            Create Your Organization
          </h1>
          <p className="create-organization-subtitle">
            Set up your workspace to start building with AI
          </p>
        </div>
        <form className="create-organization-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-section-header">
              <h2 className="form-section-title">Organization</h2>
              <p className="form-section-description">
                An organization is your workspace where you manage teams and
                projects.
              </p>
            </div>
            <UI.Input
              label="Name"
              placeholder="Enter organization name"
              name="name"
              value={values.name}
              onChange={handleValueChange}
              required
              error={!!error.name}
              helperText={error.name}
            />
          </div>
          <div className="form-section">
            <div className="form-section-header">
              <h2 className="form-section-title">Project</h2>
              <p className="form-section-description">
                A project contains your AI agents and configurations.
              </p>
            </div>
            <UI.Input
              label="Name"
              placeholder="Enter your project name"
              name="projectName"
              value={values.projectName}
              onChange={handleValueChange}
              required
              error={!!error.projectName}
              helperText={error.projectName}
            />
            <UI.Input
              label="Description"
              placeholder="Describe your project"
              name="projectDescription"
              value={values.projectDescription}
              onChange={handleValueChange}
              multiline
              rows={2}
              error={!!error.projectDescription}
              helperText={error.projectDescription}
            />
          </div>
          {apiError && <p className="create-organization-error">{apiError}</p>}
          <div className="create-organization-button">
            <UI.Button
              type="submit"
              variant="contained"
              size="small"
              disabled={status === 'pending'}
            >
              {status === 'pending' ? 'Creating...' : 'Create Organization'}
            </UI.Button>
          </div>
        </form>
      </CreateOrganizationWrapper>
    );
  }

  return (
    <Wrapper>
      <div className="organization-header">
        <div className="organization-heading">
          <h1 className="organization-title">Organizations</h1>
          <p className="create-organization-subtitle">
            You are a member of the following organizations:
          </p>
        </div>
        <div className="organization-new-button">
          <UI.Button variant="contained" size="small" onClick={handleModalOpen}>
            <AddOutlined />
            New organization
          </UI.Button>
        </div>
      </div>
      <div className="organization-list">
        {organizations.map(organization => (
          <div
            key={organization.id}
            className="organization-card"
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const projectId = organization.projects?.[0]?.id;
                if (projectId) {
                  router.push(
                    `/organization/${organization.id}/project/${projectId}`
                  );
                }
              }
            }}
            onClick={() => {
              const projectId = organization.projects?.[0]?.id;
              if (projectId) {
                router.push(
                  `/organization/${organization.id}/project/${projectId}`
                );
              }
            }}
          >
            <h2 className="organization-card-name">{organization.name}</h2>
            <ul className="organization-info">
              <li className="organization-info-item">
                Projects: {organization.projectCount}
              </li>
              <li className="organization-info-item">
                Members: {organization.organizationUserCount}
              </li>
              <li className="organization-info-item">
                Created At:{' '}
                {new Date(organization.createdAt).toLocaleDateString()}
              </li>
            </ul>
          </div>
        ))}
      </div>
      {modalOpen && (
        <UI.Portal>
          <ModalOverlay onClick={handleModalClose}>
            <ModalDialog role="dialog" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Create a new organization</h2>
                <IconButton size="small" onClick={handleModalClose}>
                  <Close />
                </IconButton>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-section">
                    <div className="form-section-header">
                      <h3 className="form-section-title">Organization</h3>
                      <p className="form-section-description">
                        This is your workspace name. You can change it later.
                      </p>
                    </div>
                    <UI.Input
                      label="Name"
                      placeholder="Enter organization name"
                      name="name"
                      value={values.name}
                      onChange={handleValueChange}
                      required
                      error={!!error.name}
                      helperText={error.name}
                    />
                  </div>
                  <div className="form-section">
                    <div className="form-section-header">
                      <h3 className="form-section-title">Project</h3>
                      <p className="form-section-description">
                        Every organization starts with one project.
                      </p>
                    </div>
                    <UI.Input
                      label="Project name"
                      placeholder="Enter your project name"
                      name="projectName"
                      value={values.projectName}
                      onChange={handleValueChange}
                      required
                      error={!!error.projectName}
                      helperText={error.projectName}
                    />
                    <UI.Input
                      label="Project description"
                      placeholder="Describe your project"
                      name="projectDescription"
                      value={values.projectDescription}
                      onChange={handleValueChange}
                      multiline
                      rows={2}
                      error={!!error.projectDescription}
                      helperText={error.projectDescription}
                    />
                  </div>
                  {apiError && <p className="modal-error">{apiError}</p>}
                </div>
                <div className="modal-actions">
                  <UI.Button
                    size="small"
                    disabled={status === 'pending'}
                    onClick={handleModalClose}
                  >
                    Cancel
                  </UI.Button>
                  <UI.Button
                    type="submit"
                    variant="contained"
                    size="small"
                    disabled={status === 'pending'}
                  >
                    {status === 'pending' ? 'Creating...' : 'Create'}
                  </UI.Button>
                </div>
              </form>
            </ModalDialog>
          </ModalOverlay>
        </UI.Portal>
      )}
    </Wrapper>
  );
};
