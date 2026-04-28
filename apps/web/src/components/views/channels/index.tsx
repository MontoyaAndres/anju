import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { UI } from '@anju/ui';
import { utils } from '@anju/utils';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import {
  Add,
  Close,
  DeleteOutline,
  ArrowBack,
  ContentCopy,
  ForumOutlined,
  Telegram,
  WhatsApp,
  BuildOutlined,
  AttachFileOutlined,
  AutoAwesomeOutlined,
  ImageOutlined,
  InsertDriveFileOutlined,
  AudiotrackOutlined,
  VideocamOutlined,
  OpenInNew
} from '@mui/icons-material';

import { Wrapper, UsageModalOverlay } from './styles';

const SlackIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
  </svg>
);

const DiscordIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
  </svg>
);

interface BotInfo {
  id: number;
  isBot: boolean;
  firstName: string;
  username?: string;
}

interface Channel {
  id: string;
  platform: string;
  status: string;
  config: Record<string, unknown> | null;
  metadata: { telegram?: { bot?: BotInfo } } | null;
  conversationCount: number;
  messageCount: number;
  artifactId: string;
  hasCredentials: boolean;
  webhookUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface Conversation {
  id: string;
  externalConversationId: string;
  title: string | null;
  scope: string;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
}

interface UsageResource {
  id: string;
  title: string;
  uri: string;
  mimeType: string;
  fileKey: string | null;
  fileName: string | null;
}

interface UsageTool {
  id: string;
  toolDefinition: { id: string; key: string; title: string } | null;
}

interface UsagePrompt {
  id: string;
  title: string;
}

interface MessageUsage {
  id: string;
  kind: 'prompt' | 'tool' | 'resource';
  latencyMs: number | null;
  errorMessage: string | null;
  input: Record<string, unknown> | null;
  output: unknown;
  artifactTool: UsageTool | null;
  artifactResource: UsageResource | null;
  artifactPrompt: UsagePrompt | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  latencyMs: number | null;
  createdAt: string;
  participant: { displayName: string | null; externalUserId: string } | null;
  usages: MessageUsage[];
}

type Tab = 'overview' | 'conversations';

const PLATFORMS = [
  {
    id: utils.constants.CHANNEL_PLATFORM_TELEGRAM,
    label: 'Telegram',
    Icon: Telegram,
    enabled: true
  },
  {
    id: utils.constants.CHANNEL_PLATFORM_SLACK,
    label: 'Slack',
    Icon: SlackIcon,
    enabled: false
  },
  {
    id: utils.constants.CHANNEL_PLATFORM_WHATSAPP,
    label: 'WhatsApp',
    Icon: WhatsApp,
    enabled: false
  },
  {
    id: utils.constants.CHANNEL_PLATFORM_DISCORD,
    label: 'Discord',
    Icon: DiscordIcon,
    enabled: false
  }
];

const platformIcon = (platform: string) => {
  if (platform === utils.constants.CHANNEL_PLATFORM_TELEGRAM)
    return <Telegram />;

  if (platform === utils.constants.CHANNEL_PLATFORM_WHATSAPP)
    return <WhatsApp />;

  return <ForumOutlined />;
};

const channelLabel = (channel: Channel): string => {
  if (channel.platform === utils.constants.CHANNEL_PLATFORM_TELEGRAM) {
    const bot = channel.metadata?.telegram?.bot;
    if (bot?.username) return `@${bot.username}`;
    if (bot?.firstName) return bot.firstName;
  }
  return channel.platform;
};

const usageIcon = (kind: MessageUsage['kind']) => {
  if (kind === utils.constants.CHANNEL_USAGE_KIND_TOOL)
    return <BuildOutlined />;
  if (kind === utils.constants.CHANNEL_USAGE_KIND_RESOURCE)
    return <AttachFileOutlined />;
  return <AutoAwesomeOutlined />;
};

const usageLabel = (u: MessageUsage): string => {
  if (u.kind === utils.constants.CHANNEL_USAGE_KIND_TOOL) {
    return (
      u.artifactTool?.toolDefinition?.title ||
      u.artifactTool?.toolDefinition?.key ||
      (typeof u.input?.name === 'string' ? (u.input.name as string) : 'Tool')
    );
  }
  if (u.kind === utils.constants.CHANNEL_USAGE_KIND_RESOURCE) {
    return (
      u.artifactResource?.title ||
      u.artifactResource?.uri ||
      u.artifactTool?.toolDefinition?.title ||
      u.artifactTool?.toolDefinition?.key ||
      (typeof u.input?.uri === 'string'
        ? (u.input.uri as string)
        : typeof u.input?.name === 'string'
          ? (u.input.name as string)
          : 'Resource')
    );
  }
  return u.artifactPrompt?.title || 'Prompt';
};

const extractUsageText = (output: unknown): string => {
  if (output == null) return '';
  if (typeof output === 'string') return output;
  const o = output as {
    content?: Array<{ type?: string; text?: string }>;
    messages?: Array<{ content?: unknown }>;
  };
  if (Array.isArray(o.content)) {
    const texts = o.content
      .filter(c => c?.type === 'text' && typeof c.text === 'string')
      .map(c => c.text as string);
    if (texts.length) return texts.join('\n');
  }
  if (Array.isArray(o.messages)) {
    const texts = o.messages
      .map(m => {
        const c = m?.content;
        if (typeof c === 'string') return c;
        if (
          c &&
          typeof c === 'object' &&
          (c as { type?: string }).type === 'text' &&
          typeof (c as { text?: string }).text === 'string'
        ) {
          return (c as { text: string }).text;
        }
        return '';
      })
      .filter(Boolean);
    if (texts.length) return texts.join('\n');
  }
  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return '';
  }
};

const resourceAttachmentIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <ImageOutlined />;
  if (mimeType.startsWith('video/')) return <VideocamOutlined />;
  if (mimeType.startsWith('audio/')) return <AudiotrackOutlined />;
  return <InsertDriveFileOutlined />;
};

const collectResourceAttachments = (
  usages: MessageUsage[]
): UsageResource[] => {
  const seen = new Set<string>();
  const out: UsageResource[] = [];
  for (const u of usages) {
    if (
      u.kind === utils.constants.CHANNEL_USAGE_KIND_RESOURCE &&
      u.artifactResource &&
      !seen.has(u.artifactResource.id)
    ) {
      seen.add(u.artifactResource.id);
      out.push(u.artifactResource);
    }
  }
  return out;
};

export const Channels = () => {
  const router = useRouter();
  const snackbar = UI.Alert.useSnackbar();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsStatus, setConversationsStatus] = useState<
    'idle' | 'pending' | 'resolved' | 'rejected'
  >('idle');
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesStatus, setMessagesStatus] = useState<
    'idle' | 'pending' | 'resolved' | 'rejected'
  >('idle');

  const [createValues, setCreateValues] = useState({
    platform: utils.constants.CHANNEL_PLATFORM_TELEGRAM as string,
    botToken: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState(false);
  const [viewingUsage, setViewingUsage] = useState<{
    usage: MessageUsage;
    message: Message;
    userMessage: Message | null;
  } | null>(null);

  const [status, setStatus] = useState<
    'idle' | 'pending' | 'resolved' | 'rejected'
  >('idle');

  const [panelWidth, setPanelWidth] = useState(480);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const { id: organizationId, projectId } = router.query as {
    id: string;
    projectId: string;
  };
  const apiBase = `/organization/${organizationId}/project/${projectId}/channel`;

  const fetchChannels = async (signal?: AbortSignal) => {
    if (!organizationId || !projectId) return;
    setStatus('pending');
    try {
      const data = await utils.fetcher({
        url: apiBase,
        config: { credentials: 'include', signal }
      });
      if (signal?.aborted) return;
      if (data && !data.error) setChannels(data);
      setStatus('resolved');
    } catch {
      if (!signal?.aborted) setStatus('rejected');
    }
  };

  useEffect(() => {
    if (!organizationId || !projectId) return;
    const controller = new AbortController();
    fetchChannels(controller.signal);
    return () => controller.abort();
  }, [organizationId, projectId]);

  const fetchConversations = async (channelId: string) => {
    setConversations([]);
    setConversationsStatus('pending');
    try {
      const data = await utils.fetcher({
        url: `${apiBase}/${channelId}/conversation`,
        config: { credentials: 'include' }
      });
      if (data && !data.error) setConversations(data);
      setConversationsStatus('resolved');
    } catch {
      setConversationsStatus('rejected');
    }
  };

  const fetchMessages = async (channelId: string, conversationId: string) => {
    setMessages([]);
    setMessagesStatus('pending');
    try {
      const data = await utils.fetcher({
        url: `${apiBase}/${channelId}/conversation/${conversationId}/message`,
        config: { credentials: 'include' }
      });
      if (data && !data.error) setMessages(data);
      setMessagesStatus('resolved');
    } catch {
      setMessagesStatus('rejected');
    }
  };

  const handleSelect = (channel: Channel) => {
    setSelectedChannel(channel);
    setIsCreating(false);
    setActiveTab('overview');
    setActiveConversation(null);
    setConversations([]);
    setMessages([]);
  };

  const handleClose = () => {
    setSelectedChannel(null);
    setIsCreating(false);
    setActiveConversation(null);
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'conversations' && selectedChannel) {
      setActiveConversation(null);
      fetchConversations(selectedChannel.id);
    }
  };

  const handleOpenConversation = (conversation: Conversation) => {
    if (!selectedChannel) return;
    setActiveConversation(conversation);
    fetchMessages(selectedChannel.id, conversation.id);
  };

  const handleCreate = () => {
    setSelectedChannel(null);
    setIsCreating(true);
    setCreateValues({
      platform: utils.constants.CHANNEL_PLATFORM_TELEGRAM,
      botToken: ''
    });
    setErrors({});
  };

  const handleCreateSubmit = async () => {
    if (submitting) return;
    setErrors({});

    if (!createValues.botToken.trim()) {
      setErrors({ botToken: 'Bot token is required' });
      return;
    }

    const body = {
      platform: createValues.platform,
      credentials: { botToken: createValues.botToken.trim() }
    };

    setSubmitting(true);
    try {
      const data = await utils.fetcher({
        url: apiBase,
        config: {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify(body)
        }
      });

      if (data && !data.error) {
        setIsCreating(false);
        await fetchChannels();
        setSelectedChannel({ ...data, hasCredentials: true });
        setActiveTab('overview');
        snackbar.success('Channel connected');
      } else {
        snackbar.error(data?.error || 'Failed to create channel');
      }
    } catch {
      snackbar.error('Failed to create channel');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!selectedChannel || statusUpdating) return;
    const next =
      selectedChannel.status === utils.constants.STATUS_ACTIVE
        ? utils.constants.STATUS_DISABLED
        : utils.constants.STATUS_ACTIVE;
    setStatusUpdating(true);
    try {
      const data = await utils.fetcher({
        url: `${apiBase}/${selectedChannel.id}`,
        config: {
          method: 'PUT',
          credentials: 'include',
          body: JSON.stringify({ status: next })
        }
      });
      if (data && !data.error) {
        setSelectedChannel(prev =>
          prev ? { ...prev, ...data, hasCredentials: true } : prev
        );
        setChannels(prev =>
          prev.map(c =>
            c.id === selectedChannel.id ? { ...c, status: next } : c
          )
        );
        snackbar.success(
          next === utils.constants.STATUS_ACTIVE
            ? 'Channel enabled'
            : 'Channel disabled'
        );
      } else {
        snackbar.error(data?.error || 'Failed to update channel');
      }
    } catch {
      snackbar.error('Failed to update channel');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedChannel || submitting) return;
    setSubmitting(true);
    try {
      const data = await utils.fetcher({
        url: `${apiBase}/${selectedChannel.id}`,
        config: { method: 'DELETE', credentials: 'include' }
      });
      if (data && !data.error) {
        setDeleteAlert(false);
        setSelectedChannel(null);
        fetchChannels();
        snackbar.success('Channel removed');
      } else {
        snackbar.error(data?.error || 'Failed to remove channel');
      }
    } catch {
      snackbar.error('Failed to remove channel');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyWebhook = () => {
    if (!selectedChannel?.webhookUrl) return;
    navigator.clipboard
      .writeText(selectedChannel.webhookUrl)
      .then(() => snackbar.success('Webhook URL copied'))
      .catch(() => snackbar.error('Failed to copy'));
  };

  const handleOpenResource = (resourceId: string) => {
    router.push(
      `/organization/${organizationId}/project/${projectId}/resources?selected=${resourceId}`
    );
  };

  const handleOpenTool = (artifactToolId: string) => {
    router.push(
      `/organization/${organizationId}/project/${projectId}/tools?selected=${artifactToolId}`
    );
  };

  const handleOpenPrompt = (promptId: string) => {
    router.push(
      `/organization/${organizationId}/project/${projectId}/prompts?selected=${promptId}`
    );
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = panelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const move = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const diff = startX.current - ev.clientX;
      const next = Math.max(
        360,
        Math.min(startWidth.current + diff, window.innerWidth - 300)
      );
      setPanelWidth(next);
    };
    const end = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', end);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', end);
  };

  const showRightPanel = !!selectedChannel || isCreating;
  const isActive = selectedChannel?.status === utils.constants.STATUS_ACTIVE;

  return (
    <Wrapper panelWidth={panelWidth}>
      <div className={`channels-list ${showRightPanel ? 'has-selection' : ''}`}>
        <div className="channels-header">
          <div className="channels-header-text">
            <h1 className="channels-title">Channels</h1>
            <p className="channels-subtitle">
              Connect this artifact to messaging platforms so users can chat
              with it.
            </p>
          </div>
          <UI.Button variant="contained" size="small" onClick={handleCreate}>
            <Add />
            <span className="button-text">Add channel</span>
          </UI.Button>
        </div>

        {status === 'pending' && channels.length === 0 && (
          <div className="channels-items">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="channel-item channel-item-skeleton">
                <UI.Skeleton variant="rounded" width={36} height={36} />
                <div style={{ flex: 1 }}>
                  <UI.Skeleton variant="text" width="40%" height={18} />
                  <UI.Skeleton variant="text" width="60%" height={12} />
                </div>
              </div>
            ))}
          </div>
        )}

        {status !== 'pending' && channels.length === 0 && (
          <div className="channels-empty-state">
            <ForumOutlined />
            <h3>No channels yet</h3>
            <p>Connect a Telegram bot to start receiving messages.</p>
            <UI.Button variant="contained" size="small" onClick={handleCreate}>
              <Add />
              <span className="button-text">Add channel</span>
            </UI.Button>
          </div>
        )}

        <div className="channels-items">
          {channels.map(channel => {
            const active = channel.status === utils.constants.STATUS_ACTIVE;
            return (
              <div
                key={channel.id}
                className={`channel-item ${selectedChannel?.id === channel.id ? 'active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => handleSelect(channel)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(channel);
                  }
                }}
              >
                <div className="channel-item-icon">
                  {platformIcon(channel.platform)}
                </div>
                <div className="channel-item-body">
                  <p className="channel-item-title">{channelLabel(channel)}</p>
                  <p className="channel-item-meta">
                    <span>{channel.conversationCount} conversations</span>
                    <span>·</span>
                    <span>{channel.messageCount} messages</span>
                  </p>
                </div>
                <span
                  className={`channel-status-pill ${active ? 'is-active' : 'is-disabled'}`}
                >
                  {active ? 'Active' : 'Disabled'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {showRightPanel && (
        <div className="channel-panel">
          <div
            className="panel-resize-handle"
            onMouseDown={handleResizeStart}
          />
          <div className="panel-header">
            {activeConversation ? (
              <IconButton
                className="panel-back-inline"
                onClick={() => setActiveConversation(null)}
              >
                <ArrowBack />
              </IconButton>
            ) : (
              <IconButton className="panel-back-btn" onClick={handleClose}>
                <ArrowBack />
              </IconButton>
            )}
            <h2 className="panel-title">
              {isCreating
                ? 'Connect channel'
                : activeConversation
                  ? activeConversation.title || 'Conversation'
                  : selectedChannel
                    ? channelLabel(selectedChannel)
                    : ''}
            </h2>
            <div className="panel-actions">
              <IconButton className="panel-close-btn" onClick={handleClose}>
                <Close />
              </IconButton>
            </div>
          </div>

          {selectedChannel && !isCreating && !activeConversation && (
            <div className="panel-tabs">
              <button
                type="button"
                className={`panel-tab ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => handleTabChange('overview')}
              >
                Overview
              </button>
              <button
                type="button"
                className={`panel-tab ${activeTab === 'conversations' ? 'active' : ''}`}
                onClick={() => handleTabChange('conversations')}
              >
                Conversations
              </button>
            </div>
          )}

          <div className="panel-content">
            {isCreating && (
              <div className="panel-edit-form">
                <div className="panel-section">
                  <p className="panel-section-label">Platform</p>
                  <div className="panel-platform-grid">
                    {PLATFORMS.map(({ id, label, Icon, enabled }) => (
                      <button
                        key={id}
                        type="button"
                        disabled={!enabled || submitting}
                        className={`panel-platform-option ${createValues.platform === id ? 'active' : ''}`}
                        onClick={() =>
                          setCreateValues(prev => ({ ...prev, platform: id }))
                        }
                      >
                        <Icon />
                        <span className="panel-platform-label">{label}</span>
                        {!enabled && (
                          <span className="panel-platform-soon">Soon</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {createValues.platform ===
                  utils.constants.CHANNEL_PLATFORM_TELEGRAM && (
                  <UI.Input
                    label="Bot token"
                    name="botToken"
                    type="password"
                    placeholder="123456:ABC-DEF..."
                    value={createValues.botToken}
                    disabled={submitting}
                    error={!!errors.botToken}
                    helperText={
                      errors.botToken ||
                      'Get a token from @BotFather on Telegram. We register the webhook automatically.'
                    }
                    onChange={e => {
                      setCreateValues(prev => ({
                        ...prev,
                        botToken: e.target.value
                      }));
                      if (errors.botToken) {
                        setErrors(prev => {
                          const n = { ...prev };
                          delete n.botToken;
                          return n;
                        });
                      }
                    }}
                  />
                )}

                <div className="panel-edit-actions">
                  <UI.Button
                    variant="contained"
                    size="small"
                    disabled={submitting}
                    onClick={handleCreateSubmit}
                  >
                    {submitting ? 'Connecting...' : 'Connect'}
                  </UI.Button>
                  <UI.Button
                    size="small"
                    disabled={submitting}
                    onClick={() => setIsCreating(false)}
                  >
                    Cancel
                  </UI.Button>
                </div>
              </div>
            )}

            {selectedChannel && !isCreating && activeTab === 'overview' && (
              <div>
                {selectedChannel.platform ===
                  utils.constants.CHANNEL_PLATFORM_TELEGRAM &&
                  selectedChannel.metadata?.telegram?.bot && (
                    <div className="panel-bot-card">
                      <div className="panel-bot-avatar">
                        <Telegram />
                      </div>
                      <div className="panel-bot-text">
                        <p className="panel-bot-name">
                          {selectedChannel.metadata.telegram.bot.firstName}
                        </p>
                        {selectedChannel.metadata.telegram.bot.username && (
                          <p className="panel-bot-handle">
                            @{selectedChannel.metadata.telegram.bot.username}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                <div className="panel-section">
                  <p className="panel-section-label">Status</p>
                  <div className="panel-toggle-row">
                    <div>
                      <p className="panel-toggle-label">
                        {isActive ? 'Receiving messages' : 'Paused'}
                      </p>
                      <p className="panel-toggle-hint">
                        {isActive
                          ? 'Incoming webhook events are processed by the agent.'
                          : 'Webhook still configured but events are dropped until re-enabled.'}
                      </p>
                    </div>
                    <Switch
                      checked={isActive}
                      disabled={statusUpdating}
                      onChange={handleStatusToggle}
                    />
                  </div>
                </div>

                <div className="panel-section">
                  <p className="panel-section-label">Activity</p>
                  <div className="panel-stats">
                    <div className="panel-stat">
                      <p className="panel-stat-label">Conversations</p>
                      <p className="panel-stat-value">
                        {selectedChannel.conversationCount}
                      </p>
                    </div>
                    <div className="panel-stat">
                      <p className="panel-stat-label">Messages</p>
                      <p className="panel-stat-value">
                        {selectedChannel.messageCount}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedChannel.webhookUrl && (
                  <div className="panel-section">
                    <p className="panel-section-label">Webhook</p>
                    <div className="panel-webhook-row">
                      <div className="panel-webhook-url">
                        {selectedChannel.webhookUrl}
                      </div>
                      <IconButton size="small" onClick={handleCopyWebhook}>
                        <ContentCopy />
                      </IconButton>
                    </div>
                  </div>
                )}

                <div className="panel-danger-zone">
                  <p className="panel-danger-label">Danger zone</p>
                  <UI.Button
                    size="small"
                    variant="outlined"
                    onClick={() => setDeleteAlert(true)}
                  >
                    <DeleteOutline />
                    <span className="button-text">Remove channel</span>
                  </UI.Button>
                </div>
              </div>
            )}

            {selectedChannel &&
              !isCreating &&
              activeTab === 'conversations' &&
              !activeConversation && (
                <div>
                  {conversationsStatus === 'pending' && (
                    <div className="panel-conversation-list">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="panel-conversation-item">
                          <UI.Skeleton variant="text" width="50%" height={18} />
                          <UI.Skeleton variant="text" width="35%" height={12} />
                        </div>
                      ))}
                    </div>
                  )}
                  {conversationsStatus !== 'pending' &&
                    conversations.length === 0 && (
                      <p className="panel-empty">
                        No conversations yet. Send a message to your bot to
                        start one.
                      </p>
                    )}
                  <div className="panel-conversation-list">
                    {conversations.map(conv => (
                      <div
                        key={conv.id}
                        className="panel-conversation-item"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleOpenConversation(conv)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleOpenConversation(conv);
                          }
                        }}
                      >
                        <div className="panel-conversation-row">
                          <p className="panel-conversation-title">
                            {conv.title || 'Untitled'}
                          </p>
                          <span className="panel-conversation-scope">
                            {conv.scope}
                          </span>
                        </div>
                        <p className="panel-conversation-meta">
                          <span>{conv.messageCount} messages</span>
                          <span>{utils.formatRelative(conv.lastMessageAt)}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {selectedChannel && activeConversation && (
              <div className="panel-messages-thread">
                {messagesStatus === 'pending' && (
                  <p className="panel-empty">Loading messages...</p>
                )}
                {messagesStatus !== 'pending' && messages.length === 0 && (
                  <p className="panel-empty">No messages in this thread.</p>
                )}
                {[...messages].reverse().map(msg => {
                  const isUser = msg.role === utils.constants.ROLE_MESSAGE_USER;
                  const attachments = collectResourceAttachments(
                    msg.usages || []
                  );
                  const messageIndex = messages.findIndex(
                    m => m.id === msg.id
                  );
                  let userMessageForTurn: Message | null = null;
                  for (let k = messageIndex + 1; k < messages.length; k++) {
                    if (messages[k].role === utils.constants.ROLE_MESSAGE_USER) {
                      userMessageForTurn = messages[k];
                      break;
                    }
                  }
                  return (
                    <div
                      key={msg.id}
                      className={`panel-message-bubble ${isUser ? 'is-user' : 'is-assistant'}`}
                    >
                      <p className="panel-message-meta">
                        <span>{msg.role}</span>
                        {isUser && msg.participant?.displayName && (
                          <>
                            <span>·</span>
                            <span>{msg.participant.displayName}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{utils.formatRelative(msg.createdAt)}</span>
                      </p>
                      {msg.content ? (
                        <UI.Markdown
                          className="panel-message-content"
                          content={msg.content}
                        />
                      ) : (
                        <p className="panel-message-content">...</p>
                      )}
                      {attachments.length > 0 && (
                        <div className="panel-message-attachments">
                          {attachments.map(resource => (
                            <button
                              key={resource.id}
                              type="button"
                              className="panel-attachment"
                              onClick={() => handleOpenResource(resource.id)}
                            >
                              <span className="panel-attachment-icon">
                                {resourceAttachmentIcon(resource.mimeType)}
                              </span>
                              <span className="panel-attachment-text">
                                <span className="panel-attachment-title">
                                  {resource.title}
                                </span>
                                <span className="panel-attachment-mime">
                                  {resource.mimeType}
                                </span>
                              </span>
                              <OpenInNew className="panel-attachment-open" />
                            </button>
                          ))}
                        </div>
                      )}
                      {(msg.tokensIn || msg.tokensOut || msg.latencyMs) && (
                        <p className="panel-message-stats">
                          {msg.tokensIn != null && (
                            <span>↓ {msg.tokensIn} tok</span>
                          )}
                          {msg.tokensOut != null && (
                            <span>↑ {msg.tokensOut} tok</span>
                          )}
                          {msg.latencyMs != null && (
                            <span>{msg.latencyMs}ms</span>
                          )}
                        </p>
                      )}
                      {msg.usages && msg.usages.length > 0 && (
                        <div className="panel-message-usages">
                          {msg.usages.map(u => {
                            const open = () =>
                              setViewingUsage({
                                usage: u,
                                message: msg,
                                userMessage: userMessageForTurn
                              });
                            return (
                              <div key={u.id} className="panel-usage-row">
                                <div
                                  className={`panel-usage-item ${u.errorMessage ? 'has-error' : ''} is-clickable`}
                                  role="button"
                                  tabIndex={0}
                                  onClick={open}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      open();
                                    }
                                  }}
                                >
                                  {usageIcon(u.kind)}
                                  <span className="panel-usage-kind">
                                    {u.kind}
                                  </span>
                                  <span className="panel-usage-name">
                                    {usageLabel(u)}
                                  </span>
                                  {u.latencyMs != null && (
                                    <span className="panel-usage-latency">
                                      {u.latencyMs}ms
                                    </span>
                                  )}
                                </div>
                                {u.errorMessage && (
                                  <p className="panel-usage-error">
                                    {u.errorMessage}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <UI.Alert
        open={deleteAlert}
        title="Remove channel"
        description={`This will disconnect ${selectedChannel ? channelLabel(selectedChannel) : 'this channel'} and delete its conversation history. This cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        loading={submitting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteAlert(false)}
      />
      {viewingUsage && (
        <UI.Portal>
          <UsageModalOverlay
            role="button"
            tabIndex={0}
            aria-label="Close details"
            onClick={() => setViewingUsage(null)}
            onKeyDown={e => {
              if (e.key === 'Escape') setViewingUsage(null);
            }}
          >
            <div
              className="usage-modal"
              role="dialog"
              aria-modal="true"
              onClick={e => e.stopPropagation()}
            >
              <div className="usage-modal-header">
                <div className="usage-modal-header-text">
                  <p className="usage-modal-kind">
                    {viewingUsage.usage.kind}
                  </p>
                  <h2 className="usage-modal-title">
                    {usageLabel(viewingUsage.usage)}
                  </h2>
                  {viewingUsage.usage.latencyMs != null && (
                    <p className="usage-modal-meta">
                      {viewingUsage.usage.latencyMs}ms
                    </p>
                  )}
                </div>
                <IconButton
                  size="small"
                  onClick={() => setViewingUsage(null)}
                >
                  <Close />
                </IconButton>
              </div>
              <div className="usage-modal-body">
                {viewingUsage.userMessage && (
                  <UI.CopyableBlock
                    label="User message"
                    text={viewingUsage.userMessage.content || ''}
                    onCopy={() => snackbar.success('User message copied')}
                    onCopyError={() => snackbar.error('Failed to copy')}
                    meta={`${viewingUsage.userMessage.participant?.displayName || 'Unknown'} · ${utils.formatRelative(viewingUsage.userMessage.createdAt)}`}
                  />
                )}
                {(viewingUsage.message.tokensIn != null ||
                  viewingUsage.message.tokensOut != null ||
                  viewingUsage.message.latencyMs != null) && (
                  <div className="usage-modal-section">
                    <p className="usage-modal-label">Assistant turn</p>
                    <p className="usage-modal-meta">
                      {viewingUsage.message.tokensIn != null && (
                        <span>↓ {viewingUsage.message.tokensIn} tok</span>
                      )}
                      {viewingUsage.message.tokensOut != null && (
                        <span> · ↑ {viewingUsage.message.tokensOut} tok</span>
                      )}
                      {viewingUsage.message.latencyMs != null && (
                        <span> · {viewingUsage.message.latencyMs}ms total</span>
                      )}
                    </p>
                  </div>
                )}
                {viewingUsage.usage.errorMessage && (
                  <UI.CopyableBlock
                    label="Error"
                    text={viewingUsage.usage.errorMessage}
                    variant="error"
                    onCopy={() => snackbar.success('Error copied')}
                    onCopyError={() => snackbar.error('Failed to copy')}
                  />
                )}
                {viewingUsage.usage.input &&
                  Object.keys(viewingUsage.usage.input).length > 0 && (
                    <UI.CopyableBlock
                      label="Input"
                      text={JSON.stringify(viewingUsage.usage.input, null, 2)}
                      onCopy={() => snackbar.success('Input copied')}
                      onCopyError={() => snackbar.error('Failed to copy')}
                    />
                  )}
                {(() => {
                  const raw = extractUsageText(viewingUsage.usage.output);
                  if (!raw) return null;
                  let pretty = raw;
                  try {
                    pretty = JSON.stringify(JSON.parse(raw), null, 2);
                  } catch {
                    pretty = raw;
                  }
                  return (
                    <UI.CopyableBlock
                      label="Output"
                      text={pretty}
                      onCopy={() => snackbar.success('Output copied')}
                      onCopyError={() => snackbar.error('Failed to copy')}
                    />
                  );
                })()}
              </div>
              {(() => {
                const u = viewingUsage.usage;
                const targets: {
                  label: string;
                  Icon: typeof BuildOutlined;
                  onClick: () => void;
                }[] = [];
                if (u.artifactTool?.id) {
                  const id = u.artifactTool.id;
                  targets.push({
                    label: 'Open in Tools',
                    Icon: BuildOutlined,
                    onClick: () => {
                      setViewingUsage(null);
                      handleOpenTool(id);
                    }
                  });
                }
                if (u.artifactResource?.id) {
                  const id = u.artifactResource.id;
                  targets.push({
                    label: 'Open in Resources',
                    Icon: AttachFileOutlined,
                    onClick: () => {
                      setViewingUsage(null);
                      handleOpenResource(id);
                    }
                  });
                }
                if (u.artifactPrompt?.id) {
                  const id = u.artifactPrompt.id;
                  targets.push({
                    label: 'Open in Prompts',
                    Icon: AutoAwesomeOutlined,
                    onClick: () => {
                      setViewingUsage(null);
                      handleOpenPrompt(id);
                    }
                  });
                }
                if (targets.length === 0) return null;
                return (
                  <div className="usage-modal-footer">
                    {targets.map(({ label, Icon, onClick }) => (
                      <UI.Button
                        key={label}
                        variant="contained"
                        size="small"
                        onClick={onClick}
                      >
                        <Icon />
                        <span className="button-text">{label}</span>
                      </UI.Button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </UsageModalOverlay>
        </UI.Portal>
      )}
    </Wrapper>
  );
};
