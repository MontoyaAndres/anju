import { css } from '@emotion/react';
import styled from '@emotion/styled';

export const Wrapper = styled.div`
  ${({ theme }) => css`
    .copyable-label {
      font-size: ${theme.fonts.xs};
      font-weight: 700;
      color: ${theme.colors.bastille};
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin: 0 0 6px 0;
    }

    .copyable-block {
      position: relative;
      background-color: ${theme.colors.bastille}06;
      border: 1px solid ${theme.colors.alto};
      border-radius: 8px;
      padding: 10px 40px 10px 12px;

      &.is-error {
        background-color: ${theme.colors.red}08;
        border-color: ${theme.colors.red}40;
      }

      .copyable-copy {
        position: absolute;
        top: 6px;
        right: 6px;
        padding: 4px;
        color: ${theme.colors.saltBox};
        background-color: ${theme.colors.white};
        border: 1px solid ${theme.colors.alto};
        border-radius: 6px;
        transition:
          color 0.15s ease,
          background-color 0.15s ease;

        & > svg {
          width: 14px;
          height: 14px;
        }

        &:hover {
          color: ${theme.colors.bastille};
          background-color: ${theme.colors.bastille}05;
        }
      }

      .copyable-meta {
        font-size: ${theme.fonts.xs};
        color: ${theme.colors.saltBox};
        margin: 0 0 6px 0;
        font-weight: 600;
      }

      .copyable-pre {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: ${theme.fonts.xs};
        color: ${theme.colors.bastille};
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.5;
        max-height: 360px;
        overflow-y: auto;
      }

      &.is-error .copyable-pre {
        color: ${theme.colors.red};
      }
    }
  `}
`;
