import OpenAI from 'openai';

export interface JsonSchemaDefinition {
  name: string;
  strict?: boolean;
  schema: Record<string, any>;
}

export interface CompletionOptions {
  systemPrompt: string;
  prompt: string;
  responseFormat?:
    | { type: 'json_object' }
    | { type: 'json_schema'; json_schema: JsonSchemaDefinition };
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface LLMClient {
  complete(options: CompletionOptions): Promise<string>;
}

export class LLMServiceError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'LLMServiceError';
  }
}

export interface OpenAIClientConfig {
  baseURL?: string;
  apiKey?: string;
  model?: string;
  defaultTimeoutMs?: number;
}

/**
 * Universal OpenAI-compatible LLM client.
 * Supports OpenAI Cloud (gpt-4o-mini), Groq, and local Ollama/vLLM endpoints.
 */
export class OpenAIClient implements LLMClient {
  private client: OpenAI;
  private model: string;
  private defaultTimeoutMs: number;

  constructor(config?: OpenAIClientConfig) {
    const baseURL = config?.baseURL || process.env.LLM_BASE_URL || undefined;
    const apiKey =
      config?.apiKey ||
      process.env.LLM_API_KEY ||
      process.env.OPENAI_API_KEY ||
      (baseURL ? 'local-no-key-required' : '');

    this.model = config?.model || process.env.LLM_MODEL || 'gpt-4o-mini';
    this.defaultTimeoutMs =
      config?.defaultTimeoutMs ??
      (process.env.LLM_TIMEOUT_MS ? parseInt(process.env.LLM_TIMEOUT_MS, 10) : 8000);

    this.client = new OpenAI({
      baseURL,
      apiKey: apiKey || 'dummy-key',
      timeout: this.defaultTimeoutMs
    });
  }

  async complete(options: CompletionOptions): Promise<string> {
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.prompt }
      ];

      const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 2048
      };

      if (options.responseFormat) {
        params.response_format = options.responseFormat as any;
      }

      const response = await this.client.chat.completions.create(params, {
        signal: controller.signal
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new LLMServiceError(502, 'LLM returned empty completion content');
      }

      return content;
    } catch (error: unknown) {
      if (error instanceof LLMServiceError) {
        throw error;
      }

      const err = error as any;
      if (err?.name === 'AbortError' || err?.message?.includes('aborted') || err?.code === 'ETIMEDOUT') {
        throw new LLMServiceError(504, `LLM completion timed out after ${timeoutMs}ms`, error);
      }

      if (err?.status) {
        throw new LLMServiceError(err.status, `LLM API returned status ${err.status}: ${err.message}`, error);
      }

      throw new LLMServiceError(502, `Failed to communicate with LLM endpoint: ${err?.message || 'Unknown error'}`, error);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export type MockHandler = (options: CompletionOptions) => Promise<string> | string;

/**
 * Deterministic Mock LLM client for offline unit & integration testing.
 */
export class MockLLMClient implements LLMClient {
  private customHandler?: MockHandler;
  private callHistory: CompletionOptions[] = [];

  constructor(handler?: MockHandler) {
    this.customHandler = handler;
  }

  setHandler(handler: MockHandler): void {
    this.customHandler = handler;
  }

  getCallHistory(): CompletionOptions[] {
    return [...this.callHistory];
  }

  clearHistory(): void {
    this.callHistory = [];
  }

  async complete(options: CompletionOptions): Promise<string> {
    this.callHistory.push(options);

    if (this.customHandler) {
      return this.customHandler(options);
    }

    // Default intelligent simulation based on prompt content
    const text = options.prompt.toLowerCase();
    const isCritic = options.systemPrompt.includes('Critic') || options.systemPrompt.includes('Validator');

    // Case 1: Photography content (novel emergent domain)
    if (text.includes('photo') || text.includes('aperture') || text.includes('camera') || text.includes('shutter')) {
      if (isCritic) {
        return JSON.stringify({
          approvedTopics: [
            {
              name: 'Exposure Triangle',
              category: 'PHOTOGRAPHY',
              summary: 'Interplay between aperture, shutter speed, and ISO to balance light in exposure.',
              proposedPrerequisites: []
            },
            {
              name: 'Depth of Field',
              category: 'PHOTOGRAPHY',
              summary: 'The zone of acceptable sharpness in a photo controlled primarily by lens aperture.',
              proposedPrerequisites: ['Exposure Triangle']
            }
          ],
          rejectedTopics: [
            { name: 'Photography Basics', reason: 'Too broad - discipline umbrella' },
            { name: 'Canon EOS R5 Dial', reason: 'Too narrow - specific camera hardware control' }
          ]
        });
      }

      return JSON.stringify({
        topics: [
          {
            name: 'Exposure Triangle',
            category: 'PHOTOGRAPHY',
            summary: 'Interplay between aperture, shutter speed, and ISO to balance light in exposure.',
            proposedPrerequisites: []
          },
          {
            name: 'Depth of Field',
            category: 'PHOTOGRAPHY',
            summary: 'The zone of acceptable sharpness in a photo controlled primarily by lens aperture.',
            proposedPrerequisites: ['Exposure Triangle']
          }
        ]
      });
    }

    // Case 2: General / AI / CS content
    if (isCritic) {
      return JSON.stringify({
        approvedTopics: [
          {
            name: 'Transformer Self-Attention',
            category: 'AI & ML',
            summary: 'Scaled dot-product mechanism enabling sequence modeling across context windows.',
            proposedPrerequisites: []
          },
          {
            name: 'Multi-Head Attention',
            category: 'AI & ML',
            summary: 'Parallel attention projections capturing distinct representation subspaces.',
            proposedPrerequisites: ['Transformer Self-Attention']
          }
        ],
        rejectedTopics: [
          { name: 'Artificial Intelligence', reason: 'Too broad - discipline umbrella' },
          { name: 'x = 5', reason: 'Too narrow - code variable assignment' }
        ]
      });
    }

    return JSON.stringify({
      topics: [
        {
          name: 'Transformer Self-Attention',
          category: 'AI & ML',
          summary: 'Scaled dot-product mechanism enabling sequence modeling across context windows.',
          proposedPrerequisites: []
        },
        {
          name: 'Multi-Head Attention',
          category: 'AI & ML',
          summary: 'Parallel attention projections capturing distinct representation subspaces.',
          proposedPrerequisites: ['Transformer Self-Attention']
        }
      ]
    });
  }
}

let globalClientOverride: LLMClient | null = null;

export function setGlobalLLMClient(client: LLMClient | null): void {
  globalClientOverride = client;
}

export function getLLMClient(customClient?: LLMClient): LLMClient {
  if (customClient) return customClient;
  if (globalClientOverride) return globalClientOverride;

  if (process.env.NODE_ENV === 'test') {
    return new MockLLMClient();
  }

  const hasApiKey = Boolean(process.env.LLM_API_KEY || process.env.OPENAI_API_KEY);
  const hasBaseUrl = Boolean(process.env.LLM_BASE_URL);

  if (hasApiKey || hasBaseUrl) {
    return new OpenAIClient();
  }

  // Safe fallback if no configuration is present
  return new MockLLMClient();
}
