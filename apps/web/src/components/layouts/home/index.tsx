import {
  JSXElementConstructor,
  ReactElement,
  useEffect,
  useRef,
  useState
} from 'react';
import { useRouter } from 'next/router';
import { UI } from '@anju/ui';
import { utils } from '@anju/utils';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import {
  AccountCircleOutlined,
  MenuBookOutlined,
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
  CameraAltOutlined,
  Google,
  GitHub,
  Link as LinkIcon,
  LinkOff
} from '@mui/icons-material';

import {
  MobileMenuWrapper,
  ModalDialog,
  ModalOverlay,
  Wrapper
} from './styles';
import { authClient } from '../../../utils';

const DOCS_URL = 'https://docs.anju.ai';

type SocialProvider = 'google' | 'github';

const SOCIAL_PROVIDERS: {
  id: SocialProvider;
  label: string;
  Icon: typeof Google;
}[] = [
  { id: 'google', label: 'Google', Icon: Google },
  { id: 'github', label: 'GitHub', Icon: GitHub }
];

interface AuthProps {
  name?: string;
  email?: string;
  image?: string;
}

type HomePage = ReactElement<unknown, string | JSXElementConstructor<any>>;

const HomeLayout = ({ page }: { page: HomePage }) => {
  const auth = (page.props as { auth?: AuthProps }).auth;
  const snackbar = UI.Alert.useSnackbar();
  const [accountClicked, setAccountClicked] = useState(false);
  const [mobileMenuClicked, setMobileMenuClicked] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [linkedProviders, setLinkedProviders] = useState<Set<SocialProvider>>(
    new Set()
  );
  const [linkBusy, setLinkBusy] = useState<SocialProvider | null>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { pathname, query } = router;

  const projectBase = `/organization/${query.id}/project/${query.projectId}`;

  useEffect(() => {
    if (!accountClicked) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (accountTriggerRef.current?.contains(target)) return;
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
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

  const handleLogoutClicked = async () => {
    setAccountClicked(false);
    setMobileMenuClicked(false);
    await authClient.signOut().then(() => {
      window.location.reload();
    });
  };

  const loadLinkedAccounts = async () => {
    try {
      const { data } = await authClient.listAccounts();
      if (!data) return;
      const next = new Set<SocialProvider>();
      for (const account of data) {
        if (
          account.providerId === 'google' ||
          account.providerId === 'github'
        ) {
          next.add(account.providerId);
        }
      }
      setLinkedProviders(next);
    } catch {
      // ignore; modal still usable without the linked list
    }
  };

  const handleProfileOpen = () => {
    setProfileName(auth?.name || '');
    setProfileImage(auth?.image || '');
    setAccountClicked(false);
    setMobileMenuClicked(false);
    setProfileOpen(true);
    loadLinkedAccounts();
  };

  const handleProfileClose = () => {
    if (profileSaving || avatarBusy || linkBusy) return;
    setProfileOpen(false);
  };

  const handleAvatarPick = () => {
    if (avatarBusy || profileSaving) return;
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setAvatarBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await utils.fetcher({
        url: '/user/avatar',
        config: {
          method: 'POST',
          credentials: 'include',
          body: formData
        }
      });
      if (data?.error) {
        snackbar.error(data.error);
        return;
      }
      if (data?.image) {
        setProfileImage(data.image);
        snackbar.success('Avatar updated');
      }
    } catch {
      snackbar.error('Failed to upload avatar');
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleLinkProvider = async (provider: SocialProvider) => {
    if (linkBusy) return;
    setLinkBusy(provider);
    try {
      const callbackURL = window.location.href;
      const { data, error } = await authClient.linkSocial({
        provider,
        callbackURL
      });
      if (error) {
        snackbar.error(error.message || `Failed to link ${provider}`);
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      await loadLinkedAccounts();
    } catch {
      snackbar.error(`Failed to link ${provider}`);
    } finally {
      setLinkBusy(null);
    }
  };

  const handleUnlinkProvider = async (provider: SocialProvider) => {
    if (linkBusy) return;
    if (linkedProviders.size <= 1) {
      snackbar.error('You must keep at least one linked account');
      return;
    }
    setLinkBusy(provider);
    try {
      const { error } = await authClient.unlinkAccount({
        providerId: provider
      });
      if (error) {
        snackbar.error(error.message || `Failed to unlink ${provider}`);
        return;
      }
      snackbar.success(`Unlinked ${provider}`);
      await loadLinkedAccounts();
    } catch {
      snackbar.error(`Failed to unlink ${provider}`);
    } finally {
      setLinkBusy(null);
    }
  };

  const handleProfileSave = async () => {
    if (profileSaving) return;
    const trimmedName = profileName.trim();
    if (!trimmedName) {
      snackbar.error('Name is required');
      return;
    }
    setProfileSaving(true);
    try {
      const { error } = await authClient.updateUser({
        name: trimmedName,
        image: profileImage.trim() || undefined
      });
      if (error) {
        snackbar.error(error.message || 'Failed to update profile');
        return;
      }
      snackbar.success('Profile updated');
      setProfileOpen(false);
      router.replace(router.asPath);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDocumentationClicked = () => {
    setAccountClicked(false);
    setMobileMenuClicked(false);
    window.open(DOCS_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <Wrapper userPhoto={auth?.image}>
      {mobileMenuClicked && (
        <MobileMenuWrapper userPhoto={auth?.image}>
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
                <p className="mobile-menu-user-title">{auth?.name}</p>
                <p className="mobile-menu-user-subtitle">{auth?.email}</p>
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
                    '/organization/[id]/project/[projectId]/prompts'
                      ? 'active'
                      : ''
                  }
                  onClick={() => router.push(`${projectBase}/prompts`)}
                >
                  {pathname ===
                  '/organization/[id]/project/[projectId]/prompts' ? (
                    <EmojiObjects />
                  ) : (
                    <EmojiObjectsOutlined />
                  )}
                  <span className="button-text">Prompts</span>
                </UI.Button>
                <UI.Button
                  fullWidth
                  className={
                    pathname ===
                    '/organization/[id]/project/[projectId]/resources'
                      ? 'active'
                      : ''
                  }
                  onClick={() => router.push(`${projectBase}/resources`)}
                >
                  {pathname ===
                  '/organization/[id]/project/[projectId]/resources' ? (
                    <Chat />
                  ) : (
                    <ChatOutlined />
                  )}
                  <span className="button-text">Resources</span>
                </UI.Button>
                <UI.Button
                  fullWidth
                  className={
                    pathname === '/organization/[id]/project/[projectId]/tools'
                      ? 'active'
                      : ''
                  }
                  onClick={() => router.push(`${projectBase}/tools`)}
                >
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
                <UI.Button fullWidth onClick={handleProfileOpen}>
                  <AccountCircleOutlined />
                  <span className="button-text">Account</span>
                </UI.Button>
                <UI.Button fullWidth>
                  <SettingsOutlined />
                  <span className="button-text">Settings</span>
                </UI.Button>
                <UI.Button fullWidth onClick={handleDocumentationClicked}>
                  <MenuBookOutlined />
                  <span className="button-text">Documentation</span>
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
              onClick={() => router.push(`${projectBase}/prompts`)}
            >
              {pathname === '/organization/[id]/project/[projectId]/prompts' ? (
                <EmojiObjects />
              ) : (
                <EmojiObjectsOutlined />
              )}
              <span className="button-text">Prompts</span>
            </UI.Button>
            <UI.Button
              fullWidth
              className={
                pathname === '/organization/[id]/project/[projectId]/resources'
                  ? 'active'
                  : ''
              }
              onClick={() => router.push(`${projectBase}/resources`)}
            >
              {pathname ===
              '/organization/[id]/project/[projectId]/resources' ? (
                <Chat />
              ) : (
                <ChatOutlined />
              )}
              <span className="button-text">Resources</span>
            </UI.Button>
            <UI.Button
              fullWidth
              className={
                pathname === '/organization/[id]/project/[projectId]/tools'
                  ? 'active'
                  : ''
              }
              onClick={() => router.push(`${projectBase}/tools`)}
            >
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
            ref={accountTriggerRef}
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
                <p className="account-menu-person-title">{auth?.name}</p>
                <p className="account-menu-person-subtitle">{auth?.email}</p>
              </div>
            </div>
            <div
              className="account-menu-item"
              role="menuitem"
              tabIndex={0}
              onClick={handleProfileOpen}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleProfileOpen();
                }
              }}
            >
              <AccountCircleOutlined />
              <p className="account-menu-item-text">Account</p>
            </div>
            <div className="account-menu-item" role="menuitem" tabIndex={0}>
              <SettingsOutlined />
              <p className="account-menu-item-text">Settings</p>
            </div>
            <div
              className="account-menu-item"
              role="menuitem"
              tabIndex={0}
              onClick={handleDocumentationClicked}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleDocumentationClicked();
                }
              }}
            >
              <MenuBookOutlined />
              <p className="account-menu-item-text">Documentation</p>
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
      {profileOpen && (
        <UI.Portal>
          <ModalOverlay onClick={handleProfileClose}>
            <ModalDialog role="dialog" onClick={e => e.stopPropagation()}>
              <div className="profile-modal-header">
                <h2 className="profile-modal-title">Account</h2>
                <IconButton size="small" onClick={handleProfileClose}>
                  <Close />
                </IconButton>
              </div>
              <div className="profile-modal-body">
                <div className="profile-avatar-section">
                  <div
                    className="profile-avatar-preview"
                    style={
                      profileImage
                        ? { backgroundImage: `url('${profileImage}')` }
                        : undefined
                    }
                  />
                  <div className="profile-avatar-actions">
                    <UI.Button
                      size="medium"
                      disabled={avatarBusy || profileSaving}
                      onClick={handleAvatarPick}
                    >
                      <CameraAltOutlined />
                      <span className="button-text">
                        {avatarBusy ? 'Uploading...' : 'Upload image'}
                      </span>
                    </UI.Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    hidden
                    onChange={handleAvatarFileChange}
                  />
                </div>
                <UI.Input
                  label="Name"
                  name="name"
                  placeholder="Your name"
                  value={profileName}
                  disabled={profileSaving}
                  onChange={e => setProfileName(e.target.value)}
                />
                <div className="profile-linked-accounts">
                  <p className="profile-section-title">Linked accounts</p>
                  {SOCIAL_PROVIDERS.map(({ id, label, Icon }) => {
                    const linked = linkedProviders.has(id);
                    const busy = linkBusy === id;
                    const isLastLinked = linked && linkedProviders.size <= 1;
                    const buttonDisabled =
                      busy || !!linkBusy || (linked && isLastLinked);
                    const button = (
                      <UI.Button
                        size="medium"
                        disabled={buttonDisabled}
                        onClick={() =>
                          linked
                            ? handleUnlinkProvider(id)
                            : handleLinkProvider(id)
                        }
                      >
                        {linked ? <LinkOff /> : <LinkIcon />}
                        <span className="button-text">
                          {busy ? 'Working...' : linked ? 'Unlink' : 'Link'}
                        </span>
                      </UI.Button>
                    );
                    return (
                      <div key={id} className="profile-linked-row">
                        <div className="profile-linked-info">
                          <Icon />
                          <span className="profile-linked-label">{label}</span>
                          {linked && (
                            <span className="profile-linked-badge">Linked</span>
                          )}
                        </div>
                        {isLastLinked ? (
                          <Tooltip title="You must keep at least one linked account">
                            <span>{button}</span>
                          </Tooltip>
                        ) : (
                          button
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="profile-modal-actions">
                <UI.Button
                  size="small"
                  disabled={profileSaving}
                  onClick={handleProfileClose}
                >
                  Cancel
                </UI.Button>
                <UI.Button
                  variant="contained"
                  size="small"
                  disabled={profileSaving}
                  onClick={handleProfileSave}
                >
                  {profileSaving ? 'Saving...' : 'Save'}
                </UI.Button>
              </div>
            </ModalDialog>
          </ModalOverlay>
        </UI.Portal>
      )}
    </Wrapper>
  );
};

export const Home = (page: HomePage) => <HomeLayout page={page} />;
