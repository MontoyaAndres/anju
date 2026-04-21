import { Context } from 'hono';
import { eq, sql, and } from 'drizzle-orm';
import { db } from '@anju/db';
import { utils } from '@anju/utils';

import { createMcpClient, getLlmAdapter } from '../../utils';

import type { LlmMessage, LlmToolCall, LlmToolDefinition } from '../../utils';
import type { AppEnv } from '../../types';

const MAX_TOOL_LOOPS = 8;

interface RunOptions {
  channelId: string;
  externalConversationId: string;
  conversationTitle?: string | null;
  externalParticipantId: string;
  participantDisplayName?: string | null;
  participantMetadata?: Record<string, unknown>;
  externalMessageId?: string | null;
  userText: string;
  messageMetadata?: Record<string, unknown>;
}

interface RunResult {
  assistantText: string;
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
}

export const runChannelTurn = async (
  c: Context<AppEnv>,
  options: RunOptions
): Promise<RunResult> => {
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
      options.conversationTitle || null
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
      role: utils.constants.CHANNEL_MESSAGE_ROLE_USER,
      content: options.userText,
      externalMessageId: options.externalMessageId || null,
      conversationId: conversation.id,
      participantId: participant.id,
      metadata: options.messageMetadata || null
    })
    .returning();

  const history = await loadRecentHistory(dbInstance, conversation.id, 20);

  const mcp = await createMcpClient(artifactRow.hash);
  let assistantText = '';
  let assistantMessageId = '';
  let totalLatency = 0;
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  const usageEvents: Array<{
    kind: string;
    toolName: string;
    input: Record<string, unknown>;
    output: unknown;
    latencyMs: number;
    errorMessage?: string;
  }> = [];

  try {
    const toolsResponse = await mcp.client.listTools();
    const llmTools: LlmToolDefinition[] = (toolsResponse.tools || []).map(
      (tool: any) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema || { type: 'object', properties: {} }
      })
    );

    const messages: LlmMessage[] = [
      ...history,
      { role: 'user', content: options.userText }
    ];

    const adapter = getLlmAdapter(llmRow.provider);

    for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
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

      if (completion.stopReason !== 'tool_use' || completion.assistant.toolCalls.length === 0) {
        messages.push({
          role: 'assistant',
          content: completion.assistant.content,
          toolCalls: completion.assistant.toolCalls
        });
        break;
      }

      messages.push({
        role: 'assistant',
        content: completion.assistant.content,
        toolCalls: completion.assistant.toolCalls
      });

      for (const call of completion.assistant.toolCalls) {
        const toolResult = await executeToolCall(mcp.client, call, usageEvents);
        messages.push({
          role: 'tool',
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
      role: utils.constants.CHANNEL_MESSAGE_ROLE_ASSISTANT,
      content: assistantText,
      conversationId: conversation.id,
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
        input: event.input,
        output: event.output as any,
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
    assistantMessageId
  };
};

const upsertConversation = async (
  dbInstance: ReturnType<typeof db.create>,
  channelId: string,
  externalConversationId: string,
  title: string | null
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

  if (existing) return existing;

  const [created] = await dbInstance
    .insert(db.schema.channelConversation)
    .values({
      channelId,
      externalConversationId,
      title
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
    .filter(r => r.role === 'user' || r.role === 'assistant')
    .reverse()
    .map(r => ({
      role: r.role as 'user' | 'assistant',
      content: r.content || ''
    }));
};

const executeToolCall = async (
  client: any,
  call: LlmToolCall,
  usageEvents: Array<{
    kind: string;
    toolName: string;
    input: Record<string, unknown>;
    output: unknown;
    latencyMs: number;
    errorMessage?: string;
  }>
): Promise<string> => {
  const start = Date.now();
  try {
    const result = await client.callTool({
      name: call.name,
      arguments: call.arguments
    });
    const latencyMs = Date.now() - start;
    const text = extractToolText(result);
    usageEvents.push({
      kind: utils.constants.CHANNEL_USAGE_KIND_TOOL,
      toolName: call.name,
      input: call.arguments,
      output: result,
      latencyMs
    });
    return text;
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    usageEvents.push({
      kind: utils.constants.CHANNEL_USAGE_KIND_TOOL,
      toolName: call.name,
      input: call.arguments,
      output: null,
      latencyMs,
      errorMessage: err?.message || String(err)
    });
    return `Error calling tool ${call.name}: ${err?.message || err}`;
  }
};

const extractToolText = (result: any): string => {
  const content = result?.content;
  if (!Array.isArray(content)) return JSON.stringify(result);
  const texts = content
    .filter((c: any) => c?.type === 'text' && typeof c.text === 'string')
    .map((c: any) => c.text);
  return texts.join('\n') || JSON.stringify(result);
};
