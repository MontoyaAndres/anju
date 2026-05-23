import { Context } from 'hono';
import { eq, sql, and, InferSelectModel } from 'drizzle-orm';
import { db } from '@anju/db';
import { utils } from '@anju/utils';

import { collectSources } from './sources';
import { extractToolText } from './toolText';
import { createMcpClient, getLlmAdapter, createAuth } from '../../utils';

import type { LlmMessage, LlmToolCall, LlmToolDefinition } from '../../utils';
import type { AppEnv } from '../../types';
import type { ChannelNotifier, Source, SourceButton } from '@anju/utils';
import { Client } from '@modelcontextprotocol/sdk/client';

type ArtifactResourceRow = InferSelectModel<typeof db.schema.artifactResource>;

interface ResolvedLlm {
  row: {
    provider: string;
    model: string;
    baseUrl: string | null;
    systemPrompt: string | null;
    config: unknown;
  };
  apiKey: string;
  llmId: string | null;
  llmName: string | null;
}

const resolveChannelLlm = async (
  c: Context<AppEnv>,
  dbInstance: ReturnType<typeof db.create>,
  llmId: string | null
): Promise<ResolvedLlm> => {
  if (llmId) {
    const [llmRow] = await dbInstance
      .select()
      .from(db.schema.organizationLlm)
      .where(eq(db.schema.organizationLlm.id, llmId))
      .limit(1);

    if (!llmRow) throw new Error('LLM not found for channel');

    const encryptionKey = utils.getCredentialEncryptionKey(c);
    return {
      row: {
        provider: llmRow.provider,
        model: llmRow.model,
        baseUrl: llmRow.baseUrl,
        systemPrompt: llmRow.systemPrompt,
        config: llmRow.config
      },
      apiKey: utils.decryptString(llmRow.apiKey, encryptionKey),
      llmId: llmRow.id,
      llmName: llmRow.name
    };
  }

  const apiKey = utils.getEnv(c, 'EMBEDDING_API_KEY');
  if (!apiKey) {
    throw new Error(
      'No LLM configured for this channel and EMBEDDING_API_KEY is not set'
    );
  }

  return {
    row: {
      provider: utils.constants.DEFAULT_LLM_PROVIDER,
      model: utils.constants.DEFAULT_LLM_MODEL,
      baseUrl: null,
      systemPrompt: utils.constants.DEFAULT_LLM_SYSTEM_PROMPT,
      config: null
    },
    apiKey,
    llmId: null,
    llmName: null
  };
};

export interface ChannelAttachment {
  resource: ArtifactResourceRow;
  caption?: string;
}

interface RunOptions {
  channelId: string;
  externalConversationId: string;
  conversationTitle?: string | null;
  conversationScope: string;
  externalParticipantId: string;
  participantDisplayName?: string | null;
  participantMetadata?: Record<string, unknown>;
  externalMessageId?: string | null;
  userText: string;
  messageMetadata?: Record<string, unknown>;
  promptId?: string | null;
  promptArgs?: Record<string, string>;
  notifier?: ChannelNotifier;
}

interface RunResult {
  assistantText: string;
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  attachments: ChannelAttachment[];
  sources: Source[];
  sourcesFooter: string | null;
  sourceButtons: SourceButton[];
}

interface BotTokenApi {
  botToken: (args: {
    body: {
      grant_type: string;
      provider: string;
      external_id: string;
      channel_id: string;
      audience: string;
      scope?: string;
      client_id?: string;
      client_secret?: string;
    };
  }) => Promise<{ access_token?: string }>;
}

// Mints a bot-on-behalf-of JWT so the channel can call MCP as the linked user.
// Called in-process — a Worker self-fetch to its own hostname times out.
// Returns undefined on any failure — the caller then falls back to the
// channel's internal-secret access.
const mintBotToken = async (
  c: Context<AppEnv>,
  provider: string,
  externalId: string,
  channelId: string,
  audience: string
): Promise<string | undefined> => {
  const clientId = utils.getEnv(c, 'BOT_OAUTH_CLIENT_ID');
  const clientSecret = utils.getEnv(c, 'BOT_OAUTH_CLIENT_SECRET');
  if (!clientId || !clientSecret) return undefined;

  try {
    const auth = createAuth(c);

    const api = auth.api as unknown as BotTokenApi;
    const result = await api.botToken({
      body: {
        grant_type: utils.constants.BOT_GRANT_TYPE,
        provider,
        external_id: externalId,
        channel_id: channelId,
        audience,
        client_id: clientId,
        client_secret: clientSecret
      }
    });
    return result.access_token;
  } catch {
    return undefined;
  }
};

