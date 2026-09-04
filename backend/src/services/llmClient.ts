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
      (process.env.LLM_TIMEOUT_MS ? parseInt(process.env.LLM_TIMEOUT_MS, 10) : 20000);

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

    const sys = options.systemPrompt.toLowerCase();
    const text = options.prompt.toLowerCase();

    // 1. Note Critic / Coverage Auditor
    if (sys.includes('note critic') || sys.includes('coverage auditor') || sys.includes('note quality critic')) {
      // Simulate pass unless prompt specifically indicates failure test
      const shouldFail = text.includes('force_critic_fail');
      return JSON.stringify({
        passed: !shouldFail,
        coverageScore: shouldFail ? 65 : 98,
        missingConcepts: shouldFail ? ['Scaling Factor 1/sqrt(d_k)'] : [],
        hallucinations: [],
        syntaxErrors: [],
        feedback: shouldFail
          ? 'Missing the scaling factor 1/sqrt(d_k) in mathematical formulation. Please include it.'
          : 'High fidelity coverage of all core concepts with valid LaTeX and clear code implementations.'
      });
    }

    // 2. Note Generator
    if (sys.includes('note generator') || sys.includes('study note author') || sys.includes('study note architect')) {
      const topic = text.includes('photo') || text.includes('exposure')
        ? 'Exposure Triangle'
        : 'Transformer Self-Attention';

      return `# ${topic}

> **Prerequisites**: [[Linear Algebra]], [[Deep Learning Fundamentals]]  
> **Key Metric / Guarantee**: $\\mathcal{O}(N^2)$ pairwise attention complexity

---

## 1. Problem Context & The "Why"
Traditional Recurrent Neural Networks (RNNs and LSTMs) processed sequences sequentially step-by-step ($h_t = f(h_{t-1}, x_t)$). This created a severe computational bottleneck that prohibited parallelization across GPU clusters and suffered from vanishing gradients across long token distances ($N > 512$).

## 2. Conceptual Core & Mental Model
The core mechanism replaces sequential recurrence with dynamic, content-based relational affinity weighting. Think of an information retrieval search engine: a Query token searches across a catalog of Key tokens to compute relevance scores, which are then used to compute a weighted sum over the Value payloads.

\`\`\`mermaid
flowchart LR
    Q[Queries Q] --> S[Scaled Dot-Product Similarity]
    K[Keys K] --> S
    S --> W[Attention Weights Matrix]
    V[Values V] --> M[Weighted Aggregation]
    W --> M
    M --> O[Contextual Representations]
\`\`\`

## 3. Formal Deep-Dive Specification
Given query matrix $Q \\in \\mathbb{R}^{N \\times d_k}$, key matrix $K \\in \\mathbb{R}^{N \\times d_k}$, and value matrix $V \\in \\mathbb{R}^{N \\times d_v}$:

$$
\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V
$$

The scaling factor $\\frac{1}{\\sqrt{d_k}}$ prevents large dot-product magnitudes from pushing the softmax function into regions with near-zero gradients.

## 4. Algorithmic Logic & Pseudocode
\`\`\`text
ALGORITHM ScaledDotProductAttention(Q, K, V, mask):
    INPUT: Matrices Q, K, V with dimension d_k; optional causal or padding mask
    OUTPUT: Contextual representation matrix
    
    // 1. Compute pairwise raw token affinities scaled by dimension
    scores := MATMUL(Q, TRANSPOSE(K)) / SQRT(d_k)
    
    // 2. Inhibit invalid positions (e.g. future tokens in autoregressive decoding)
    IF mask IS NOT null THEN
        scores := MASK_FILL(scores, mask == 0, -INFINITY)
    END IF
    
    // 3. Normalize affinities into probability distribution across keys
    attention_weights := SOFTMAX(scores, axis=-1)
    
    // 4. Compute weighted sum over value vectors
    RETURN MATMUL(attention_weights, V)
\`\`\`

## 5. Step-by-Step Worked Trace / Execution Flow
\`\`\`mermaid
sequenceDiagram
    autonumber
    participant Input as Input Embeddings
    participant Proj as Linear Projections (Wq, Wk, Wv)
    participant Core as Scaled Attention Core
    participant Output as Final Representation

    Input->>Proj: Forward pass sequence tokens [N x d_model]
    Proj->>Core: Emit Query (Q), Key (K), Value (V) matrices
    Core->>Core: Compute pairwise affinity: S = Q * K^T / sqrt(d_k)
    Core->>Core: Probability distribution: P = Softmax(S)
    Core->>Core: Weighted summation: Output = P * V
    Core->>Output: Emit context-aware representations [N x d_v]
\`\`\`

1. **Projection**: Input embeddings are projected through linear weight matrices $W_Q, W_K, W_V$.
2. **Affinity Computation**: Pairwise dot products $QK^T$ produce an unnormalized similarity matrix of size $[N \\times N]$.
3. **Scaling**: Divide scores by $\\sqrt{d_k}$ to stabilize gradient magnitudes.
4. **Softmax Normalization**: Softmax across the row dimension turns raw affinities into probabilities summing to $1.0$.
5. **Weighted Aggregation**: Multiply weights by $V$ to produce the contextual representation matrix.

## 6. Trade-Offs, Alternatives & Decision Matrix
| Mechanism | Time Complexity | Sequential Operations | Maximum Path Length |
| :--- | :--- | :--- | :--- |
| **Self-Attention** | $\\mathcal{O}(N^2 \\cdot d)$ | $\\mathcal{O}(1)$ | $\\mathcal{O}(1)$ |
| **Recurrent (LSTM)** | $\\mathcal{O}(N \\cdot d^2)$ | $\\mathcal{O}(N)$ | $\\mathcal{O}(N)$ |
| **Convolutional** | $\\mathcal{O}(k \\cdot N \\cdot d^2)$ | $\\mathcal{O}(1)$ | $\\mathcal{O}(\\log_k(N))$ |

- **Use Self-Attention When**: Training on high-throughput GPU clusters with sequences where capturing long-range global dependencies in $\\mathcal{O}(1)$ steps is critical.
- **Avoid When**: Extremely long sequence lengths ($N > 100,000$) where quadratic memory $\\mathcal{O}(N^2)$ exhausts VRAM without sparse/linear approximations (e.g., FlashAttention, State-Space Models).

## 7. Failure Modes, Edge Cases & Common Pitfalls
- **Quadratic Memory Explosion**: Full attention matrices consume prohibitive GPU memory for large contexts.
- **Permutation Invariance**: Without explicit Positional Encodings (RoPE, sinusoidal, or learned), self-attention treats sequences as unordered bags of words.
- **Causal Leakage**: In autoregressive generative models (GPT), failing to apply an upper-triangular causal mask causes future token leakage during training.

## 8. Summary & Key Takeaways Checklist
- [x] Scaled dot-product maps queries and keys to attention probabilities.
- [x] Division by $\\sqrt{d_k}$ stabilizes gradient magnitude.
- [x] Parallel matrix multiplication eliminates RNN step latency.
- [x] Positional encodings are mandatory to inject sequence order.`;
    }

    // 3. Quiz Critic / Answer Key Auditor
    if (sys.includes('quiz critic') || sys.includes('quiz auditor') || sys.includes('assessment auditor')) {
      const shouldFail = text.includes('force_quiz_critic_fail');
      return JSON.stringify({
        passed: !shouldFail,
        coverageScore: shouldFail ? 60 : 96,
        untestedSections: shouldFail ? ['Section 4: Key Caveats'] : [],
        flawedQuestions: shouldFail ? [{ index: 0, reason: 'Ambiguous wording in option C' }] : [],
        feedback: shouldFail
          ? 'Section 4 edge cases are untested and question 1 has ambiguous distractors.'
          : 'Thorough coverage of all sections with unambiguous single correct answers.'
      });
    }

    // 4. Quiz Generator
    if (sys.includes('quiz generator') || sys.includes('assessment architect')) {
      return JSON.stringify({
        questions: [
          {
            type: 'MCQ',
            prompt: 'Why is the dot-product scaled by 1/sqrt(d_k) in scaled dot-product attention?',
            payload: {
              options: [
                { id: 'A', text: 'To normalize the sequence length so all tokens have equal probability' },
                { id: 'B', text: 'To prevent the dot products from growing large in magnitude, which pushes softmax into regions with extremely small gradients' },
                { id: 'C', text: 'To enforce causal masking across downstream autoregressive tokens' },
                { id: 'D', text: 'To compress the representation dimensionality into a compact subspace' }
              ],
              distractorExplanations: {
                A: 'Normalization by sequence length is handled by softmax, not the square root of key dimension.',
                C: 'Causal masking is achieved by adding a large negative mask matrix, not by key dimension scaling.',
                D: 'Dimensionality reduction is performed via linear projection matrices W_Q, W_K, W_V, not the scaling factor.'
              }
            },
            correctAnswer: 'B',
            explanation: 'For large values of d_k, the dot products grow large in magnitude, pushing the softmax function into regions where it has extremely small gradients. Dividing by sqrt(d_k) counters this effect.',
            difficulty: 'HARD',
            sourceAssertion: 'Division by sqrt(d_k) stabilizes gradient magnitude in softmax.'
          },
          {
            type: 'TRUE_FALSE',
            prompt: 'Standard bidirectional self-attention inherently scales with linear memory complexity O(N) with respect to input sequence length N.',
            payload: {
              statement: 'Standard bidirectional self-attention scales with linear memory complexity O(N).',
              isTrue: false
            },
            correctAnswer: 'False',
            explanation: 'False. The full attention matrix computes pairwise similarities between all N tokens against all N tokens, requiring O(N^2) memory complexity.',
            difficulty: 'MEDIUM',
            sourceAssertion: 'Quadratic Complexity: Memory complexity scales as O(N^2) with sequence length N.'
          },
          {
            type: 'MATCHING',
            prompt: 'Match each attention component to its operational role in the architecture:',
            payload: {
              pairs: [
                { term: 'Query (Q)', definition: 'Vector representing the current token seeking relevant context' },
                { term: 'Key (K)', definition: 'Vector representing candidate tokens against which affinities are scored' },
                { term: 'Value (V)', definition: 'Vector containing the actual representation payload to be aggregated' },
                { term: 'Causal Mask', definition: 'Upper-triangular negative mask preventing future token leakage' }
              ]
            },
            correctAnswer: 'All 4 pairs mapped correctly',
            explanation: 'Queries search against Keys to generate weights that aggregate Values, while Causal Mask enforces autoregressive ordering.',
            difficulty: 'MEDIUM',
            sourceAssertion: 'Scaled dot-product mechanism'
          },
          {
            type: 'ORDERING',
            prompt: 'Order the chronological execution steps of Scaled Dot-Product Attention from first to last:',
            payload: {
              items: [
                'Linearly project input embeddings to obtain Q, K, and V matrices',
                'Compute matrix multiplication of Q with transposed K (QK^T)',
                'Scale dot-product scores by 1/sqrt(d_k)',
                'Apply optional mask and compute softmax across key dimension',
                'Multiply attention weight matrix by Value matrix V'
              ],
              correctOrder: [0, 1, 2, 3, 4],
              orderedSequence: [
                'Linearly project input embeddings to obtain Q, K, and V matrices',
                'Compute matrix multiplication of Q with transposed K (QK^T)',
                'Scale dot-product scores by 1/sqrt(d_k)',
                'Apply optional mask and compute softmax across key dimension',
                'Multiply attention weight matrix by Value matrix V'
              ]
            },
            correctAnswer: '1 -> 2 -> 3 -> 4 -> 5',
            explanation: 'The pipeline computes projections -> dot product -> scaling -> softmax weights -> value aggregation.',
            difficulty: 'HARD',
            sourceAssertion: 'Scaled dot product execution flow'
          }
        ]
      });
    }

    // 5. Topic Critic / Extraction
    const isCritic =
      sys.includes('quality critic') ||
      sys.includes('taxonomy auditor') ||
      (options.systemPrompt.includes('Critic') && !options.systemPrompt.includes('curriculum architect'));

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
