import { css } from '@emotion/react';
import styled from '@emotion/styled';

export const Wrapper = styled.div`
  ${({ theme }) => css`
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 1080px;
    margin: 0 auto;
    padding: 24px 20px 64px;

    @media (min-width: ${theme.screens.md}) {
      flex-direction: row;
      gap: 32px;
      padding: 32px;
    }

    .settings-nav {
      display: flex;
      flex-direction: row;
      gap: 4px;
      overflow-x: auto;

      @media (min-width: ${theme.screens.md}) {
        flex-direction: column;
        flex-shrink: 0;
        width: 200px;
        position: sticky;
        top: 24px;
        align-self: flex-start;
        overflow-x: visible;
      }

      .settings-nav-item {
        appearance: none;
        background: transparent;
        border: none;
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        font-size: ${theme.fonts.sm};
        font-weight: 500;
        color: ${theme.colors.bastille}99;
        padding: 8px 12px;
        border-radius: 8px;
        white-space: nowrap;
        transition: background 120ms ease, color 120ms ease;

        &:hover {
          background: ${theme.colors.bastille}0d;
          color: ${theme.colors.bastille};
        }

        &.active {
          background: ${theme.colors.bastille}14;
          color: ${theme.colors.bastille};
          font-weight: 600;
        }

        &.danger {
          color: ${theme.colors.red};

          &:hover {
            background: ${theme.colors.red}0d;
          }

          &.active {
            background: ${theme.colors.red}14;
            color: ${theme.colors.red};
          }
        }
      }
    }

    .settings-content {
      flex: 1;
      min-width: 0;
    }

    .settings-header {
      margin-bottom: 20px;

      .settings-title {
        font-size: ${theme.fonts['2xl']};
        color: ${theme.colors.bastille};
        font-weight: 700;
        margin: 0;
      }

      .settings-subtitle {
        font-size: ${theme.fonts.sm};
        color: ${theme.colors.bastille}99;
        margin: 6px 0 0;
        line-height: 1.4;
      }
    }

    .settings-section {
      background: ${theme.colors.white};
      border: 1px solid ${theme.colors.bastille}1a;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 20px;

      &.danger-card {
        border-color: ${theme.colors.red}33;
        background: ${theme.colors.red}05;
      }

      .settings-section-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 16px;

        .settings-section-text {
          flex: 1;
        }

        .settings-section-title {
          font-size: ${theme.fonts.lg};
          color: ${theme.colors.bastille};
          font-weight: 600;
          margin: 0;
        }

        .settings-section-description {
          font-size: ${theme.fonts.sm};
          color: ${theme.colors.bastille}99;
          margin: 4px 0 0;
        }

        .MuiButtonBase-root {
          flex-shrink: 0;
          align-self: flex-start;
          white-space: nowrap;
          font-size: ${theme.fonts.sm};
          padding: 6px 14px;
          border-radius: 8px;
          text-transform: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          width: auto;

          .button-text {
            font-weight: 600;
          }

          & > svg {
            width: 18px;
            height: 18px;
          }
        }
      }

      .settings-meta-row {
        display: flex;
        gap: 24px;
        flex-wrap: wrap;
        margin-bottom: 16px;
        padding: 12px 14px;
        background: ${theme.colors.bastille}05;
        border-radius: 8px;

        .settings-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;

          .settings-meta-label {
            font-size: ${theme.fonts.xs};
            color: ${theme.colors.bastille}99;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          .settings-meta-value {
            font-size: ${theme.fonts.sm};
            color: ${theme.colors.bastille};
            font-weight: 600;
            margin: 0;
          }
        }
      }

      .settings-field-row {
        display: flex;
        flex-direction: column;
        gap: 12px;

        @media (min-width: ${theme.screens.md}) {
          flex-direction: row;
          align-items: flex-end;
        }

        > .field {
          flex: 1;
        }
      }

      .settings-actions {
        display: flex;
        gap: 8px;
        margin-top: 16px;
        flex-wrap: wrap;

        .MuiButtonBase-root {
          font-size: ${theme.fonts.sm};
          padding: 6px 14px;
          border-radius: 8px;
          text-transform: none;
        }
      }

      .danger-button {
        background: ${theme.colors.red};
        color: ${theme.colors.white};

        &:hover {
          background: ${theme.colors.red};
          opacity: 0.9;
        }
      }
    }

    .projects-list {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .project-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border: 1px solid ${theme.colors.bastille}14;
        border-radius: 10px;

        .project-item-name {
          font-size: ${theme.fonts.sm};
          font-weight: 600;
          color: ${theme.colors.bastille};
          margin: 0;
        }

        .project-item-link {
          appearance: none;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: ${theme.fonts.xs};
          color: ${theme.colors.bastille}99;
          padding: 4px 8px;

          &:hover {
            color: ${theme.colors.bastille};
          }
        }
      }
    }

    .projects-empty {
      text-align: center;
      padding: 16px 12px;
      color: ${theme.colors.bastille}99;
      font-size: ${theme.fonts.sm};
    }

    .llms-empty {
      text-align: center;
      padding: 24px 12px;
      color: ${theme.colors.bastille}99;
      font-size: ${theme.fonts.sm};
    }

    .llm-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .llm-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 14px 16px;
      border: 1px solid ${theme.colors.bastille}1a;
      border-radius: 10px;

      .llm-card-info {
        flex: 1;
        min-width: 0;
      }

      .llm-card-name {
        font-size: ${theme.fonts.base};
        font-weight: 600;
        color: ${theme.colors.bastille};
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .llm-card-meta {
        font-size: ${theme.fonts.xs};
        color: ${theme.colors.bastille}99;
        margin: 4px 0 0;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .llm-card-actions {
        display: flex;
        gap: 4px;

        .MuiIconButton-root {
          padding: 6px;
        }
      }
    }

    .llm-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 18px;
      background: ${theme.colors.bastille}05;
      border-radius: 10px;
      border: 1px solid ${theme.colors.bastille}1a;
      margin-bottom: 16px;

      .llm-form-title {
        font-size: ${theme.fonts.base};
        font-weight: 600;
        color: ${theme.colors.bastille};
        margin: 0 0 4px;
      }

      .llm-form-actions {
        display: flex;
        gap: 8px;
        margin-top: 4px;

        .MuiButtonBase-root {
          font-size: ${theme.fonts.sm};
          padding: 6px 14px;
          border-radius: 8px;
          text-transform: none;
        }
      }
    }

    .danger-warning {
      font-size: ${theme.fonts.sm};
      color: ${theme.colors.bastille};
      margin: 0 0 16px;
      line-height: 1.5;

      strong {
        color: ${theme.colors.red};
      }
    }
  `}
`;
