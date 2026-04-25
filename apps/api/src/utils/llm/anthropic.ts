import { utils } from '@anju/utils';
import type {
  LlmAdapter,
  LlmAdapterInput,
  LlmCompletion,
  LlmMessage,
  LlmStopReason,
  LlmToolCall
} from './types';

const DEFAULT_BASE_URL = 'https://api.anthropic.com/v1';
const DEFAULT_MAX_TOKENS = 4096;

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'tool_use';
      id: string;
      name: string;
      input: Record<string, unknown>;
    }
  | {
      type: 'tool_result';
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    };

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: AnthropicContentBlock[];
}

const toAnthropicMessages = (messages: LlmMessage[]): AnthropicMessage[] => {
  const result: AnthropicMessage[] = [];

  for (const msg of messages) {
    if (msg.role === utils.constants.ROLE_MESSAGE_SYSTEM) continue;

    if (msg.role === utils.constants.ROLE_MESSAGE_ASSISTANT) {
      const content: AnthropicContentBlock[] = [];
      if (msg.content) content.push({ type: 'text', text: msg.content });
      if (msg.toolCalls?.length) {
        for (const tc of msg.toolCalls) {
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.arguments
          });
        }
      }
      result.push({
        role: utils.constants.ROLE_MESSAGE_ASSISTANT,
        content
      });
      continue;
    }

    if (msg.role === utils.constants.ROLE_MESSAGE_TOOL) {
      const last = result[result.length - 1];
      const block: AnthropicContentBlock = {
        type: 'tool_result',
        tool_use_id: msg.toolCallId || '',
        content: msg.content
      };
      if (last && last.role === utils.constants.ROLE_MESSAGE_USER) {
        last.content.push(block);
      } else {
        result.push({
          role: utils.constants.ROLE_MESSAGE_USER,
          content: [block]
        });
      }
      continue;
    }

    result.push({
      role: utils.constants.ROLE_MESSAGE_USER,
      content: [{ type: 'text', text: msg.content }]
    });
  }

  return result;
};

const mapStopReason = (reason: string | undefined): LlmStopReason => {
  if (reason === 'tool_use') return 'tool_use';
  if (reason === 'max_tokens') return 'max_tokens';
  if (reason === 'end_turn' || reason === 'stop_sequence') return 'end_turn';
  return 'end_turn';
};

export const anthropicAdapter: LlmAdapter = {
  complete: async (input: LlmAdapterInput): Promise<LlmCompletion> => {
    const baseUrl = (input.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
    const url = `${baseUrl}/messages`;

    const body: Record<string, unknown> = {
      model: input.model,
      max_tokens: (input.config as any)?.max_tokens || DEFAULT_MAX_TOKENS,
      messages: toAnthropicMessages(input.messages),
      ...(input.config || {})
    };

    if (input.systemPrompt) body.system = input.systemPrompt;

    if (input.tools.length > 0) {
      body.tools = input.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema
      }));
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': input.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM request failed: ${response.status} ${error}`);
    }

    const data: any = await response.json();
    const blocks: AnthropicContentBlock[] = data.content || [];

    let text = '';
    const toolCalls: LlmToolCall[] = [];

    for (const block of blocks) {
      if (block.type === 'text') {
        text += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input || {}
        });
      }
    }

    return {
      assistant: { content: text, toolCalls },
      usage: {
        tokensIn: data.usage?.input_tokens,
        tokensOut: data.usage?.output_tokens
      },
      stopReason: mapStopReason(data.stop_reason)
    };
  }
};
