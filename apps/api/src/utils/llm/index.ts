import { utils } from '@anju/utils';

import { openAiAdapter } from './openai';
import { anthropicAdapter } from './anthropic';

import type { LlmAdapter } from './types';

export const getLlmAdapter = (provider: string): LlmAdapter => {
  if (provider === utils.constants.LLM_PROVIDER_ANTHROPIC) {
    return anthropicAdapter;
  }

  if (
    provider === utils.constants.LLM_PROVIDER_OPENAI ||
    provider === utils.constants.LLM_PROVIDER_OPENAI_COMPATIBLE ||
    provider === utils.constants.LLM_PROVIDER_GOOGLE
  ) {
    return openAiAdapter;
  }

  throw new Error(`Unsupported LLM provider: ${provider}`);
};

export type {
  LlmAdapter,
  LlmAdapterInput,
  LlmCompletion,
  LlmMessage,
  LlmToolCall,
  LlmToolDefinition,
  LlmStopReason,
  LlmUsage
} from './types';
