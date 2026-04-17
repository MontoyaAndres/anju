import { css } from '@emotion/react';
import styled from '@emotion/styled';
import MaterialSkeleton from '@mui/material/Skeleton';

export const StyledSkeleton = styled(MaterialSkeleton)`
  ${({ theme }) => css`
    background-color: ${theme.colors.bastille}14;
    border-radius: 6px;

    &.MuiSkeleton-text {
      transform: none;
      border-radius: 4px;
    }

    &.MuiSkeleton-circular {
      border-radius: 50%;
    }
  `}
`;
