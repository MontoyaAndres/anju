import {
  JSXElementConstructor,
  ReactElement,
  useEffect,
  useRef,
  useState
} from 'react';
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
  Settings
} from '@mui/icons-material';

import { MobileMenuWrapper, Wrapper } from './styles';
import { authClient } from '../../../utils';

interface UserProps {
  name?: string;
  email?: string;
  photo?: string;
}

export const Home = (
  page: ReactElement<unknown, string | JSXElementConstructor<any>>
) => {
  const user = (page.props as { user?: UserProps }).user;
  const [accountClicked, setAccountClicked] = useState(false);
  const [mobileMenuClicked, setMobileMenuClicked] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const { pathname } = useRouter();

  useEffect(() => {
    if (!accountClicked) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target as Node)
      ) {
        setAccountClicked(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [accountClicked]);

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
    authClient.signOut();
  };

  return (
    <Wrapper userPhoto={user?.photo}>
      {mobileMenuClicked && (
        <MobileMenuWrapper userPhoto={user?.photo}>
          <div
            className="background"
            role="button"
            tabIndex={0}
            aria-label="Close menu"
            onClick={handleMobileMenuClicked}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleMobileMenuClicked();
              }
            }}
          ></div>
          <div className="mobile-menu">
            <div className="mobile-menu-user">
              <div className="mobile-menu-user-pic"></div>
              <div className="mobile-menu-user-texts">
                <p className="mobile-menu-user-title">{user?.name}</p>
                <p className="mobile-menu-user-subtitle">{user?.email}</p>
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
                  '/organization/[id]/project/[projectId]/prompts' ? (
                    <EmojiObjects />
                  ) : (
                    <EmojiObjectsOutlined />
                  )}
                  <span className="button-text">Prompts</span>
                </UI.Button>
                <UI.Button fullWidth>
                  {pathname ===
                  '/organization/[id]/project/[projectId]/resources' ? (
                    <Chat />
                  ) : (
                    <ChatOutlined />
                  )}
                  <span className="button-text">Resources</span>
                </UI.Button>
                <UI.Button fullWidth onClick={() => {}}>
                  {pathname ===
                  '/organization/[id]/project/[projectId]/tools' ? (
                    <Settings />
                  ) : (
                    <SettingsOutlined />
                  )}
                  <span className="button-text">Tools</span>
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
                pathname === '/organization/[id]/project/[projectId]/prompts'
                  ? 'active'
                  : ''
              }
              onClick={() => {}}
            >
              {pathname === '/organization/[id]/project/[projectId]/prompts' ? (
                <EmojiObjects />
              ) : (
                <EmojiObjectsOutlined />
              )}
              <span className="button-text">Prompts</span>
            </UI.Button>
            <UI.Button fullWidth>
              {pathname ===
              '/organization/[id]/project/[projectId]/resources' ? (
                <Chat />
              ) : (
                <ChatOutlined />
              )}
              <span className="button-text">Resources</span>
            </UI.Button>
            <UI.Button fullWidth onClick={() => {}}>
              {pathname === '/organization/[id]/project/[projectId]/tools' ? (
                <Settings />
              ) : (
                <SettingsOutlined />
              )}
              <span className="button-text">Tools</span>
            </UI.Button>
          </div>
          <div
            className="sub-navbar-user"
            role="button"
            tabIndex={0}
            aria-label="Account menu"
            onClick={handleAccountClicked}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleAccountClicked();
              }
            }}
          ></div>
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
          <div className="account-menu" ref={accountMenuRef} role="menu">
            <div className="account-menu-person">
              <div className="account-menu-person-pic"></div>
              <div className="account-menu-person-texts">
                <p className="account-menu-person-title">{user?.name}</p>
                <p className="account-menu-person-subtitle">{user?.email}</p>
              </div>
            </div>
            <div className="account-menu-item" role="menuitem" tabIndex={0}>
              <AccountCircleOutlined />
              <p className="account-menu-item-text">Account</p>
            </div>
            <div className="account-menu-item" role="menuitem" tabIndex={0}>
              <HelpOutline />
              <p className="account-menu-item-text">Help</p>
            </div>
            <div className="account-menu-item" role="menuitem" tabIndex={0}>
              <SettingsOutlined />
              <p className="account-menu-item-text">Settings</p>
            </div>
            <div
              className="account-menu-item"
              role="menuitem"
              tabIndex={0}
              onClick={handleLogoutClicked}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleLogoutClicked();
                }
              }}
            >
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
