import { GoogleGenAI } from '@google/genai';
import { db } from '@anju/db';
import { utils } from '@anju/utils';
import type { EnvSource } from '@anju/utils';
import { eq } from 'drizzle-orm';

import type { Bindings } from '../types';

type ApiEnvSource = EnvSource & { env: Bindings };

export type EmbeddingTaskType =
  | 'RETRIEVAL_DOCUMENT'
  | 'RETRIEVAL_QUERY'
  | 'SEMANTIC_SIMILARITY';

const buildHeader = (input: {
  title?: string | null;
  description?: string | null;
  uri?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
}): string =>
  [
    input.title ? `Title: ${input.title}` : null,
    input.description ? `Description: ${input.description}` : null,
    input.uri ? `URI: ${input.uri}` : null,
    input.mimeType ? `Mime: ${input.mimeType}` : null,
    input.fileName ? `FileName: ${input.fileName}` : null
  ]
    .filter(Boolean)
    .join('\n');

const splitRecursive = (text: string, target: number): string[] => {
  if (text.length <= target) return [text];

  const separators = ['\n\n', '\n', '. ', ' '];
  for (const sep of separators) {
    if (!text.includes(sep)) continue;
    const parts = text.split(sep);
    const chunks: string[] = [];
    let current = '';
    for (const part of parts) {
      const piece = current ? current + sep + part : part;
      if (piece.length > target && current) {
        chunks.push(current);
        current = part;
      } else {
        current = piece;
      }
    }
    if (current) chunks.push(current);
    return chunks.flatMap(chunk =>
      chunk.length > target ? splitRecursive(chunk, target) : [chunk]
    );
  }

  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += target) {
    chunks.push(text.slice(i, i + target));
  }
  return chunks;
};

const chunkText = (text: string): string[] => {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= utils.constants.CHUNK_TARGET_CHARS) return [trimmed];

  const rawChunks = splitRecursive(trimmed, utils.constants.CHUNK_TARGET_CHARS);
  const withOverlap: string[] = [];
  for (let i = 0; i < rawChunks.length; i++) {
    const prev =
      i > 0 ? rawChunks[i - 1].slice(-utils.constants.CHUNK_OVERLAP_CHARS) : '';
    withOverlap.push((prev ? prev + '\n' : '') + rawChunks[i]);
  }
  return withOverlap.filter(c => c.trim().length > 0);
};

const embedGemini = async (params: {
  apiKey: string;
  inputs: string[];
  taskType: EmbeddingTaskType;
}): Promise<number[][]> => {
  const ai = new GoogleGenAI({ apiKey: params.apiKey });
  const response = await ai.models.embedContent({
    model: utils.constants.EMBEDDING_MODEL,
    contents: params.inputs,
    config: { taskType: params.taskType }
  });

  const items = response.embeddings;
  if (!Array.isArray(items)) {
    throw new Error('Gemini embedding response missing embeddings array');
  }

  return items.map(item => {
    if (!item.values) throw new Error('Gemini embedding missing values');
    if (item.values.length !== utils.constants.EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Gemini returned ${item.values.length} dims; expected ${utils.constants.EMBEDDING_DIMENSIONS}.`
      );
    }
    return item.values;
  });
};

export const generateEmbeddings = async (
  source: ApiEnvSource,
  inputs: string[],
  taskType: EmbeddingTaskType = 'RETRIEVAL_DOCUMENT'
): Promise<number[][] | null> => {
  const apiKey = utils.getEnv(source, 'EMBEDDING_API_KEY');
  if (!apiKey || inputs.length === 0) return null;

  const out: number[][] = [];
  for (let i = 0; i < inputs.length; i += utils.constants.EMBED_BATCH_SIZE) {
    const batch = inputs.slice(i, i + utils.constants.EMBED_BATCH_SIZE);
    const embeddings = await embedGemini({ apiKey, inputs: batch, taskType });
    out.push(...embeddings);
  }
  return out;
};

export const generateEmbedding = async (
  source: ApiEnvSource,
  text: string,
  taskType: EmbeddingTaskType = 'RETRIEVAL_QUERY'
): Promise<number[] | null> => {
  if (!text.trim()) return null;
  const embeddings = await generateEmbeddings(source, [text], taskType);
  return embeddings?.[0] ?? null;
};

export const reindexResourceChunks = async (
  source: ApiEnvSource,
  resource: {
    id: string;
    artifactId: string;
    title?: string | null;
    description?: string | null;
    uri?: string | null;
    mimeType?: string | null;
    fileName?: string | null;
    content?: string | null;
  }
): Promise<void> => {
  const header = buildHeader(resource);
  const body = (resource.content || '').trim();
  const fullText = [header, body].filter(Boolean).join('\n\n');
  const chunks = chunkText(fullText);

  const dbInstance = db.create(source);

  if (chunks.length === 0) {
    await dbInstance
      .delete(db.schema.artifactResourceChunk)
      .where(eq(db.schema.artifactResourceChunk.resourceId, resource.id));
    return;
  }

  const embeddings = await generateEmbeddings(
    source,
    chunks,
    'RETRIEVAL_DOCUMENT'
  );
  if (!embeddings) return;

  await dbInstance.transaction(async tx => {
    await tx
      .delete(db.schema.artifactResourceChunk)
      .where(eq(db.schema.artifactResourceChunk.resourceId, resource.id));

    await tx.insert(db.schema.artifactResourceChunk).values(
      chunks.map((content, index) => ({
        resourceId: resource.id,
        artifactId: resource.artifactId,
        chunkIndex: index,
        content,
        embedding: embeddings[index]
      }))
    );
  });
};
