import { useRouter } from 'next/router';
import { UI } from '@anju/ui';
import { LockOutlined } from '@mui/icons-material';

import { NoAccessWrapper } from './styles';

interface IProps {
  organizationId: string | null;
}

export const NoAccess = (props: IProps) => {
  const { organizationId } = props;
  const router = useRouter();

  return (
    <NoAccessWrapper>
      <div className="no-access-card">
        <div className="no-access-icon">
          <LockOutlined />
        </div>
        <h1 className="no-access-title">
          You don&apos;t have access to this project
        </h1>
        <p className="no-access-text">
          You&apos;re a member of this organization, but not of this project. A
          project admin can invite you from the project&apos;s members in the
          organization settings.
        </p>
        <div className="no-access-actions">
          <UI.Button
            variant="contained"
            size="small"
            onClick={() =>
              router.push(
                organizationId
                  ? `/organization/${organizationId}/settings`
                  : '/organization'
              )
            }
          >
            Go to organization settings
          </UI.Button>
        </div>
      </div>
    </NoAccessWrapper>
  );
};
