import { useEffect, useState } from 'react';
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

type Organization = IProps['organizations'][number];
type Member = Organization['members'][number];

interface MyInvitation {
  id: string;
  email: string;
  status: string;
  organizationId: string;
  projectId: string | null;
  organization: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  invitedBy: { id: string; name: string; email: string } | null;
}

const initial = (value: string) => (value.trim()[0] || '?').toUpperCase();

const isHttpUrl = (value: string | null): value is string =>
  !!value && /^https?:\/\//i.test(value);

export const Organization = (props: IProps) => {
  const { organizations, auth } = props;
  const router = useRouter();
  const snackbar = UI.Alert.useSnackbar();

  // Create-organization form / modal.
  const [values, setValues] = useState(INITIAL_FORM_STATE);
  const [status, setStatus] = useState<
    'idle' | 'pending' | 'rejected' | 'resolved'
  >('idle');
  const [error, setError] = useState(INITIAL_FORM_STATE);
  const [apiError, setApiError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Invitations addressed to the signed-in user.
  const [invitations, setInvitations] = useState<MyInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  // Invite-a-teammate modal, scoped to a specific organization.
  const [inviteOrg, setInviteOrg] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteEmailError, setInviteEmailError] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const data = await utils.fetcher({
          url: '/invitation',
          config: { credentials: 'include', signal: controller.signal }
        });
        if (controller.signal.aborted) return;
        if (Array.isArray(data)) setInvitations(data);
      } catch {
        // aborted or network failure
      } finally {
        if (!controller.signal.aborted) setInvitationsLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

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

      if (utils.isApiError(newOrganization)) {
        setStatus('rejected');
        setApiError(
          utils.getApiErrorMessage(
            newOrganization,
            'Something went wrong. Please try again.'
          )
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

  const handleRespond = async (
    invitation: MyInvitation,
    action: 'accept' | 'decline'
  ) => {
    if (respondingId) return;
    setRespondingId(invitation.id);
    try {
      const data = await utils.fetcher({
        url: `/invitation/${invitation.id}/respond`,
        config: {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ action })
        }
      });
      if (utils.isApiError(data)) {
        snackbar.error(
          utils.getApiErrorMessage(data, 'Failed to respond to invitation')
        );
        return;
      }
      setInvitations(prev => prev.filter(item => item.id !== invitation.id));
      if (action === 'accept') {
        snackbar.success('Invitation accepted');
        // Re-run getServerSideProps so the new membership shows up.
        router.replace(router.asPath);
      } else {
        snackbar.success('Invitation declined');
      }
    } catch {
      snackbar.error('Failed to respond to invitation');
    } finally {
      setRespondingId(null);
    }
  };

  const closeInviteModal = () => {
    if (inviting) return;
    setInviteOrg(null);
    setInviteEmail('');
    setInviteEmailError('');
  };

  const handleInviteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inviteOrg || inviting) return;

    let email: string;
    try {
      const parsed =
        await utils.Schema.ORGANIZATION_INVITATION_CREATE_VIEW.parseAsync({
          email: inviteEmail
        });
      email = parsed.email;
    } catch (err) {
      const issues = (err as { issues?: { message: string }[] })?.issues;
      setInviteEmailError(
        issues?.[0]?.message || 'Enter a valid email address'
      );
      return;
    }

    setInviteEmailError('');
    setInviting(true);
    try {
      const data = await utils.fetcher({
        url: `/organization/${inviteOrg.id}/invitation`,
        config: {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ email })
        }
      });
      if (utils.isApiError(data)) {
        snackbar.error(
          utils.getApiErrorMessage(data, 'Failed to send invitation')
        );
        return;
      }
      snackbar.success(`Invitation sent to ${email}`);
      setInviting(false);
      setInviteOrg(null);
      setInviteEmail('');
    } catch {
      snackbar.error('Failed to send invitation');
      setInviting(false);
    }
  };

  const openOrganization = (organization: Organization) => {
    const projectId = organization.projects?.[0]?.id;
    if (projectId) {
      router.push(`/organization/${organization.id}/project/${projectId}`);
    } else if (organization.isMember) {
      router.push(`/organization/${organization.id}/settings`);
    }
  };

  const renderAvatar = (member: Member) => (
    <div key={member.userId} className="member-avatar" title={member.user.name}>
      {isHttpUrl(member.user.image) ? (
        <img src={member.user.image} alt="" />
      ) : (
        <span>{initial(member.user.name)}</span>
      )}
    </div>
  );

  const renderInvitations = () => {
    if (invitationsLoading || invitations.length === 0) return null;
    return (
      <div className="invitations-panel">
        <div className="invitations-head">
          <h2 className="invitations-title">Your invitations</h2>
          <p className="invitations-subtitle">
            You&apos;ve been invited to the following workspaces.
          </p>
        </div>
        <div className="invitations-list">
          {invitations.map(invitation => {
            const isProject = !!invitation.projectId;
            const targetName =
              (isProject
                ? invitation.project?.name
                : invitation.organization?.name) || 'a workspace';
            return (
              <div key={invitation.id} className="invitation-card">
                <div className="invitation-info">
                  <p className="invitation-target">
                    {targetName}
                    <span className="invitation-scope">
                      {isProject ? 'Project' : 'Organization'}
                    </span>
                  </p>
                  <p className="invitation-meta">
                    Invited by {invitation.invitedBy?.name || 'a teammate'}
                  </p>
                </div>
                <div className="invitation-actions">
                  <UI.Button
                    variant="contained"
                    size="small"
                    disabled={respondingId === invitation.id}
                    onClick={() => handleRespond(invitation, 'accept')}
                  >
                    {respondingId === invitation.id ? 'Working...' : 'Accept'}
                  </UI.Button>
                  <UI.Button
                    size="small"
                    disabled={respondingId === invitation.id}
                    onClick={() => handleRespond(invitation, 'decline')}
                  >
                    Decline
                  </UI.Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderOrganizationCard = (organization: Organization) => {
    const isOwner = organization.ownerId === auth.id;
    return (
      <div
        key={organization.id}
        className={`organization-card${
          organization.isMember ? '' : ' organization-card-basic'
        }`}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openOrganization(organization);
          }
        }}
        onClick={() => openOrganization(organization)}
      >
        <div className="organization-card-head">
          <h2 className="organization-card-name">{organization.name}</h2>
          {organization.isMember ? (
            isOwner && <span className="organization-badge">Owner</span>
          ) : (
            <span className="organization-badge organization-badge-basic">
              Project access
            </span>
          )}
        </div>

        {organization.isMember ? (
          <>
            <ul className="organization-info">
              <li className="organization-info-item">
                Projects: {organization.projectCount}
              </li>
              <li className="organization-info-item">
                Members: {organization.organizationUserCount}
              </li>
              <li className="organization-info-item">
                Created{' '}
                {new Date(organization.createdAt).toLocaleDateString()}
              </li>
            </ul>

            {organization.members.length > 0 && (
              <div className="organization-members">
                {organization.members.slice(0, 5).map(renderAvatar)}
                {organization.members.length > 5 && (
                  <div className="member-avatar member-avatar-more">
                    <span>+{organization.members.length - 5}</span>
                  </div>
                )}
              </div>
            )}

            <div className="organization-card-actions">
              <UI.Button
                size="small"
                variant="contained"
                onClick={e => {
                  e.stopPropagation();
                  setInviteEmail('');
                  setInviteEmailError('');
                  setInviteOrg({
                    id: organization.id,
                    name: organization.name
                  });
                }}
              >
                Invite
              </UI.Button>
              <UI.Button
                size="small"
                onClick={e => {
                  e.stopPropagation();
                  router.push(`/organization/${organization.id}/settings`);
                }}
              >
                Settings
              </UI.Button>
            </div>
          </>
        ) : (
          <>
            <p className="organization-basic-note">
              You have access to {organization.projects.length} project
              {organization.projects.length === 1 ? '' : 's'} in this
              organization. Ask an admin to invite you for full access.
            </p>
            <ul className="organization-info">
              {organization.projects.map(project => (
                <li key={project.id} className="organization-info-item">
                  {project.name}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  };

  const renderCreateForm = () => (
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
  );

  // First-run onboarding: no organizations and nothing to accept.
  if (organizations.length === 0 && invitations.length === 0) {
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
        {renderCreateForm()}
      </CreateOrganizationWrapper>
    );
  }

  return (
    <Wrapper>
      {renderInvitations()}

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

      {organizations.length === 0 ? (
        <div className="organization-empty">
          <p className="organization-empty-text">
            You are not part of any organization yet. Accept an invitation
            above, or create your own.
          </p>
          <UI.Button variant="contained" size="small" onClick={handleModalOpen}>
            Create organization
          </UI.Button>
        </div>
      ) : (
        <div className="organization-list">
          {organizations.map(renderOrganizationCard)}
        </div>
      )}

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

      {inviteOrg && (
        <UI.Portal>
          <ModalOverlay onClick={closeInviteModal}>
            <ModalDialog role="dialog" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Invite to {inviteOrg.name}</h2>
                <IconButton size="small" onClick={closeInviteModal}>
                  <Close />
                </IconButton>
              </div>
              <form onSubmit={handleInviteSubmit}>
                <div className="modal-body">
                  <UI.Input
                    label="Email"
                    placeholder="teammate@company.com"
                    name="inviteEmail"
                    type="email"
                    value={inviteEmail}
                    disabled={inviting}
                    error={!!inviteEmailError}
                    helperText={inviteEmailError}
                    onChange={e => {
                      setInviteEmail(e.target.value);
                      if (inviteEmailError) setInviteEmailError('');
                    }}
                  />
                  <p className="modal-hint">
                    They&apos;ll receive an email and can accept the invitation
                    once signed in with this address.
                  </p>
                </div>
                <div className="modal-actions">
                  <UI.Button
                    size="small"
                    disabled={inviting}
                    onClick={closeInviteModal}
                  >
                    Cancel
                  </UI.Button>
                  <UI.Button
                    type="submit"
                    variant="contained"
                    size="small"
                    disabled={inviting || !inviteEmail.trim()}
                  >
                    {inviting ? 'Sending...' : 'Send invitation'}
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