export const runChannelTurn = async (
  c: Context<AppEnv>,
  options: RunOptions
): Promise<RunResult> => {
  if (
    !utils.constants.CHANNEL_CONVERSATION_SCOPES.includes(
      options.conversationScope as (typeof utils.constants.CHANNEL_CONVERSATION_SCOPES)[0]
    )
  ) {
    throw new Error(`Invalid conversationScope: ${options.conversationScope}`);
  }

  const dbInstance = db.create(c);

  const [channelRow] = await dbInstance
    .select()
    .from(db.schema.channel)
    .where(eq(db.schema.channel.id, options.channelId))
    .limit(1);

  if (!channelRow) throw new Error('Channel not found');

  const [artifactRow] = await dbInstance
    .select()
    .from(db.schema.artifact)
    .where(eq(db.schema.artifact.id, channelRow.artifactId))
    .limit(1);

  if (!artifactRow) throw new Error('Artifact not found for channel');

  const [projectRow] = await dbInstance
    .select({
      id: db.schema.project.id,
      organizationId: db.schema.project.organizationId
    })
    .from(db.schema.project)
    .where(eq(db.schema.project.id, artifactRow.projectId))
    .limit(1);

  if (!projectRow) throw new Error('Project not found for channel');

  const llmConfig = await resolveChannelLlm(c, dbInstance, channelRow.llmId);
  const llmRow = llmConfig.row;
  const apiKeyPlain = llmConfig.apiKey;

  const [conversation, participant] = await Promise.all([
    upsertConversation(
      dbInstance,
      channelRow.id,
      options.externalConversationId,
      options.conversationTitle || null,
      options.conversationScope
    ),
    upsertParticipant(
      dbInstance,
      channelRow.id,
      options.externalParticipantId,
      options.participantDisplayName || null,
      options.participantMetadata || null
    )
  ]);

  const [userMessage] = await dbInstance
    .insert(db.schema.channelMessage)
    .values({
      role: utils.constants.ROLE_MESSAGE_USER,
      content: options.userText,
      externalMessageId: options.externalMessageId || null,
      conversationId: conversation.id,
      participantId: participant.id,
      metadata: options.messageMetadata || null
    })
    .returning();

  const history = await loadRecentHistory(dbInstance, conversation.id, 20);

  const artifactTools = await dbInstance
    .select({
      id: db.schema.artifactTool.id,
      key: db.schema.toolDefinition.key
    })
    .from(db.schema.artifactTool)
    .innerJoin(
      db.schema.toolDefinition,
      eq(db.schema.artifactTool.toolDefinitionId, db.schema.toolDefinition.id)
    )
    .where(eq(db.schema.artifactTool.artifactId, artifactRow.id));
  const artifactToolIdByKey = new Map<string, string>(
    artifactTools.map(t => [t.key, t.id])
  );

  const artifactResources = await dbInstance
    .select()
    .from(db.schema.artifactResource)
    .where(eq(db.schema.artifactResource.artifactId, artifactRow.id));
  const artifactResourceByUri = new Map(artifactResources.map(r => [r.uri, r]));
  const artifactResourceById = new Map(artifactResources.map(r => [r.id, r]));
  const artifactResourceIdByUri = new Map<string, string>(
    artifactResources.map(r => [r.uri, r.id])
  );

  // Resolve the participant's link for THIS channel only (set by `/link`).
  // Per-channel scoping: a link in another channel — even by the same Telegram
  // user — does not authenticate them here.
  const [linkedIdentity] = await dbInstance
    .select({ userId: db.schema.externalIdentity.userId })
    .from(db.schema.externalIdentity)
    .where(
      and(
        eq(db.schema.externalIdentity.channelId, channelRow.id),
        eq(db.schema.externalIdentity.provider, channelRow.platform),
        eq(db.schema.externalIdentity.externalId, options.externalParticipantId)
      )
    )
    .limit(1);

  // Mirror the global link onto this channel's participant row — re-derived
  // every turn, so it tracks linking, unlinking, and re-linking to another
  // account without staleness.
  const linkedUserId = linkedIdentity?.userId ?? null;
  if (participant.linkedUserId !== linkedUserId) {
    await dbInstance
      .update(db.schema.channelParticipant)
      .set({ linkedUserId })
      .where(eq(db.schema.channelParticipant.id, participant.id));
  }

  // Call MCP on behalf of the participant only when they have linked their
  // Anju account AND are a member of this project — projects are isolated, so
  // org membership alone doesn't grant access. Otherwise fall back to the
  // channel's internal-secret access, so linking never downgrades a user.
  let mcpAuthToken: string | undefined;
  if (linkedIdentity) {
    const [projectMember] = await dbInstance
      .select({ userId: db.schema.projectUser.userId })
      .from(db.schema.projectUser)
      .where(
        and(
          eq(db.schema.projectUser.projectId, artifactRow.projectId),
          eq(db.schema.projectUser.userId, linkedIdentity.userId)
        )
      )
      .limit(1);

    if (projectMember) {
      mcpAuthToken = await mintBotToken(
        c,
        channelRow.platform,
        options.externalParticipantId,
        channelRow.id,
        artifactRow.slug
      );
    }
  }

  const mcp = await createMcpClient(c, artifactRow.slug, mcpAuthToken, {
    channelId: channelRow.id,
    platform: channelRow.platform
  });
  let assistantText = '';
  let assistantMessageId = '';
  let totalLatency = 0;
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  const attachments: ChannelAttachment[] = [];
  const usageEvents: Array<{
    kind: string;
    toolName: string;
    artifactToolId: string | null;
    artifactResourceId?: string | null;
    artifactPromptId?: string | null;
    input: Record<string, unknown>;
    output: unknown;
    latencyMs: number;
    errorMessage?: string;
  }> = [];

  try {
    let llmTools: LlmToolDefinition[] = [];
    try {
      const toolsResponse = await mcp.client.listTools();
      llmTools = (toolsResponse.tools || []).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema || { type: 'object', properties: {} }
      }));
    } catch (error: any) {
      // -32601 = artifact has no tools registered; SDK never enabled tools/list
      if (error?.code !== -32601) throw error;
    }

    let userTurn: LlmMessage[] = [
      {
        role: utils.constants.ROLE_MESSAGE_USER,
        content: options.userText
      }
    ];

    if (options.promptId) {
      const start = Date.now();
      try {
        const promptResult = await mcp.client.getPrompt({
          name: options.promptId,
          arguments: options.promptArgs || {}
        });
        userTurn = (promptResult.messages || [])
          .map(m => {
            const content = m.content;
            const text =
              typeof content === 'string'
                ? content
                : content?.type === 'text' && typeof content.text === 'string'
                  ? content.text
                  : '';
            return {
              role:
                m.role === utils.constants.ROLE_MESSAGE_ASSISTANT
                  ? utils.constants.ROLE_MESSAGE_ASSISTANT
                  : utils.constants.ROLE_MESSAGE_USER,
              content: text
            } as LlmMessage;
          })
          .filter(m => m.content);
        if (userTurn.length === 0) {
          userTurn = [
            {
              role: utils.constants.ROLE_MESSAGE_USER,
              content: options.userText
            }
          ];
        }
        usageEvents.push({
          kind: utils.constants.CHANNEL_USAGE_KIND_PROMPT,
          toolName: options.promptId,
          artifactToolId: null,
          artifactPromptId: options.promptId,
          input: options.promptArgs || {},
          output: promptResult,
          latencyMs: Date.now() - start
        });
      } catch (error: any) {
        usageEvents.push({
          kind: utils.constants.CHANNEL_USAGE_KIND_PROMPT,
          toolName: options.promptId,
          artifactToolId: null,
          artifactPromptId: options.promptId,
          input: options.promptArgs || {},
          output: null,
          latencyMs: Date.now() - start,
          errorMessage: error?.message || String(error)
        });
      }
    }

    const messages: LlmMessage[] = [...history, ...userTurn];

    const adapter = getLlmAdapter(llmRow.provider);

    for (let loop = 0; loop < utils.constants.MAX_TOOL_LOOPS; loop++) {
      const start = Date.now();
      const completion = await adapter.complete({
        model: llmRow.model,
        baseUrl: llmRow.baseUrl,
        apiKey: apiKeyPlain,
        systemPrompt: llmRow.systemPrompt,
        messages,
        tools: llmTools,
        config: (llmRow.config as Record<string, unknown>) || null
      });
      totalLatency += Date.now() - start;
      totalTokensIn += completion.usage.tokensIn || 0;
      totalTokensOut += completion.usage.tokensOut || 0;

      if (completion.assistant.content) {
        assistantText += completion.assistant.content;
      }

      if (
        completion.stopReason !== 'tool_use' ||
        completion.assistant.toolCalls.length === 0
      ) {
        messages.push({
          role: utils.constants.ROLE_MESSAGE_ASSISTANT,
          content: completion.assistant.content,
          toolCalls: completion.assistant.toolCalls
        });
        break;
      }

      messages.push({
        role: utils.constants.ROLE_MESSAGE_ASSISTANT,
        content: completion.assistant.content,
        toolCalls: completion.assistant.toolCalls
      });

      for (const call of completion.assistant.toolCalls) {
        if (options.notifier && utils.getToolStatusMessage(call.name)) {
          await options.notifier
            .toolStarted({ toolName: call.name, arguments: call.arguments })
            .catch(() => undefined);
        }
        const toolResult = await executeToolCall(
          mcp.client,
          call,
          usageEvents,
          artifactToolIdByKey,
          artifactResourceIdByUri,
          artifactResourceByUri,
          attachments
        );
        messages.push({
          role: utils.constants.ROLE_MESSAGE_TOOL,
          content: toolResult,
          toolCallId: call.id
        });
      }
    }
  } finally {
    await mcp.close().catch(() => undefined);
  }

  const sources = await collectSources(
    dbInstance,
    usageEvents,
    artifactResourceByUri,
    artifactResourceById
  );

  let sourcesFooter: string | null = null;
  let sourceButtons: SourceButton[] = [];
  if (sources.length > 0) {
    const apiUrl = utils.getEnv(c, 'NEXT_PUBLIC_API_URL') || '';
    if (apiUrl) {
      const ctx = {
        apiUrl,
        organizationId: projectRow.organizationId,
        projectId: projectRow.id
      };
      sourcesFooter = utils.formatSourcesAsMarkdown(sources, ctx);
      sourceButtons = utils.formatSourcesAsButtons(sources, ctx);
    }
  }

  const [assistantMessage] = await dbInstance
    .insert(db.schema.channelMessage)
    .values({
      role: utils.constants.ROLE_MESSAGE_ASSISTANT,
      content: assistantText,
      conversationId: conversation.id,
      participantId: participant.id,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      latencyMs: totalLatency,
      metadata: {
        ...(sources.length > 0 ? { sources } : {}),
        llm: {
          provider: llmRow.provider,
          model: llmRow.model,
          id: llmConfig.llmId,
          name: llmConfig.llmName
        }
      }
    })
    .returning();
  assistantMessageId = assistantMessage.id;

  if (usageEvents.length > 0) {
    await dbInstance.insert(db.schema.channelMessageUsage).values(
      usageEvents.map(event => ({
        kind: event.kind,
        artifactToolId: event.artifactToolId,
        artifactResourceId: event.artifactResourceId || null,
        artifactPromptId: event.artifactPromptId || null,
        input: event.input,
        output: event.output,
        latencyMs: event.latencyMs,
        errorMessage: event.errorMessage || null,
        messageId: assistantMessage.id
      }))
    );
  }

  await dbInstance
    .update(db.schema.channelConversation)
    .set({
      messageCount: sql`(${db.schema.channelConversation.messageCount}::int + 2)::int`,
      lastMessageAt: new Date()
    })
    .where(eq(db.schema.channelConversation.id, conversation.id));

  await dbInstance
    .update(db.schema.channel)
    .set({
      messageCount: sql`(${db.schema.channel.messageCount}::int + 2)::int`
    })
    .where(eq(db.schema.channel.id, channelRow.id));

  return {
    assistantText: assistantText || '...',
    conversationId: conversation.id,
    userMessageId: userMessage.id,
    assistantMessageId,
    attachments,
    sources,
    sourcesFooter,
    sourceButtons
  };
};

