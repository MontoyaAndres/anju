import { css } from '@emotion/react';
import styled from '@emotion/styled';

export const Overlay = styled.div`
  ${({ theme }) => css`
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: ${theme.colors.bastille}66;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `}
`;

export const Dialog = styled.div`
  ${({ theme }) => css`
    background-color: ${theme.colors.white};
    border-radius: 12px;
    box-shadow: ${theme['custom-shadows'].smallest};
    width: 100%;
    max-width: 400px;
    padding: 24px;

    .alert-title {
      font-size: ${theme.fonts.lg};
      font-weight: 700;
      color: ${theme.colors.bastille};
      margin: 0 0 8px 0;
    }

    .alert-description {
      font-size: ${theme.fonts.base};
      color: ${theme.colors.bastille}99;
      margin: 0 0 24px 0;
      line-height: 1.5;
    }

    .alert-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `}
`;
