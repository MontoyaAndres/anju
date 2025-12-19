import { css } from '@emotion/react';
import styled from '@emotion/styled';

export const Wrapper = styled.div`
  ${({ theme }) => css`
    .login-content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: calc(100vh - 130px);

      .login-content-texts {
        padding: 0 20px;

        @media (min-width: ${theme.screens.md}) {
          padding: 0;
        }

        .login-content-subtitle {
          font-size: calc(${theme.fonts['5xl']} + 4px);
          color: ${theme.colors.bastille};
          font-weight: 400;
          line-height: 120%;
          text-align: center;
          display: block;

          @media (min-width: ${theme.screens.md}) {
            display: initial;
          }
        }

        .login-content-title {
          font-size: calc(${theme.fonts['5xl']} + 4px);
          color: ${theme.colors.bastille};
          font-weight: 700;
          line-height: 120%;
          text-align: center;
          display: block;

          @media (min-width: ${theme.screens.md}) {
            display: initial;
          }
        }
      }

      .login-content-buttons {
        display: grid;
        grid-gap: 20px;
        margin-top: 20px;
      }

      @media (min-width: ${theme.screens.xl}) {
        .login-content-subtitle {
          font-size: calc(${theme.fonts['5xl']} + 4px);
        }

        .login-content-title {
          font-size: calc(${theme.fonts['5xl']} + 4px);
        }
      }
    }

    .terms {
      position: fixed;
      bottom: 30px;
      text-align: center;
      color: ${theme.colors.bastille}CC;
      font-size: ${theme.fonts.sm};
      font-style: normal;
      font-weight: 400;
      line-height: 130%;
      width: 100%;
      padding: 0 20px;

      @media (min-width: ${theme.screens.xl}) {
        padding: 0;
      }

      & > a {
        color: ${theme.colors.bastille}CC;
        font-size: ${theme.fonts.sm};
        font-style: normal;
        font-weight: 400;
        line-height: 130%;
        text-decoration-line: underline;
      }
    }
  `}
`;
