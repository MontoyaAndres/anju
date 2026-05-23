import { Context } from 'hono';
import { eq, sql, and } from 'drizzle-orm';
import { db } from '@anju/db';
import { utils } from '@anju/utils';

import type { AppEnv } from '../types';

export interface PendingRequest {
  method: string;
  toolName?: string | null;
  resourceUri?: string | null;
  promptId?: string | null;
  input: unknown;
  output?: unknown;
  latencyMs?: number | null;
  errorMessage?: string | null;
  artifactToolId?: string | null;
  artifactResourceId?: string | null;
  artifactPromptId?: string | null;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

// JSON-RPC bodies can be a single object or an array (batch). Notifications
// (no `id`) don't expect a response and don't really represent usage; we still
// log them so the audit trail matches what the client sent.
export const parseJsonRpcMessages = (body: unknown): JsonRpcRequest[] => {
  if (!body) return [];
  const items = Array.isArray(body) ? body : [body];
  return items.filter(
    (item): item is JsonRpcRequest =>
      !!item &&
      typeof item === 'object' &&
      typeof (item as JsonRpcRequest).method === 'string'
  );
};

// Methods we record from the parsed body alone (we don't intercept the SDK's
// auto-handlers, so we won't have output detail — just acknowledge they ran).
const BODY_ONLY_METHODS = new Set<string>([
  utils.constants.MCP_REQUEST_METHOD_INITIALIZE,
  utils.constants.MCP_REQUEST_METHOD_PING,
  utils.constants.MCP_REQUEST_METHOD_TOOLS_LIST,
  utils.constants.MCP_REQUEST_METHOD_RESOURCES_LIST,
  utils.constants.MCP_REQUEST_METHOD_RESOURCES_TEMPLATES_LIST,
  utils.constants.MCP_REQUEST_METHOD_PROMPTS_LIST
]);

export const collectBodyOnlyRequests = (
  messages: JsonRpcRequest[]
): PendingRequest[] =>
  messages
    .filter(m => BODY_ONLY_METHODS.has(m.method))
    .map(m => ({
      method: m.method,
      input: m.params ?? null,
      output: null,
      latencyMs: null
    }));

// Best-effort parse of the MCP client identity from User-Agent. Real clients
// (Claude Desktop, mcp-inspector, etc.) follow product-token form
// `name/version (extra)`; fall back to a truncated raw UA otherwise so we
// always have something searchable.
export const parseClient = (
  userAgent: string | undefined | null
): { name: string | null; version: string | null } => {
  if (!userAgent) return { name: null, version: null };
  const match = userAgent.match(/^([A-Za-z0-9._-]+)\/(\S+)/);
  if (match) return { name: match[1], version: match[2] };
  return { name: userAgent.slice(0, 64), version: null };
};

// Stable session key for grouping requests. Real clients echo the
// `mcp-session-id` header issued on `initialize`; for stateless clients we
// fall back to a synthetic per-hour bucket keyed by user + UA so a single
// client doesn't create a new row on every request.
export const resolveExternalSessionId = (
  c: Context<AppEnv>,
  artifactId: string,
  userId: string | undefined,
  userAgent: string | null
): string => {
  const header = c.req.header(utils.constants.MCP_SESSION_HEADER);
  if (header) return header;
  const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
  return `synthetic:${artifactId}:${userId ?? 'machine'}:${
    userAgent ?? 'unknown'
  }:${hourBucket}`;
};

interface SessionInput {
  artifactId: string;
  externalSessionId: string;
  authKind: string;
  userId: string | undefined;
  userAgent: string | null;
  ipAddress: string | null;
  clientName: string | null;
  clientVersion: string | null;
}

export const upsertSession = async (
  dbInstance: ReturnType<typeof db.create>,
  input: SessionInput
): Promise<{ id: string }> => {
  const [existing] = await dbInstance
    .select({ id: db.schema.mcpSession.id })
    .from(db.schema.mcpSession)
    .where(
      and(
        eq(db.schema.mcpSession.artifactId, input.artifactId),
        eq(db.schema.mcpSession.externalSessionId, input.externalSessionId)
      )
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await dbInstance
    .insert(db.schema.mcpSession)
    .values({
      artifactId: input.artifactId,
      externalSessionId: input.externalSessionId,
      authKind: input.authKind,
      userId: input.userId ?? null,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      clientName: input.clientName,
      clientVersion: input.clientVersion
    })
    .onConflictDoNothing({
      target: [
        db.schema.mcpSession.artifactId,
        db.schema.mcpSession.externalSessionId
      ]
    })
    .returning({ id: db.schema.mcpSession.id });

  if (created) return created;

  const [refetched] = await dbInstance
    .select({ id: db.schema.mcpSession.id })
    .from(db.schema.mcpSession)
    .where(
      and(
        eq(db.schema.mcpSession.artifactId, input.artifactId),
        eq(db.schema.mcpSession.externalSessionId, input.externalSessionId)
      )
    )
    .limit(1);

  if (!refetched) throw new Error('Failed to upsert mcpSession');
  return refetched;
};

export const flushRequests = async (
  dbInstance: ReturnType<typeof db.create>,
  sessionId: string,
  requests: PendingRequest[]
): Promise<void> => {
  if (requests.length === 0) return;

  await dbInstance.insert(db.schema.mcpRequest).values(
    requests.map(r => ({
      sessionId,
      method: r.method,
      toolName: r.toolName ?? null,
      resourceUri: r.resourceUri ?? null,
      promptId: r.promptId ?? null,
      input: (r.input as Record<string, unknown>) ?? null,
      output: (r.output as Record<string, unknown>) ?? null,
      latencyMs: r.latencyMs ?? null,
      errorMessage: r.errorMessage ?? null,
      artifactToolId: r.artifactToolId ?? null,
      artifactResourceId: r.artifactResourceId ?? null,
      artifactPromptId: r.artifactPromptId ?? null
    }))
  );

  await dbInstance
    .update(db.schema.mcpSession)
    .set({
      requestCount: sql`(${db.schema.mcpSession.requestCount}::int + ${requests.length})::int`,
      lastRequestAt: new Date()
    })
    .where(eq(db.schema.mcpSession.id, sessionId));
};
