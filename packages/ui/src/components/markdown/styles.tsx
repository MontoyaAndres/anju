import { css } from '@emotion/react';
import styled from '@emotion/styled';

export const Wrapper = styled.div`
  ${({ theme }) => css`
    color: ${theme.colors.bastille};
    font-size: ${theme.fonts.sm};
    line-height: 1.5;
    word-break: break-word;

    p {
      margin: 0 0 8px 0;
      line-height: 1.5;

      &:last-child {
        margin-bottom: 0;
      }
    }

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      font-weight: 700;
      color: ${theme.colors.bastille};
      margin: 10px 0 6px 0;
      line-height: 1.3;
    }

    h1 {
      font-size: ${theme.fonts.lg};
    }
    h2 {
      font-size: ${theme.fonts.base};
    }
    h3,
    h4,
    h5,
    h6 {
      font-size: ${theme.fonts.sm};
    }

    ul,
    ol {
      margin: 6px 0 8px 0;
      padding-left: 20px;

      li {
        margin-bottom: 2px;
      }
    }

    a {
      color: ${theme.colors.bastille};
      text-decoration: underline;

      &:hover {
        opacity: 0.8;
      }
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.92em;
      background-color: ${theme.colors.bastille}10;
      padding: 1px 5px;
      border-radius: 4px;
    }

    pre {
      background-color: ${theme.colors.bastille}0F;
      border: 1px solid ${theme.colors.alto};
      border-radius: 6px;
      padding: 8px 10px;
      margin: 6px 0 8px 0;
      overflow-x: auto;

      code {
        background: none;
        padding: 0;
        border-radius: 0;
        font-size: ${theme.fonts.xs};
        color: ${theme.colors.bastille};
      }
    }

    strong {
      font-weight: 700;
    }
  `}
`;