const upsertConversation = async (
  dbInstance: ReturnType<typeof db.create>,
  channelId: string,
  externalConversationId: string,
  title: string | null,
  scope: string
) => {
  const [existing] = await dbInstance
    .select()
    .from(db.schema.channelConversation)
    .where(
      and(
        eq(db.schema.channelConversation.channelId, channelId),
        eq(
          db.schema.channelConversation.externalConversationId,
          externalConversationId
        )
      )
    )
    .limit(1);

  if (existing) {
    const patch: Record<string, unknown> = {};
    if (title && existing.title !== title) patch.title = title;
    if (existing.scope !== scope) patch.scope = scope;
    if (Object.keys(patch).length > 0) {
      const [updated] = await dbInstance
        .update(db.schema.channelConversation)
        .set(patch)
        .where(eq(db.schema.channelConversation.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  const [created] = await dbInstance
    .insert(db.schema.channelConversation)
    .values({
      channelId,
      externalConversationId,
      title,
      scope
    })
    .returning();

  await dbInstance
    .update(db.schema.channel)
    .set({
      conversationCount: sql`(${db.schema.channel.conversationCount}::int + 1)::int`
    })
    .where(eq(db.schema.channel.id, channelId));

  return created;
};

const upsertParticipant = async (
  dbInstance: ReturnType<typeof db.create>,
  channelId: string,
  externalUserId: string,
  displayName: string | null,
  metadata: Record<string, unknown> | null
) => {
  const [existing] = await dbInstance
    .select()
    .from(db.schema.channelParticipant)
    .where(
      and(
        eq(db.schema.channelParticipant.channelId, channelId),
        eq(db.schema.channelParticipant.externalUserId, externalUserId)
      )
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await dbInstance
    .insert(db.schema.channelParticipant)
    .values({ channelId, externalUserId, displayName, metadata })
    .returning();
  return created;
};

const loadRecentHistory = async (
  dbInstance: ReturnType<typeof db.create>,
  conversationId: string,
  limit: number
): Promise<LlmMessage[]> => {
  const rows = await dbInstance
    .select()
    .from(db.schema.channelMessage)
    .where(eq(db.schema.channelMessage.conversationId, conversationId))
    .orderBy(sql`${db.schema.channelMessage.createdAt} DESC`)
    .limit(limit);

  return rows
    .filter(
      r =>
        r.role === utils.constants.ROLE_MESSAGE_USER ||
        r.role === utils.constants.ROLE_MESSAGE_ASSISTANT
    )
    .reverse()
    .map(r => ({
      role: r.role as 'user' | 'assistant',
      content: r.content || ''
    }));
};

const RESOURCE_TOOL_KEYS = new Set(utils.constants.RESOURCE_TOOL_KEYS);
const URI_BEARING_RESOURCE_TOOL_KEYS = new Set(
  utils.constants.URI_BEARING_RESOURCE_TOOL_KEYS
);

const executeToolCall = async (
  client: Client,
  call: LlmToolCall,
  usageEvents: Array<{
    kind: string;
    toolName: string;
    artifactToolId: string | null;
    artifactResourceId?: string | null;
    artifactPromptId?: string | null;
    input: Record<string, unknown>;
    output: unknown;
    latencyMs: number;
    errorMessage?: string;
  }>,
  artifactToolIdByKey: Map<string, string>,
  artifactResourceIdByUri: Map<string, string>,
  artifactResourceByUri: Map<string, ArtifactResourceRow>,
  attachments: ChannelAttachment[]
): Promise<string> => {
  const artifactToolId = artifactToolIdByKey.get(call.name) || null;
  const isResourceTool = RESOURCE_TOOL_KEYS.has(call.name);
  const kind = isResourceTool
    ? utils.constants.CHANNEL_USAGE_KIND_RESOURCE
    : utils.constants.CHANNEL_USAGE_KIND_TOOL;
  const uri =
    URI_BEARING_RESOURCE_TOOL_KEYS.has(call.name) &&
    typeof call.arguments?.uri === 'string'
      ? (call.arguments.uri as string)
      : null;
  const artifactResourceId = uri
    ? artifactResourceIdByUri.get(uri) || null
    : null;
  const start = Date.now();
  try {
    const result = await client.callTool({
      name: call.name,
      arguments: call.arguments
    });
    const latencyMs = Date.now() - start;
    const text = extractToolText(result);
    if (call.name === 'send-resource' && uri) {
      const resource = artifactResourceByUri.get(uri);
      if (resource) {
        const rawCaption = call.arguments?.caption;
        attachments.push({
          resource,
          caption:
            typeof rawCaption === 'string' && rawCaption.trim()
              ? rawCaption.trim()
              : undefined
        });
      }
    }
    usageEvents.push({
      kind,
      toolName: call.name,
      artifactToolId,
      artifactResourceId,
      input: call.arguments,
      output: result,
      latencyMs
    });
    return text;
  } catch (error: any) {
    const latencyMs = Date.now() - start;
    usageEvents.push({
      kind,
      toolName: call.name,
      artifactToolId,
      artifactResourceId,
      input: call.arguments,
      output: null,
      latencyMs,
      errorMessage: error?.message || String(error)
    });
    return `Error calling tool ${call.name}: ${error?.message || error}`;
  }
};
