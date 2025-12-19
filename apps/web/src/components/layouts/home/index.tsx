import { JSXElementConstructor, ReactElement, useState } from 'react';
import { useRouter } from 'next/router';
import { UI } from '@anju/ui';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import {
  AccountCircleOutlined,
  HelpOutline,
  SettingsOutlined,
  LogoutOutlined,
  Menu,
  Close,
  HomeFilled,
  ChatOutlined,
  HomeOutlined,
  EmojiObjects,
  EmojiObjectsOutlined,
  Chat,
  Settings,
} from '@mui/icons-material';

import { MobileMenuWrapper, Wrapper } from './styles';

export const Home = (
  page: ReactElement<unknown, string | JSXElementConstructor<any>>
) => {
  const [accountClicked, setAccountClicked] = useState(false);
  const [mobileMenuClicked, setMobileMenuClicked] = useState(false);
  const { pathname, push } = useRouter();

  const handleAccountClicked = () => {
    setAccountClicked(prevValue => !prevValue);
    setMobileMenuClicked(false);
  };

  const handleMobileMenuClicked = () => {
    setMobileMenuClicked(prevValue => !prevValue);
    setAccountClicked(false);
  };

  const handleLogoutClicked = () => {
    setAccountClicked(false);
    setMobileMenuClicked(false);
  };

  return (
    <Wrapper userPhoto={(page.props as any).user?.photo}>
      {mobileMenuClicked && (
        <MobileMenuWrapper userPhoto={(page.props as any).user?.photo}>
          <div className="background" onClick={handleMobileMenuClicked}></div>
          <div className="mobile-menu">
            <div className="mobile-menu-user">
              <div className="mobile-menu-user-pic"></div>
              <div className="mobile-menu-user-texts">
                <p className="mobile-menu-user-title">
                  {(page.props as any).user?.name}
                </p>
                <p className="mobile-menu-user-subtitle">
                  {(page.props as any).user?.email}
                </p>
              </div>
              <IconButton onClick={handleMobileMenuClicked}>
                <Close />
              </IconButton>
            </div>
            <div className="options">
              <div className="options-up">
                <UI.Button
                  fullWidth
                  className={
                    pathname === '/organization/[id]/project/[projectId]'
                      ? 'active'
                      : ''
                  }
                  onClick={() => {}}
                >
                  {pathname === '/organization/[id]/project/[projectId]' ? (
                    <HomeFilled />
                  ) : (
                    <HomeOutlined />
                  )}
                  <span className="button-text">Home</span>
                </UI.Button>
                <UI.Button
                  fullWidth
                  className={
                    pathname ===
                    '/organization/[id]/project/[projectId]/knowledge'
                      ? 'active'
                      : ''
                  }
                  onClick={() => {}}
                >
                  {pathname ===
                  '/organization/[id]/projects/[projectId]/knowledge' ? (
                    <EmojiObjects />
                  ) : (
                    <EmojiObjectsOutlined />
                  )}
                  <span className="button-text">Knowledge</span>
                </UI.Button>
                <UI.Button fullWidth>
                  {pathname ===
                  '/organization/[id]/project/[projectId]/spaces' ? (
                    <Chat />
                  ) : (
                    <ChatOutlined />
                  )}
                  <span className="button-text">Spaces</span>
                </UI.Button>
                <UI.Button fullWidth onClick={() => {}}>
                  {pathname ===
                  '/organization/[id]/project/[projectId]/settings' ? (
                    <Settings />
                  ) : (
                    <SettingsOutlined />
                  )}
                  <span className="button-text">Settings</span>
                </UI.Button>
              </div>
              <div className="options-down">
                <UI.Button fullWidth>
                  <AccountCircleOutlined />
                  <span className="button-text">Account</span>
                </UI.Button>
                <UI.Button fullWidth>
                  <HelpOutline />
                  <span className="button-text">Help</span>
                </UI.Button>
                <UI.Button fullWidth>
                  <SettingsOutlined />
                  <span className="button-text">Settings</span>
                </UI.Button>
                <UI.Button fullWidth onClick={handleLogoutClicked}>
                  <LogoutOutlined />
                  <span className="button-text">Logout</span>
                </UI.Button>
              </div>
            </div>
          </div>
        </MobileMenuWrapper>
      )}
      <div className="container-navbar">
        <div className="sub-navbar">
          <div className="sub-navbar-icon">xxxx</div>
          <div className="sub-navbar-options">
            <UI.Button
              fullWidth
              className={
                pathname === '/organizations/[id]/projects/[projectId]'
                  ? 'active'
                  : ''
              }
              onClick={() => {}}
            >
              {pathname === '/organizations/[id]/projects/[projectId]' ? (
                <HomeFilled />
              ) : (
                <HomeOutlined />
              )}
              <span className="button-text">Home</span>
            </UI.Button>
            <UI.Button
              fullWidth
              className={
                pathname ===
                '/organizations/[id]/projects/[projectId]/knowledge'
                  ? 'active'
                  : ''
              }
              onClick={() => {}}
            >
              {pathname ===
              '/organizations/[id]/projects/[projectId]/knowledge' ? (
                <EmojiObjects />
              ) : (
                <EmojiObjectsOutlined />
              )}
              <span className="button-text">Knowledge</span>
            </UI.Button>
            <UI.Button fullWidth>
              {pathname ===
              '/organizations/[id]/projects/[projectId]/spaces' ? (
                <Chat />
              ) : (
                <ChatOutlined />
              )}
              <span className="button-text">Spaces</span>
            </UI.Button>
            <UI.Button fullWidth onClick={() => {}}>
              {pathname ===
              '/organizations/[id]/projects/[projectId]/settings' ? (
                <Settings />
              ) : (
                <SettingsOutlined />
              )}
              <span className="button-text">Settings</span>
            </UI.Button>
          </div>
          <div className="sub-navbar-user" onClick={handleAccountClicked}></div>
        </div>
        <nav className="navbar">
          <div className="header-logo">
            <Tooltip title="Open menu" placement="right">
              <IconButton onClick={handleMobileMenuClicked}>
                <Menu />
              </IconButton>
            </Tooltip>
            <div className="header-logo-image"></div>
            <p className="header-logo-text">Anju.ai</p>
          </div>
        </nav>
        {accountClicked && (
          <div className="account-menu">
            <div className="account-menu-person">
              <div className="account-menu-person-pic"></div>
              <div className="account-menu-person-texts">
                <p className="account-menu-person-title">
                  {(page.props as any).user?.name}
                </p>
                <p className="account-menu-person-subtitle">
                  {(page.props as any).user?.email}
                </p>
              </div>
            </div>
            <div className="account-menu-item">
              <AccountCircleOutlined />
              <p className="account-menu-item-text">Account</p>
            </div>
            <div className="account-menu-item">
              <HelpOutline />
              <p className="account-menu-item-text">Help</p>
            </div>
            <div className="account-menu-item">
              <SettingsOutlined />
              <p className="account-menu-item-text">Settings</p>
            </div>
            <div className="account-menu-item" onClick={handleLogoutClicked}>
              <LogoutOutlined />
              <p className="account-menu-item-text">Logout</p>
            </div>
          </div>
        )}
        <div className="box-container">{page}</div>
      </div>
    </Wrapper>
  );
};
