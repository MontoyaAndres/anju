import { Context } from 'hono';
import { GoogleGenAI } from '@google/genai';
import { utils } from '@anju/utils';

export type EmbeddingTaskType =
  | 'RETRIEVAL_DOCUMENT'
  | 'RETRIEVAL_QUERY'
  | 'SEMANTIC_SIMILARITY';

export const generateEmbedding = async (
  c: Context,
  text: string,
  taskType: EmbeddingTaskType = 'RETRIEVAL_QUERY'
): Promise<number[] | null> => {
  const apiKey = utils.getEnv(c, 'EMBEDDING_API_KEY');
  if (!apiKey || !text.trim()) return null;

  return utils.withRateLimitRetry(async () => {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.embedContent({
      model: utils.constants.EMBEDDING_MODEL,
      contents: text,
      config: { taskType }
    });

    const values = response.embeddings?.[0]?.values;
    if (!Array.isArray(values)) return null;
    if (values.length !== utils.constants.EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Gemini returned ${values.length} dims; expected ${utils.constants.EMBEDDING_DIMENSIONS}.`
      );
    }
    return values;
  });
};
