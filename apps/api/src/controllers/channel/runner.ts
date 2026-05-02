import { Context } from 'hono';
import { eq, sql, and, InferSelectModel } from 'drizzle-orm';
import { db } from '@anju/db';
import { utils } from '@anju/utils';

import { createMcpClient, getLlmAdapter } from '../../utils';

import type { LlmMessage, LlmToolCall, LlmToolDefinition } from '../../utils';
import type { AppEnv } from '../../types';
import { Client } from '@modelcontextprotocol/sdk/client';

type ArtifactResourceRow = InferSelectModel<typeof db.schema.artifactResource>;

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
}

interface RunResult {
  assistantText: string;
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  attachments: ChannelAttachment[];
}

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

  const [llmRow] = await dbInstance
    .select()
    .from(db.schema.artifactLlm)
    .where(eq(db.schema.artifactLlm.artifactId, artifactRow.id))
    .limit(1);

  if (!llmRow) throw new Error('LLM is not configured for this MCP');

  const encryptionKey = utils.getCredentialEncryptionKey(c);
  const apiKeyPlain = utils.decryptString(llmRow.apiKey, encryptionKey);

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
  const artifactResourceIdByUri = new Map<string, string>(
    artifactResources.map(r => [r.uri, r.id])
  );

  const mcp = await createMcpClient(artifactRow.hash);
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
    const toolsResponse = await mcp.client.listTools();
    const llmTools: LlmToolDefinition[] = (toolsResponse.tools || []).map(
      tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema || { type: 'object', properties: {} }
      })
    );

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

  const [assistantMessage] = await dbInstance
    .insert(db.schema.channelMessage)
    .values({
      role: utils.constants.ROLE_MESSAGE_ASSISTANT,
      content: assistantText,
      conversationId: conversation.id,
      participantId: participant.id,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      latencyMs: totalLatency
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
    attachments
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

const extractToolText = (result: any): string => {
  const content = result?.content;
  if (!Array.isArray(content)) return JSON.stringify(result);
  const texts = content
    .filter(c => c?.type === 'text' && typeof c.text === 'string')
    .map(c => c.text);
  return texts.join('\n') || JSON.stringify(result);
};
