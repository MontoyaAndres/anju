import { css } from '@emotion/react';
import styled from '@emotion/styled';

export const Wrapper = styled.div`
  ${({ theme }) => css`
    min-height: calc(100vh - 60px);

    @media (min-width: ${theme.screens.xl}) {
      min-height: 100vh;
    }

    .tools-container {
      padding: 20px;
      max-width: 1100px;
      margin: 0 auto;

      @media (min-width: ${theme.screens.md}) {
        padding: 24px 32px;
      }
    }

    .tools-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 20px;

      .tools-title {
        font-size: ${theme.fonts['2xl']};
        font-weight: 700;
        color: ${theme.colors.bastille};
        margin: 0;
      }

      .tools-subtitle {
        font-size: ${theme.fonts.sm};
        color: ${theme.colors.bastille}99;
        margin: 6px 0 0 0;
        line-height: 1.4;
      }
    }

    .tools-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: ${theme.fonts.sm};

      & > svg {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }

      & > span {
        flex: 1;
        line-height: 1.4;
      }

      &.tools-banner-success {
        background-color: #e8f5e9;
        color: #1b5e20;

        & > svg {
          color: #2e7d32;
        }
      }

      &.tools-banner-warning {
        background-color: #fff8e1;
        color: #795548;

        & > svg {
          color: #f57c00;
        }
      }
    }

    .tools-tabs {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid ${theme.colors.alto};
      margin-bottom: 20px;

      .tools-tab {
        position: relative;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 16px;
        border: none;
        background: none;
        cursor: pointer;
        font-size: ${theme.fonts.sm};
        font-weight: 600;
        color: ${theme.colors.saltBox};
        transition: color 0.15s ease;

        .tools-tab-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 10px;
          background-color: ${theme.colors.bastille}0F;
          color: ${theme.colors.bastille}CC;
          font-size: ${theme.fonts.xs};
          font-weight: 600;
        }

        &:hover {
          color: ${theme.colors.bastille};
        }

        &.active {
          color: ${theme.colors.bastille};

          &::after {
            content: '';
            position: absolute;
            left: 8px;
            right: 8px;
            bottom: -1px;
            height: 2px;
            background-color: ${theme.colors.bastille};
            border-radius: 2px 2px 0 0;
          }
        }
      }
    }

    .tools-empty {
      font-size: ${theme.fonts.base};
      color: ${theme.colors.bastille}99;
      margin: 40px 0;
      text-align: center;
    }

    .tools-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 56px 20px;
      text-align: center;

      & > svg {
        width: 48px;
        height: 48px;
        color: ${theme.colors.bastille}40;
      }

      h3 {
        font-size: ${theme.fonts.lg};
        color: ${theme.colors.bastille};
        margin: 0;
      }

      p {
        font-size: ${theme.fonts.sm};
        color: ${theme.colors.bastille}99;
        margin: 0 0 8px 0;
      }

      .MuiButtonBase-root {
        font-size: ${theme.fonts.sm};
        padding: 6px 16px;
        border-radius: 8px;
        text-transform: none;

        .button-text {
          font-weight: 600;
        }
      }
    }

    .tools-group {
      margin-bottom: 24px;
    }

    .tools-group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;

      .tools-group-header-info {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      .tools-group-icon {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        background-color: ${theme.colors.bastille}0A;
        color: ${theme.colors.bastille};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${theme.fonts.base};
        font-weight: 700;
        flex-shrink: 0;

        img {
          width: 20px;
          height: 20px;
          object-fit: contain;
        }
      }

      .tools-group-title {
        font-size: ${theme.fonts.base};
        font-weight: 600;
        color: ${theme.colors.bastille};
        margin: 0;
      }

      .tools-group-meta {
        font-size: ${theme.fonts.xs};
        color: ${theme.colors.bastille}99;
        margin: 2px 0 0 0;
      }

      .MuiButtonBase-root {
        font-size: ${theme.fonts.xs};
        padding: 4px 12px;
        border-radius: 6px;
        text-transform: none;
        display: flex;
        align-items: center;
        gap: 4px;

        & > svg {
          width: 14px;
          height: 14px;
        }

        .button-text {
          font-weight: 600;
        }
      }
    }

    .tools-accordion {
      border: 1px solid ${theme.colors.alto};
      border-radius: 10px;
      background-color: ${theme.colors.white};
      margin-bottom: 10px;
      overflow: hidden;
      transition: border-color 0.15s ease;

      &:hover {
        border-color: ${theme.colors.bastille}40;
      }

      &.expanded {
        border-color: ${theme.colors.bastille}40;

        .tools-accordion-chevron {
          transform: rotate(180deg);
        }
      }
    }

    .tools-accordion-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 14px 16px;
      border: none;
      background: none;
      cursor: pointer;
      text-align: left;
      gap: 12px;

      &:hover {
        background-color: ${theme.colors.bastille}04;

        .tools-group-icon {
          border-color: ${theme.colors.bastille}30;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }

        .tools-accordion-chevron-wrap {
          background-color: ${theme.colors.bastille}0F;
          color: ${theme.colors.bastille};
        }
      }

      .tools-accordion-header-info {
        display: flex;
        align-items: center;
        gap: 14px;
        flex: 1;
        min-width: 0;
      }

      .tools-group-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: linear-gradient(
          135deg,
          ${theme.colors.white} 0%,
          ${theme.colors.bastille}06 100%
        );
        border: 1px solid ${theme.colors.alto};
        color: ${theme.colors.bastille};
        font-size: ${theme.fonts.lg};
        font-weight: 700;
        display: flex;
        justify-content: center;
        align-items: center;
        transition: all 0.2s ease;

        img {
          width: 26px;
          height: 26px;
        }
      }

      .tools-accordion-header-texts {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .tools-accordion-header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;

        .MuiButtonBase-root {
          font-size: ${theme.fonts.xs};
          padding: 4px 12px;
          border-radius: 6px;
          text-transform: none;
          display: flex;
          align-items: center;
          gap: 4px;

          & > svg {
            width: 14px;
            height: 14px;
          }

          .button-text {
            font-weight: 600;
          }
        }

        .tools-accordion-chevron-wrap {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${theme.colors.saltBox};
          transition:
            background-color 0.2s ease,
            color 0.2s ease;
        }

        .tools-accordion-chevron {
          width: 20px;
          height: 20px;
          transition: transform 0.25s ease;
        }
      }
    }

    .tools-accordion-body {
      padding: 0 16px 16px;
      border-top: 1px solid ${theme.colors.alto};
      padding-top: 14px;

      .tools-banner {
        margin-bottom: 12px;
      }
    }

    .tools-installed-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .tools-installed-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border: 1px solid ${theme.colors.alto};
      border-radius: 8px;
      background-color: ${theme.colors.white};
      transition: border-color 0.15s ease;
      gap: 12px;

      &:hover {
        border-color: ${theme.colors.bastille}40;
      }

      .tools-installed-item-main {
        flex: 1;
        min-width: 0;
      }

      .tools-installed-item-title {
        font-size: ${theme.fonts.base};
        font-weight: 600;
        color: ${theme.colors.bastille};
        margin: 0;
      }

      .tools-installed-item-description {
        font-size: ${theme.fonts.sm};
        color: ${theme.colors.bastille}99;
        margin: 4px 0 0 0;
        line-height: 1.4;
      }

      .tools-installed-item-meta {
        font-size: ${theme.fonts.xs};
        color: ${theme.colors.saltBox};
        margin: 6px 0 0 0;
      }

      .tools-installed-item-actions {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;

        .MuiIconButton-root {
          padding: 6px;

          & > svg {
            width: 18px;
            height: 18px;
          }
        }
      }
    }

    .tools-catalog-controls {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;

      @media (min-width: ${theme.screens.md}) {
        flex-direction: row;
        align-items: center;
      }
    }

    .tools-search {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border: 1px solid ${theme.colors.alto};
      border-radius: 8px;
      background-color: ${theme.colors.white};
      transition: border-color 0.15s ease;
      flex: 1;
      min-width: 0;

      &:focus-within {
        border-color: ${theme.colors.bastille}60;
      }

      & > svg {
        width: 18px;
        height: 18px;
        color: ${theme.colors.saltBox};
        flex-shrink: 0;
      }

      input {
        flex: 1;
        border: none;
        outline: none;
        background: none;
        font-size: ${theme.fonts.sm};
        color: ${theme.colors.bastille};

        &::placeholder {
          color: ${theme.colors.bastille}60;
        }
      }
    }

    .tools-catalog-groups {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;

      @media (min-width: ${theme.screens.md}) {
        grid-template-columns: repeat(2, 1fr);
      }

      @media (min-width: ${theme.screens.xl}) {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .tools-catalog-group-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border: 1px solid ${theme.colors.alto};
      border-radius: 10px;
      background-color: ${theme.colors.white};
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;

      &:hover {
        border-color: ${theme.colors.bastille}60;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
      }

      .tools-catalog-group-icon {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        background-color: ${theme.colors.bastille}0A;
        color: ${theme.colors.bastille};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${theme.fonts.lg};
        font-weight: 700;
        flex-shrink: 0;

        img {
          width: 26px;
          height: 26px;
          object-fit: contain;
        }
      }

      .tools-catalog-group-body {
        flex: 1;
        min-width: 0;
      }

      .tools-catalog-group-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .tools-catalog-group-title {
        font-size: ${theme.fonts.base};
        font-weight: 600;
        color: ${theme.colors.bastille};
        margin: 0;
      }

      .tools-catalog-group-connected {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        font-size: 10px;
        font-weight: 700;
        color: #2e7d32;
        background-color: #e8f5e9;
        padding: 2px 6px;
        border-radius: 8px;
        text-transform: uppercase;
        letter-spacing: 0.4px;

        & > svg {
          width: 10px;
          height: 10px;
        }
      }

      .tools-catalog-group-description {
        font-size: ${theme.fonts.xs};
        color: ${theme.colors.bastille}99;
        margin: 4px 0 0 0;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .tools-catalog-group-meta {
        font-size: ${theme.fonts.xs};
        color: ${theme.colors.saltBox};
        margin: 8px 0 0 0;
        font-weight: 600;
      }
    }

    .tools-group-detail-back {
      display: flex;
      align-items: center;
      gap: 4px;
      border: none;
      background: none;
      padding: 4px 0;
      cursor: pointer;
      font-size: ${theme.fonts.sm};
      color: ${theme.colors.saltBox};
      margin-bottom: 12px;

      &:hover {
        color: ${theme.colors.bastille};
      }

      & > svg {
        width: 18px;
        height: 18px;
      }
    }

    .tools-group-detail-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px;
      border: 1px solid ${theme.colors.alto};
      border-radius: 10px;
      background-color: ${theme.colors.white};
      margin-bottom: 16px;

      .tools-group-detail-icon {
        width: 52px;
        height: 52px;
        border-radius: 10px;
        background-color: ${theme.colors.bastille}0A;
        color: ${theme.colors.bastille};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${theme.fonts.xl};
        font-weight: 700;
        flex-shrink: 0;

        img {
          width: 32px;
          height: 32px;
          object-fit: contain;
        }
      }

      .tools-group-detail-info {
        flex: 1;
        min-width: 0;
      }

      .tools-group-detail-title {
        font-size: ${theme.fonts.lg};
        font-weight: 700;
        color: ${theme.colors.bastille};
        margin: 0;
      }

      .tools-group-detail-description {
        font-size: ${theme.fonts.sm};
        color: ${theme.colors.bastille}99;
        margin: 4px 0 0 0;
        line-height: 1.4;
      }

      .tools-group-detail-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;

        .MuiButtonBase-root {
          font-size: ${theme.fonts.sm};
          padding: 6px 14px;
          border-radius: 8px;
          text-transform: none;
          display: flex;
          align-items: center;
          gap: 6px;

          & > svg {
            width: 16px;
            height: 16px;
          }

          .button-text {
            font-weight: 600;
          }
        }

        .tools-group-detail-connected-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: ${theme.fonts.xs};
          font-weight: 700;
          color: #2e7d32;
          background-color: #e8f5e9;
          padding: 6px 10px;
          border-radius: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;

          & > svg {
            width: 14px;
            height: 14px;
          }
        }
      }
    }

    .tools-group-detail-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .tools-group-detail-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      border: 1px solid ${theme.colors.alto};
      border-radius: 8px;
      background-color: ${theme.colors.white};
      transition: border-color 0.15s ease;

      &:hover {
        border-color: ${theme.colors.bastille}40;
      }

      &.disabled {
        opacity: 0.6;
      }

      .tools-group-detail-item-main {
        flex: 1;
        min-width: 0;
      }

      .tools-group-detail-item-title {
        font-size: ${theme.fonts.base};
        font-weight: 600;
        color: ${theme.colors.bastille};
        margin: 0;
      }

      .tools-group-detail-item-description {
        font-size: ${theme.fonts.sm};
        color: ${theme.colors.bastille}99;
        margin: 4px 0 0 0;
        line-height: 1.4;
      }

      .tools-group-detail-item-scopes {
        font-size: 10px;
        font-weight: 600;
        color: ${theme.colors.saltBox};
        background-color: ${theme.colors.bastille}08;
        padding: 2px 6px;
        border-radius: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 6px;
        display: inline-block;
        cursor: help;
      }
    }
  `}
`;

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
`;

export const ModalDialog = styled.div`
  ${({ theme }) => css`
    background-color: ${theme.colors.white};
    border-radius: 12px;
    width: 100%;
    max-width: 520px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);

    .tools-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid ${theme.colors.alto};

      .tools-modal-title {
        font-size: ${theme.fonts.lg};
        font-weight: 600;
        color: ${theme.colors.bastille};
        margin: 0;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .tools-modal-body {
      padding: 20px;
      overflow-y: auto;
      flex: 1;

      .tools-configure-help {
        font-size: ${theme.fonts.sm};
        color: ${theme.colors.bastille}99;
        margin: 0 0 12px 0;
        line-height: 1.5;

        code {
          font-family: monospace;
          font-size: ${theme.fonts.xs};
          background-color: ${theme.colors.bastille}0A;
          padding: 1px 6px;
          border-radius: 4px;
        }
      }
    }

    .tools-modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 14px 20px;
      border-top: 1px solid ${theme.colors.alto};

      .MuiButtonBase-root {
        font-size: ${theme.fonts.sm};
        padding: 6px 16px;
        border-radius: 6px;
        text-transform: none;
      }
    }
  `}
`;
