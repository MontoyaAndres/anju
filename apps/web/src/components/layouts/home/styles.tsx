import { css } from '@emotion/react';
import styled from '@emotion/styled';

interface IProps {
  userPhoto?: string;
}

interface IMobileMenuWrapperProps {
  userPhoto?: string;
}

export const Wrapper = styled.nav<IProps>`
  ${({ theme, userPhoto }) => css`
    .container-navbar {
      .navbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 12px;
        width: 100%;
        position: fixed;
        top: 0;
        right: 0;
        z-index: 10;
        background-color: ${theme.colors.white};

        @media (min-width: ${theme.screens.xl}) {
          padding: 24px 20px;
          width: calc(100% - 93px);
        }
      }

      .sub-navbar {
        display: none;

        @media (min-width: ${theme.screens.xl}) {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 10;
          width: 93px;
          height: 100vh;
          padding: 20px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          background-color: ${theme.colors.white};
          border-right: 1px solid ${theme.colors.bastille}1A;
        }

        .sub-navbar-icon {
          width: 60px;
          height: 60px;
          display: flex;
          justify-content: center;
          align-items: center;

          & > svg {
            width: 45px;
            height: 45px;
          }
        }

        .sub-navbar-options {
          display: flex;
          flex-direction: column;
          align-items: center;
          grid-gap: 14px;
          margin-top: 16px;

          .MuiButtonBase-root {
            padding: 8px 14px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-transform: none;
            margin: 0;
            border-radius: 16px;
            width: 69px;

            .button-text {
              color: ${theme.colors.bastille};
              font-size: ${theme.fonts.base};
              font-style: normal;
              font-weight: 400;
              line-height: 110%;
              margin-top: 8px;
            }

            & > svg {
              fill: ${theme.colors.saltBox};

              & > path {
                fill: ${theme.colors.saltBox};
              }
            }

            &.active {
              background-color: ${theme.colors.bastille}0A;

              .button-text {
                font-weight: 700;
              }

              & > svg {
                fill: ${theme.colors.bastille};

                & > path {
                  fill: ${theme.colors.bastille};
                }
              }
            }
          }
        }

        .sub-navbar-user {
          width: 44px;
          height: 44px;
          border-radius: 9999px;
          background-image: url(${userPhoto});
          background-size: cover;
          background-position: center;
          background-color: ${theme.colors.bastille};
          margin-top: auto;
          cursor: pointer;
        }
      }

      .header-logo {
        display: flex;
        align-items: center;
        grid-gap: 4px;
        cursor: pointer;

        @media (min-width: ${theme.screens.xl}) {
          display: none;
        }

        .header-logo-image {
          width: 34px;
          height: 34px;
          background-image: url('/lucira.svg');
          background-size: cover;
          background-position: center;
        }

        .header-logo-text {
          color: ${theme.colors.bastille};
          text-align: center;
          font-size: ${theme.fonts.xl};
          font-weight: 700;
        }
      }

      .account-menu {
        position: fixed;
        bottom: 24px;
        left: 90px;
        z-index: 20;
        width: 328px;
        background-color: ${theme.colors.white};
        border-radius: 8px;
        box-shadow: ${theme['custom-shadows'].smallest};

        .account-menu-person {
          padding: 16px;
          display: flex;
          align-items: center;
          grid-gap: 16px;

          .account-menu-person-pic {
            width: 40px;
            height: 40px;
            border-radius: 9999px;
            border: 1px solid ${theme.colors.white};
            background-image: url(${userPhoto});
            background-size: cover;
            background-position: center;
            background-color: ${theme.colors.bastille};
          }

          .account-menu-person-texts {
            .account-menu-person-title {
              color: ${theme.colors.bastille};
              font-size: ${theme.fonts.base};
              font-style: normal;
              font-weight: 700;
              line-height: 100%;
            }

            .account-menu-person-subtitle {
              color: ${theme.colors.bastille}A3;
              font-size: ${theme.fonts.sm};
              font-style: normal;
              font-weight: 400;
              line-height: 100%;
              margin-top: 4px;
            }
          }
        }

        .account-menu-item {
          padding: 14px 16px;
          display: flex;
          align-items: center;
          cursor: pointer;

          & > svg {
            width: 24px;
            height: 24px;
          }

          .account-menu-item-text {
            color: ${theme.colors.bastille}A3;
            font-size: ${theme.fonts.base};
            font-style: normal;
            font-weight: 700;
            line-height: 100%;
            margin-left: 12px;
          }

          &:hover,
          &.is-selected {
            background-color: ${theme.colors.bastille}0A;

            .account-menu-item-text {
              color: ${theme.colors.bastille};
            }
          }
        }
      }
    }

    .projects-menu {
      position: fixed;
      top: 116px;
      left: 16px;
      z-index: 30;
      width: 328px;
      height: 100%;
      max-height: 292px;
      overflow-y: auto;
      background-color: ${theme.colors.white};
      border-radius: 8px;
      box-shadow: ${theme['custom-shadows'].smallest};

      @media (min-width: ${theme.screens.xl}) {
        top: 74px;
        left: 116px;
      }

      .projects-item-new {
        padding: 12px 8px;
        padding-left: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;

        .projects-item-new-text {
          color: ${theme.colors.bastille};
          font-size: ${theme.fonts.base};
          font-style: normal;
          font-weight: 700;
          line-height: 100%;
        }
      }

      .projects-item {
        padding: 14px 16px;
        display: grid;
        align-items: center;
        grid-template-columns: auto auto 1fr;
        cursor: pointer;

        &:hover,
        &.is-selected {
          background-color: ${theme.colors.bastille}0A;

          .projects-item-text {
            color: ${theme.colors.bastille};
          }

          .projects-item-icons {
            .projects-item-icon-settings {
              display: block;
            }
          }
        }

        &.is-selected {
          background-color: ${theme.colors.bastille}0A;

          .projects-item-icons {
            .projects-item-icon-check {
              display: block;
            }
          }
        }

        .projects-item-text {
          color: ${theme.colors.bastille}A3;
          font-size: ${theme.fonts.base};
          font-style: normal;
          font-weight: 500;
          line-height: 100%;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .projects-item-measure {
          padding: 4px 10px;
          border-radius: 100px;
          border: 1px solid ${theme.colors.alto};
          color: ${theme.colors.saltBox};
          font-size: ${theme.fonts.sm};
          font-style: normal;
          font-weight: 400;
          line-height: 100%;
          letter-spacing: -0.26px;
          width: fit-content;
          justify-self: end;
        }

        .projects-item-icons {
          height: 24px;
          display: flex;
          justify-self: end;

          .projects-item-icon-check {
            margin-right: 8px;
          }

          .projects-item-icon-check {
            width: 24px;
            height: 24px;
            fill: ${theme.colors.bastille};
            display: none;
          }
        }
      }
    }
  `}
`;

export const MobileMenuWrapper = styled.div<IMobileMenuWrapperProps>`
  ${({ theme, userPhoto }) => css`
    @media (min-width: ${theme.screens.xl}) {
      display: none;
    }

    .background {
      background-color: ${theme.colors.bastille}99;
      width: 100vw;
      height: 100vh;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 20;
    }

    .mobile-menu {
      background-color: ${theme.colors.white};
      width: calc(100% - 40px);
      height: 100vh;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 30;
      box-shadow: ${theme['custom-shadows'].small};

      .mobile-menu-user {
        padding: 14px 16px;
        display: grid;
        align-items: center;
        grid-template-columns: 40px 1fr 40px;
        grid-gap: 8px;

        .mobile-menu-user-pic {
          width: 40px;
          height: 40px;
          border-radius: 9999px;
          background-image: url(${userPhoto});
          background-size: cover;
          background-position: center;
          background-color: ${theme.colors.bastille};
        }

        .mobile-menu-user-texts {
          .mobile-menu-user-title {
            color: ${theme.colors.bastille};
            font-size: ${theme.fonts.base};
            font-style: normal;
            font-weight: 700;
            line-height: 100%;
            width: 90%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .mobile-menu-user-subtitle {
            color: ${theme.colors.bastille}A3;
            font-size: ${theme.fonts.sm};
            font-style: normal;
            font-weight: 400;
            line-height: 100%;
            margin-top: 4px;
            width: 90%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      }

      .options {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: calc(100vh - 202px);
        overflow-y: auto;

        .MuiButtonBase-root {
          padding: 14px 16px;
          justify-content: flex-start;
          align-items: center;
          text-transform: none;
          margin: 0;
          border-radius: 0;

          .button-text {
            color: ${theme.colors.bastille};
            font-size: ${theme.fonts.base};
            font-style: normal;
            font-weight: 400;
            line-height: 110%;
            margin-top: 4px;
            margin-left: 12px;
          }

          & > svg {
            fill: ${theme.colors.saltBox};

            & > path {
              fill: ${theme.colors.saltBox};
            }
          }

          &.active {
            background-color: ${theme.colors.bastille}0A;

            .button-text {
              font-weight: 700;
            }

            & > svg {
              fill: ${theme.colors.bastille};

              & > path {
                fill: ${theme.colors.bastille};
              }
            }
          }
        }
      }
    }
  `}
`;
