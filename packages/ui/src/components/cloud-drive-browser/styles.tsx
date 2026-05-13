import { css } from '@emotion/react';
import styled from '@emotion/styled';

export const Wrapper = styled.div`
  ${({ theme }) => css`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 360px;

    .gdrive-tabs {
      border-bottom: 1px solid ${theme.colors.alto};
      min-height: 44px;

      .MuiTabs-indicator {
        height: 2px;
        border-radius: 2px;
        background-color: ${theme.colors.bastille};
      }

      .MuiTab-root {
        text-transform: none;
        font-size: ${theme.fonts.sm};
        font-weight: 500;
        min-height: 44px;
        padding: 8px 14px;
        color: ${theme.colors.bastille}99;
        border-radius: 8px 8px 0 0;
        transition:
          background-color 0.15s ease,
          color 0.15s ease;

        & > .MuiTab-iconWrapper {
          margin-right: 6px;
          width: 16px;
          height: 16px;
        }

        &:hover {
          color: ${theme.colors.bastille};
          background-color: ${theme.colors.bastille}06;
        }

        &.Mui-selected {
          color: ${theme.colors.bastille};
          font-weight: 600;
        }

        &:focus-visible {
          outline: 2px solid ${theme.colors.bastille}40;
          outline-offset: -2px;
        }
      }
    }

    .gdrive-toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      min-height: 32px;

      .gdrive-search {
        flex: 1;
        min-width: 200px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 4px 6px 4px 10px;
        border: 1px solid ${theme.colors.alto};
        border-radius: 8px;
        background-color: ${theme.colors.white};
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease;

        &:focus-within {
          border-color: ${theme.colors.bastille}80;
          box-shadow: 0 0 0 3px ${theme.colors.bastille}10;
        }

        &.has-value {
          border-color: ${theme.colors.bastille}60;
        }

        & > svg {
          width: 16px;
          height: 16px;
          color: ${theme.colors.bastille}80;
          flex-shrink: 0;
        }

        input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          font-size: ${theme.fonts.sm};
          color: ${theme.colors.bastille};
          padding: 4px 0;

          &::placeholder {
            color: ${theme.colors.bastille}66;
          }
        }

        .gdrive-search-clear {
          color: ${theme.colors.bastille}80;
          padding: 2px;

          &:hover {
            color: ${theme.colors.bastille};
            background-color: ${theme.colors.bastille}0A;
          }

          svg {
            width: 14px;
            height: 14px;
          }
        }
      }

      .gdrive-selection-info {
        font-size: ${theme.fonts.xs};
        color: ${theme.colors.bastille}99;
        padding: 4px 10px;
        background-color: ${theme.colors.bastille}08;
        border-radius: 999px;
        font-weight: 600;
      }
    }

    .gdrive-selected-tray {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 12px;
      border: 1px solid ${theme.colors.alto};
      border-radius: 10px;
      background-color: ${theme.colors.bastille}05;

      .gdrive-selected-list {
        flex: 1;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        max-height: 88px;
        overflow-y: auto;
      }

      .gdrive-selected-clear {
        flex-shrink: 0;
        border: none;
        background: transparent;
        padding: 4px 8px;
        border-radius: 6px;
        font-family: inherit;
        font-size: ${theme.fonts.xs};
        font-weight: 600;
        color: ${theme.colors.bastille}99;
        cursor: pointer;
        transition:
          background-color 0.15s ease,
          color 0.15s ease;

        &:hover {
          color: ${theme.colors.bastille};
          background-color: ${theme.colors.bastille}0A;
        }
      }
    }

    .gdrive-selected-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      max-width: 240px;
      padding: 3px 3px 3px 8px;
      border: 1px solid ${theme.colors.bastille}33;
      border-radius: 999px;
      background-color: ${theme.colors.white};
      font-size: ${theme.fonts.xs};
      color: ${theme.colors.bastille};

      .gdrive-chip-icon {
        display: inline-flex;
        align-items: center;
        font-size: 14px;
        color: ${theme.colors.bastille}80;

        img {
          width: 14px;
          height: 14px;
          object-fit: contain;
        }
      }

      .gdrive-chip-name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 500;
      }

      .gdrive-chip-remove.MuiButtonBase-root {
        padding: 2px;
        border-radius: 999px;
        color: ${theme.colors.bastille}80;
        font-size: 12px;
        transition:
          background-color 0.15s ease,
          color 0.15s ease;

        &:hover {
          color: ${theme.colors.bastille};
          background-color: ${theme.colors.bastille}10;
        }

        &:focus-visible {
          outline: 2px solid ${theme.colors.bastille}40;
          outline-offset: 1px;
        }
      }
    }

    .gdrive-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-height: 240px;
    }

    .gdrive-row {
      display: grid;
      grid-template-columns: 28px 24px 1fr 60px 90px;
      align-items: center;
      gap: 10px;
      padding: 8px 0;
      border: 1px solid transparent;
      border-radius: 8px;
      cursor: pointer;
      background: transparent;
      text-align: left;
      transition:
        background-color 0.15s ease,
        border-color 0.15s ease,
        box-shadow 0.15s ease;
      width: 100%;

      @media (min-width: ${theme.screens.md}) {
        padding: 8px 10px;
        grid-template-columns: 28px 24px 1fr 110px 90px;
      }

      &:hover {
        background-color: ${theme.colors.bastille}06;
        border-color: ${theme.colors.alto};
      }

      &.selected {
        background-color: ${theme.colors.bastille}0D;
        border-color: ${theme.colors.bastille}66;
        box-shadow: 0 0 0 1px ${theme.colors.bastille}10;
      }

      &.covered {
        background-color: ${theme.colors.bastille}08;
        border-color: ${theme.colors.bastille}33;
        box-shadow: none;

        .gdrive-row-name,
        .gdrive-row-type,
        .gdrive-row-time,
        .gdrive-row-meta {
          color: ${theme.colors.bastille}80;
        }

        .gdrive-row-icon > svg,
        .gdrive-row-icon img {
          opacity: 0.7;
        }
      }

      &:focus-visible {
        outline: 2px solid ${theme.colors.bastille}40;
        outline-offset: 2px;
      }

      .gdrive-row-checkbox {
        margin: 0;
        padding: 0;
      }

      .gdrive-row-icon {
        width: 24px;
        height: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;

        & > svg {
          width: 20px;
          height: 20px;
          color: ${theme.colors.bastille}99;
        }

        img {
          width: 18px;
          height: 18px;
          object-fit: contain;
        }
      }

      .gdrive-row-body {
        min-width: 0;

        .gdrive-row-name {
          font-size: ${theme.fonts.sm};
          color: ${theme.colors.bastille};
          font-weight: 500;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .gdrive-row-meta {
          font-size: ${theme.fonts.xs};
          color: ${theme.colors.bastille}80;
          margin: 2px 0 0 0;
        }
      }

      .gdrive-row-type {
        font-size: ${theme.fonts.xs};
        color: ${theme.colors.bastille}80;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .gdrive-row-time {
        font-size: ${theme.fonts.xs};
        color: ${theme.colors.bastille}80;
        text-align: right;
        white-space: nowrap;
      }
    }

    .gdrive-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 40px 16px;
      color: ${theme.colors.bastille}99;
      text-align: center;

      & > svg {
        width: 36px;
        height: 36px;
        color: ${theme.colors.bastille}66;
      }

      p {
        margin: 0;
        font-size: ${theme.fonts.sm};
      }
    }

    .gdrive-error {
      padding: 12px 14px;
      border: 1px solid ${theme.colors.red}33;
      background-color: ${theme.colors.red}0D;
      color: ${theme.colors.red};
      border-radius: 8px;
      font-size: ${theme.fonts.sm};
    }
  `}
`;
