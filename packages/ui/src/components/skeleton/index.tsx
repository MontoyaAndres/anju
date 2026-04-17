import { SkeletonProps } from '@mui/material/Skeleton';

import { StyledSkeleton } from './styles';

export interface IProps extends SkeletonProps {}

export const Skeleton = (props: IProps) => {
  return <StyledSkeleton animation="pulse" {...props} />;
};
