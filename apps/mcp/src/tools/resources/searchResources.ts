import { db } from '@anju/db';
import { eq, sql } from 'drizzle-orm';

import { ToolDefinition } from '../types';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

export const searchResources: ToolDefinition = {
  title: 'Search Resources',
  description:
    'Semantic search over the resources available to this MCP server. Returns the chunks most relevant to the natural-language query, ranked by cosine similarity. Prefer this over list-resources when you are looking for specific content rather than enumerating everything.',
  schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'Natural language description of what to find (e.g. "shipping policy", "Q3 revenue numbers").'
      },
      limit: {
        type: 'number',
        description: `Maximum number of chunks to return (1-${MAX_LIMIT}). Defaults to ${DEFAULT_LIMIT}.`
      }
    },
    required: ['query']
  },
  handler: async (args, context) => {
    const query = String(args.query || '').trim();
    if (!query) {
      return {
        content: [{ type: 'text', text: 'Query is required.' }]
      };
    }

    const requestedLimit = Number(args.limit) || DEFAULT_LIMIT;
    const limit = Math.max(1, Math.min(MAX_LIMIT, requestedLimit));

    const queryEmbedding = await context.embedQuery(query);
    if (!queryEmbedding) {
      return {
        content: [
          {
            type: 'text',
            text: 'Embedding service is not configured (set EMBEDDING_API_KEY).'
          }
        ]
      };
    }

    const literal = `[${queryEmbedding.join(',')}]`;
    const distanceExpr = sql<number>`${db.schema.artifactResourceChunk.embedding} <=> ${literal}::halfvec`;

    const rows = await context.db
      .select({
        resourceId: db.schema.artifactResourceChunk.resourceId,
        chunkIndex: db.schema.artifactResourceChunk.chunkIndex,
        content: db.schema.artifactResourceChunk.content,
        uri: db.schema.artifactResource.uri,
        title: db.schema.artifactResource.title,
        description: db.schema.artifactResource.description,
        mimeType: db.schema.artifactResource.mimeType,
        distance: distanceExpr
      })
      .from(db.schema.artifactResourceChunk)
      .innerJoin(
        db.schema.artifactResource,
        eq(
          db.schema.artifactResource.id,
          db.schema.artifactResourceChunk.resourceId
        )
      )
      .where(eq(db.schema.artifactResourceChunk.artifactId, context.artifactId))
      .orderBy(distanceExpr)
      .limit(limit);

    if (rows.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No matching resource chunks found. Resources may not be indexed yet.'
          }
        ]
      };
    }

    const results = rows.map(row => ({
      uri: row.uri,
      title: row.title,
      description: row.description || undefined,
      mimeType: row.mimeType,
      chunkIndex: row.chunkIndex,
      score: Number((1 - Number(row.distance)).toFixed(4)),
      excerpt: row.content
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify(results) }]
    };
  }
};
