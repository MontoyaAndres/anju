import { useState } from 'react';
import { useRouter } from 'next/router';
import { UI } from '@anju/ui';
import { utils } from '@anju/utils';

import { Wrapper } from './styles';

interface TokenInvitation {
  id: string;
  email: string;
  status: string;
  scope: 'ORGANIZATION' | 'PROJECT';
  expired: boolean;
  expiresAt: string;
  organizationName: string | null;
  projectName: string | null;
  inviterName: string | null;
}

export interface IProps {
  invitation: TokenInvitation | null;
  auth: { id: string; name: string; email: string } | null;
}

export const Invitation = (props: IProps) => {
  const { invitation, auth } = props;
  const router = useRouter();
  const snackbar = UI.Alert.useSnackbar();

  const [responding, setResponding] = useState<'accept' | 'decline' | null>(
    null
  );
  const [done, setDone] = useState<'accepted' | 'declined' | null>(null);

  const handleRespond = async (action: 'accept' | 'decline') => {
    if (!invitation || responding) return;
    setResponding(action);
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
      setDone(action === 'accept' ? 'accepted' : 'declined');
      if (action === 'accept') {
        snackbar.success('Invitation accepted');
      }
    } catch {
      snackbar.error('Failed to respond to invitation');
    } finally {
      setResponding(null);
    }
  };

  const card = (children: React.ReactNode) => (
    <Wrapper>
      <div className="invitation-card">{children}</div>
    </Wrapper>
  );

  if (done === 'accepted') {
    return card(
      <>
        <p className="invitation-eyebrow">Invitation</p>
        <h1 className="invitation-title">You&apos;re in</h1>
        <p className="invitation-text">
          The invitation has been accepted. You now have access to this
          workspace.
        </p>
        <div className="invitation-actions">
          <UI.Button
            variant="contained"
            size="small"
            onClick={() => router.push('/organization')}
          >
            Go to dashboard
          </UI.Button>
        </div>
      </>
    );
  }

  if (done === 'declined') {
    return card(
      <>
        <p className="invitation-eyebrow">Invitation</p>
        <h1 className="invitation-title">Invitation declined</h1>
        <p className="invitation-text">
          You&apos;ve declined this invitation. No access was granted.
        </p>
        <div className="invitation-actions">
          <UI.Button size="small" onClick={() => router.push('/')}>
            Go to Anju
          </UI.Button>
        </div>
      </>
    );
  }

  if (!invitation) {
    return card(
      <>
        <p className="invitation-eyebrow">Invitation</p>
        <h1 className="invitation-title">Invitation not found</h1>
        <p className="invitation-text">
          This invitation link is invalid. Ask whoever invited you to send a
          new one.
        </p>
        <div className="invitation-actions">
          <UI.Button size="small" onClick={() => router.push('/')}>
            Go to Anju
          </UI.Button>
        </div>
      </>
    );
  }

  const targetName =
    (invitation.scope === 'PROJECT'
      ? invitation.projectName
      : invitation.organizationName) || 'a workspace';
  const scopeLabel =
    invitation.scope === 'PROJECT' ? 'project' : 'organization';

  if (invitation.status !== utils.constants.STATUS_PENDING) {
    return card(
      <>
        <p className="invitation-eyebrow">Invitation</p>
        <h1 className="invitation-title">Invitation unavailable</h1>
        <p className="invitation-text">
          This invitation to {targetName} has already been used or was
          revoked.
        </p>
        <div className="invitation-actions">
          <UI.Button size="small" onClick={() => router.push('/')}>
            Go to Anju
          </UI.Button>
        </div>
      </>
    );
  }

  if (invitation.expired) {
    return card(
      <>
        <p className="invitation-eyebrow">Invitation</p>
        <h1 className="invitation-title">Invitation expired</h1>
        <p className="invitation-text">
          This invitation to {targetName} has expired. Ask whoever invited you
          to send a new one.
        </p>
        <div className="invitation-actions">
          <UI.Button size="small" onClick={() => router.push('/')}>
            Go to Anju
          </UI.Button>
        </div>
      </>
    );
  }

  const emailMatches =
    !!auth && auth.email.toLowerCase() === invitation.email.toLowerCase();

  return card(
    <>
      <p className="invitation-eyebrow">Invitation</p>
      <h1 className="invitation-title">You&apos;ve been invited</h1>
      <p className="invitation-text">
        {invitation.inviterName || 'A teammate'} invited you to join{' '}
        <span className="invitation-target">{targetName}</span> on Anju.
      </p>
      <span className="invitation-scope">{scopeLabel}</span>

      {emailMatches ? (
        <>
          <div className="invitation-actions">
            <UI.Button
              variant="contained"
              size="small"
              disabled={!!responding}
              onClick={() => handleRespond('accept')}
            >
              {responding === 'accept' ? 'Accepting...' : 'Accept invitation'}
            </UI.Button>
            <UI.Button
              size="small"
              disabled={!!responding}
              onClick={() => handleRespond('decline')}
            >
              {responding === 'decline' ? 'Declining...' : 'Decline'}
            </UI.Button>
          </div>
          <p className="invitation-note">
            Accepting adds {invitation.email} to this {scopeLabel}.
          </p>
        </>
      ) : auth ? (
        <>
          <p className="invitation-text">
            This invitation was sent to <strong>{invitation.email}</strong>,
            but you are signed in as <strong>{auth.email}</strong>. Sign in
            with the invited address to accept it.
          </p>
          <div className="invitation-actions">
            <UI.Button
              variant="contained"
              size="small"
              onClick={() => router.push('/organization')}
            >
              Go to dashboard
            </UI.Button>
          </div>
        </>
      ) : (
        <>
          <p className="invitation-text">
            Sign in or create an account with{' '}
            <strong>{invitation.email}</strong> to accept this invitation.
          </p>
          <div className="invitation-actions">
            <UI.Button
              variant="contained"
              size="small"
              onClick={() => router.push('/')}
            >
              Sign in to accept
            </UI.Button>
          </div>
        </>
      )}
    </>
  );
};
