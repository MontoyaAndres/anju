import { utils } from '@anju/utils';
import type {
  LlmAdapter,
  LlmAdapterInput,
  LlmCompletion,
  LlmMessage,
  LlmStopReason,
  LlmToolCall
} from './types';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

interface OpenAiToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
}

const toOpenAiMessages = (
  systemPrompt: string | null | undefined,
  messages: LlmMessage[]
): OpenAiMessage[] => {
  const result: OpenAiMessage[] = [];
  if (systemPrompt)
    result.push({
      role: utils.constants.ROLE_MESSAGE_SYSTEM,
      content: systemPrompt
    });

  for (const msg of messages) {
    if (
      msg.role === utils.constants.ROLE_MESSAGE_ASSISTANT &&
      msg.toolCalls?.length
    ) {
      result.push({
        role: utils.constants.ROLE_MESSAGE_ASSISTANT,
        content: msg.content || null,
        tool_calls: msg.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments)
          }
        }))
      });
      continue;
    }

    if (msg.role === utils.constants.ROLE_MESSAGE_TOOL) {
      result.push({
        role: utils.constants.ROLE_MESSAGE_TOOL,
        content: msg.content,
        tool_call_id: msg.toolCallId
      });
      continue;
    }

    result.push({ role: msg.role, content: msg.content });
  }

  return result;
};

const mapFinishReason = (reason: string | undefined): LlmStopReason => {
  if (reason === 'tool_calls') return 'tool_use';
  if (reason === 'length') return 'max_tokens';
  if (reason === 'stop') return 'end_turn';
  return 'end_turn';
};

export const openAiAdapter: LlmAdapter = {
  complete: async (input: LlmAdapterInput): Promise<LlmCompletion> => {
    const baseUrl = (input.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
    const url = `${baseUrl}/chat/completions`;

    const body: Record<string, unknown> = {
      model: input.model,
      messages: toOpenAiMessages(input.systemPrompt, input.messages),
      ...(input.config || {})
    };

    if (input.tools.length > 0) {
      body.tools = input.tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema
        }
      }));
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${input.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM request failed: ${response.status} ${error}`);
    }

    const data: any = await response.json();
    const choice = data.choices?.[0];
    const message = choice?.message || {};

    const toolCalls: LlmToolCall[] = Array.isArray(message.tool_calls)
      ? message.tool_calls.map((tc: OpenAiToolCall) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments
            ? JSON.parse(tc.function.arguments)
            : {}
        }))
      : [];

    return {
      assistant: {
        content: message.content || '',
        toolCalls
      },
      usage: {
        tokensIn: data.usage?.prompt_tokens,
        tokensOut: data.usage?.completion_tokens
      },
      stopReason: mapFinishReason(choice?.finish_reason)
    };
  }
};
