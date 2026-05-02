import { css } from '@emotion/react';
import styled from '@emotion/styled';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import ErrorOutline from '@mui/icons-material/ErrorOutline';

export type StatusTone = 'pending' | 'completed' | 'failed';

export const StatusBadgeWrapper = styled.span<{ tone: StatusTone }>`
  ${({ theme, tone }) => css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: ${theme.fonts.xs};
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 4px;
    width: fit-content;
    background-color: ${theme.colors.bastille}0A;
    color: ${tone === 'failed'
      ? theme.colors.red
      : tone === 'completed'
        ? theme.colors.fernGreen
        : theme.colors.saltBox};
  `}
`;

export const FailedIcon = styled(ErrorOutline)`
  ${({ theme }) => css`
    font-size: 14px;
    color: ${theme.colors.red};
  `}
`;

export const CompletedIcon = styled(CheckCircleOutline)`
  ${({ theme }) => css`
    font-size: 14px;
    color: ${theme.colors.fernGreen};
  `}
`;
