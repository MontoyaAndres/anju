import { css } from '@emotion/react';
import styled from '@emotion/styled';

interface IProps {
  startIcon?: string;
}

export const Wrapper = styled.div<IProps>`
  ${({ theme, startIcon }) => css`
    & > button {
      text-transform: none;
      width: 100%;
      font-size: ${theme.fonts.lg};
      font-weight: 700;
      border-radius: 8px;
      padding: 12px 24px;

      @media (min-width: ${theme.screens.xl}) {
        padding: 14px 34px;
      }

      ${startIcon &&
      css`
        display: flex;
        align-items: center;
        grid-gap: 8px;

        .button-start-icon {
          background-image: url(${startIcon});
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          width: 24px;
          height: 24px;
        }
      `}
    }

    & > .MuiButton-outlined {
      color: ${theme.colors.bastille};
      border: 1px solid ${theme.colors.alto};
    }
  `}
`;
