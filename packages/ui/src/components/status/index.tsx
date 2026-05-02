import CircularProgress from '@mui/material/CircularProgress';
import { utils } from '@anju/utils';

import {
  StatusBadgeWrapper,
  FailedIcon,
  CompletedIcon
} from './styles';

export interface IProps {
  status: string;
  variant?: 'icon' | 'badge';
  pendingLabel?: string;
  completedLabel?: string;
  failedLabel?: string;
}

export const Status = ({
  status,
  variant = 'icon',
  pendingLabel = 'Indexing',
  completedLabel = 'Ready',
  failedLabel = 'Failed'
}: IProps) => {
  if (variant === 'icon') {
    if (status === utils.constants.STATUS_PENDING) {
      return (
        <CircularProgress size={12} thickness={5} aria-label={pendingLabel} />
      );
    }
    if (status === utils.constants.STATUS_FAILED) {
      return <FailedIcon titleAccess={failedLabel} />;
    }
    return null;
  }

  if (status === utils.constants.STATUS_PENDING) {
    return (
      <StatusBadgeWrapper tone="pending">
        <CircularProgress size={10} thickness={5} />
        {pendingLabel}
      </StatusBadgeWrapper>
    );
  }
  if (status === utils.constants.STATUS_FAILED) {
    return (
      <StatusBadgeWrapper tone="failed">
        <FailedIcon />
        {failedLabel}
      </StatusBadgeWrapper>
    );
  }
  return (
    <StatusBadgeWrapper tone="completed">
      <CompletedIcon />
      {completedLabel}
    </StatusBadgeWrapper>
  );
};
