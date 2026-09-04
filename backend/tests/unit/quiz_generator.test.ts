import { describe, it, expect } from 'vitest';
import {
  generateSingleTopicQuiz,
  generateTopicQuizzes,
  validateQuizQuestions
} from '../../src/services/quizGenerator.js';
import { MockLLMClient } from '../../src/services/llmClient.js';
import { GeneratedNote, GeneratedQuizQuestion } from '../../src/types.js';

describe('Unit: Quiz Generator Service (src/services/quizGenerator.ts)', () => {
  const sampleNote: GeneratedNote = {
    title: 'Transformer Self-Attention',
    topicName: 'Transformer Self-Attention',
    content: `# Transformer Self-Attention

> **Prerequisites**: [[Linear Algebra]], [[Deep Learning Fundamentals]]  
> **Key Metric / Guarantee**: $\\mathcal{O}(N^2)$ pairwise attention complexity

---

## 1. Problem Context & The "Why"
Sequential recurrence in RNNs prevented parallelization across GPUs and suffered from vanishing gradients across long contexts.

## 2. Conceptual Core & Mental Model
Scaled dot-product attention computes token affinities using queries, keys, and values.

## 3. Formal Deep-Dive Specification
$$\\text{Attention}(Q,K,V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$
The scaling factor $1/\\sqrt{d_k}$ prevents vanishing softmax gradients.

## 4. Concrete Implementation & Code Patterns
\`\`\`python
scores = torch.matmul(Q, K.T) / (d_k ** 0.5)
\`\`\`

## 5. Step-by-Step Worked Trace / Execution Flow
1. Project inputs to Q, K, V.
2. Compute similarity matrix $QK^T$.
3. Scale and normalize with softmax.
4. Aggregate values.

## 6. Trade-Offs, Alternatives & Decision Matrix
| Mechanism | Time Complexity | Sequential Ops |
| :--- | :--- | :--- |
| **Self-Attention** | $\\mathcal{O}(N^2 \\cdot d)$ | $\\mathcal{O}(1)$ |
| **RNN** | $\\mathcal{O}(N \\cdot d^2)$ | $\\mathcal{O}(N)$ |

- **Use When**: High-throughput parallel training on sequence data.
- **Avoid When**: Ultra-long contexts without sparse attention approximations.

## 7. Failure Modes, Edge Cases & Common Pitfalls
Memory scales quadratically $\\mathcal{O}(N^2)$ with sequence length. Causal leakage occurs without triangular masks.

## 8. Summary & Key Takeaways Checklist
- [x] Division by sqrt(d_k) stabilizes softmax gradients.
- [x] Attention removes sequential recurrent dependencies.`
  };

  describe('Question Integrity & Taxonomy Validation', () => {
    it('passes valid question sets containing MCQ, True/False, Matching, and Ordering', () => {
      const questions: GeneratedQuizQuestion[] = [
        {
          type: 'MCQ',
          prompt: 'What does the scaling factor 1/sqrt(d_k) prevent?',
          payload: {
            options: [
              { id: 'A', text: 'Vanishing gradients in softmax' },
              { id: 'B', text: 'Exploding activations in layer norm' },
              { id: 'C', text: 'Information leakage across causal mask' }
            ],
            distractorExplanations: {
              B: 'Layer norm handles its own normalization independently.',
              C: 'Causal masking handles token leakage.'
            }
          },
          correctAnswer: 'A',
          explanation: 'It counteracts large dot products pushing softmax into saturated small gradient regions.',
          difficulty: 'MEDIUM'
        },
        {
          type: 'TRUE_FALSE',
          prompt: 'Self-attention has linear time complexity with sequence length.',
          payload: {
            statement: 'Self-attention scales linearly with sequence length.',
            isTrue: false
          },
          correctAnswer: 'False',
          explanation: 'Pairwise comparison between N tokens requires O(N^2) complexity.',
          difficulty: 'EASY'
        },
        {
          type: 'MATCHING',
          prompt: 'Match attention vectors to their roles:',
          payload: {
            pairs: [
              { term: 'Query', definition: 'Current token representation seeking context' },
              { term: 'Key', definition: 'Tokens being matched against queries' }
            ]
          },
          correctAnswer: 'Mapped pairs',
          explanation: 'Queries match against Keys.',
          difficulty: 'MEDIUM'
        },
        {
          type: 'ORDERING',
          prompt: 'Order the execution steps:',
          payload: {
            items: ['Project embeddings to Q,K,V', 'Dot product QK^T', 'Scale by 1/sqrt(d_k)'],
            correctOrder: [0, 1, 2],
            orderedSequence: ['Project embeddings to Q,K,V', 'Dot product QK^T', 'Scale by 1/sqrt(d_k)']
          },
          correctAnswer: '1 -> 2 -> 3',
          explanation: 'Projections precede similarity computations.',
          difficulty: 'HARD'
        }
      ];

      const result = validateQuizQuestions(questions);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects MCQs with invalid or non-matching correctAnswer', () => {
      const invalidMCQ: GeneratedQuizQuestion[] = [
        {
          type: 'MCQ',
          prompt: 'Question?',
          payload: {
            options: [
              { id: 'A', text: 'Option A' },
              { id: 'B', text: 'Option B' }
            ]
          },
          correctAnswer: 'Z', // Invalid option ID
          explanation: 'Explanation',
          difficulty: 'MEDIUM'
        }
      ];

      const result = validateQuizQuestions(invalidMCQ);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('does not match any option ID'))).toBe(true);
    });

    it('rejects flashcard questions that lack a valid memorizationReason', () => {
      const invalidFlashcard: GeneratedQuizQuestion[] = [
        {
          type: 'FLASHCARD',
          prompt: 'What is attention?',
          payload: {
            front: 'What is attention?',
            back: 'A mechanism.'
          } as any,
          correctAnswer: 'A mechanism.',
          explanation: 'Explanation',
          difficulty: 'EASY'
        }
      ];

      const result = validateQuizQuestions(invalidFlashcard);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('memorizationReason'))).toBe(true);
    });
  });

  describe('Single Topic Quiz Generation & Critic Review', () => {
    it('synthesizes challenging assessment covering all note sections and passes critic audit', async () => {
      const mockClient = new MockLLMClient();
      const { quiz, auditReport } = await generateSingleTopicQuiz(sampleNote, {
        llmClient: mockClient
      });

      expect(quiz.title).toContain('Transformer Self-Attention Mastery Assessment');
      expect(quiz.questions.length).toBeGreaterThanOrEqual(4);

      // Verify question types present
      const types = quiz.questions.map((q) => q.type);
      expect(types).toContain('MCQ');
      expect(types).toContain('TRUE_FALSE');
      expect(types).toContain('MATCHING');
      expect(types).toContain('ORDERING');

      // Verify MCQ distractor rationales
      const mcq = quiz.questions.find((q) => q.type === 'MCQ');
      expect(mcq?.payload).toHaveProperty('distractorExplanations');

      // Verify audit
      expect(auditReport.passed).toBe(true);
      expect(auditReport.coverageScore).toBeGreaterThanOrEqual(90);
      expect(auditReport.refinementIterations).toBe(0);
    });

    it('strictly caps the refinement loop at maxRefinementIterations (2) when critic rejects', async () => {
      let callCount = 0;
      const mockClient = new MockLLMClient((options) => {
        callCount++;
        const sys = options.systemPrompt.toLowerCase();
        if (sys.includes('quiz critic') || sys.includes('quiz auditor')) {
          return JSON.stringify({
            passed: false,
            coverageScore: 60,
            untestedSections: ['Section 4: Key Caveats'],
            flawedQuestions: [{ index: 0, reason: 'Ambiguous wording' }],
            feedback: 'Please test section 4 edge cases.'
          });
        }
        return JSON.stringify({
          questions: [
            {
              type: 'TRUE_FALSE',
              prompt: `Prompt ${callCount}`,
              payload: { statement: 'Statement', isTrue: true },
              correctAnswer: 'True',
              explanation: 'Explanation',
              difficulty: 'EASY'
            }
          ]
        });
      });

      const { auditReport } = await generateSingleTopicQuiz(sampleNote, {
        llmClient: mockClient,
        maxRefinementIterations: 2
      });

      expect(auditReport.refinementIterations).toBe(2);
      expect(auditReport.passed).toBe(false);
      expect(callCount).toBe(6);
    });
  });

  describe('Batch Parallel Quiz Generation', () => {
    it('synthesizes quizzes for multiple notes in parallel', async () => {
      const mockClient = new MockLLMClient();
      const notes: GeneratedNote[] = [
        sampleNote,
        {
          title: 'Multi-Head Attention',
          topicName: 'Multi-Head Attention',
          content: '# Multi-Head Attention\n## 1. Core\nParallel projection subspaces.'
        }
      ];

      const result = await generateTopicQuizzes(notes, { llmClient: mockClient });
      expect(result.quizzes).toHaveLength(2);
      expect(result.auditReports).toHaveLength(2);
      expect(result.auditReports?.every((a) => a.passed)).toBe(true);
    });

    it('returns empty quizzes array when notes list is empty', async () => {
      const result = await generateTopicQuizzes([]);
      expect(result.quizzes).toEqual([]);
      expect(result.auditReports).toEqual([]);
    });
  });
});
