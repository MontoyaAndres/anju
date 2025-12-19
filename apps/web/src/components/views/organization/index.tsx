import { useState } from 'react';
import { useRouter } from 'next/router';
import { UI } from '@anju/ui';
import { utils } from '@anju/utils';

import { CreateOrganizationWrapper, Wrapper } from './styles';

// types
import { IProps } from '../../../pages/organization';

const INITIAL_FORM_STATE = {
  name: '',
  projectName: '',
  projectDescription: '',
};

export const Organization = (props: IProps) => {
  const { organizations } = props;
  const [values, setValues] = useState(INITIAL_FORM_STATE);
  const [status, setStatus] = useState<
    'idle' | 'pending' | 'error' | 'success'
  >('idle');
  const [error, setError] = useState(INITIAL_FORM_STATE);
  const router = useRouter();

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues(prevValues => ({
      ...prevValues,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setStatus('pending');
      const currentValues =
        await utils.Schema.ORGANIZATION_CREATE_VIEW.parseAsync({
          name: values.name,
          projectName: values.projectName,
          projectDescription: values.projectDescription,
        });

      const newOrganization = await utils.fetcher({
        url: '/organization',
        config: {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify(currentValues),
        },
      });

      if (newOrganization?.error) {
        setStatus('error');
        return;
      }

      router.push(
        `/organization/${newOrganization.organization.id}/project/${newOrganization.project.id}`
      );
    } catch (error) {
      if (Array.isArray((error as any).errors)) {
        setStatus('error');
        const zodErrors = (error as any).errors;
        const formattedErrors = zodErrors.reduce(
          (acc: any, curr: any) => ({
            ...acc,
            [curr.path[0]]: curr.message,
          }),
          {}
        );
        setError(formattedErrors);
        return;
      }

      setStatus('error');
      return;
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
              placeholder="Enter your first project name"
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
          <div className="create-organization-button">
            <UI.Button
              type="submit"
              variant="contained"
              size="small"
              disabled={status === 'pending'}
            >
              Create Organization
            </UI.Button>
          </div>
        </form>
      </CreateOrganizationWrapper>
    );
  }

  return (
    <Wrapper>
      <h1 className="organization-title">Organizations</h1>
      <p className="create-organization-subtitle">
        You are a member of the following organizations:
      </p>
      <div className="organization-list">
        {organizations.map(organization => (
          <div
            key={organization.id}
            className="organization-card"
            onClick={() =>
              router.push(
                `/organization/${organization.id}/project/${
                  organization.projects?.[0]?.id || ''
                }`
              )
            }
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
    </Wrapper>
  );
};
