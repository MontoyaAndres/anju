import { css } from '@emotion/react';
import styled from '@emotion/styled';

export const Wrapper = styled.div`
  ${({ theme }) => css`
    padding: 40px 20px;
    max-width: 1200px;
    margin: 0 auto;

    @media (min-width: ${theme.screens.md}) {
      padding: 60px 40px;
    }

    .organization-title {
      font-size: ${theme.fonts['2xl']};
      color: ${theme.colors.bastille};
      font-weight: 700;
      margin: 0 0 8px 0;
    }

    .create-organization-subtitle {
      font-size: ${theme.fonts.base};
      color: ${theme.colors.bastille}CC;
      font-weight: 400;
      margin: 0 0 24px 0;
    }

    .organization-list {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;

      @media (min-width: ${theme.screens.md}) {
        grid-template-columns: repeat(2, 1fr);
      }

      @media (min-width: ${theme.screens.lg}) {
        grid-template-columns: repeat(3, 1fr);
      }

      .organization-card {
        background: ${theme.colors.white};
        border: 1px solid ${theme.colors.alto};
        border-radius: 8px;
        padding: 20px;
        cursor: pointer;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;

        &:hover {
          border-color: ${theme.colors.bastille}40;
          box-shadow: 0 2px 8px ${theme.colors.bastille}20;
        }

        .organization-card-name {
          font-size: ${theme.fonts.lg};
          color: ${theme.colors.bastille};
          font-weight: 600;
          margin: 0 0 12px 0;
        }

        .organization-info {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;

          .organization-info-item {
            font-size: ${theme.fonts.sm};
            color: ${theme.colors.bastille}99;
            font-weight: 400;
          }
        }
      }
    }
  `}
`;

export const CreateOrganizationWrapper = styled.div`
  ${({ theme }) => css`
    display: flex;
    flex-direction: column;
    align-items: center;
    height: calc(100vh - 190px);
    padding: 0 20px;
    margin: 60px 0;

    @media (min-width: ${theme.screens.md}) {
      padding: 0;
    }

    .create-organization-header {
      text-align: center;
      margin-bottom: 24px;

      .create-organization-title {
        font-size: ${theme.fonts['2xl']};
        color: ${theme.colors.bastille};
        font-weight: 700;
        line-height: 120%;
      }

      .create-organization-subtitle {
        font-size: ${theme.fonts.base};
        color: ${theme.colors.bastille}CC;
        font-weight: 400;
        margin-top: 4px;
      }
    }

    .create-organization-form {
      width: 100%;
      max-width: 600px;
      display: flex;
      flex-direction: column;
      gap: 24px;

      .form-section {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .form-section-header {
          margin-bottom: 4px;

          .form-section-title {
            font-size: ${theme.fonts.lg};
            color: ${theme.colors.bastille};
            font-weight: 600;
            margin: 0;
          }

          .form-section-description {
            font-size: ${theme.fonts.sm};
            color: ${theme.colors.bastille}99;
            font-weight: 400;
            margin: 4px 0 0 0;
          }
        }
      }

      .create-organization-button {
        margin-top: 12px;

        button {
          font-size: ${theme.fonts.base};
        }
      }
    }
  `}
`;
