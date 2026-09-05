import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findMatchingTopic,
  calculateTopicSimilarity,
  calculateDiceSimilarity,
  validateMergePreservation,
  mergeTopicContent,
  mergeQuizQuestions,
  createGraphUpdate
} from '../../src/services/contentMerger.js';
import {
  generateContentStep,
  reviewGeneratedContentStep
} from '../../src/services/ingestPipeline.js';
import { MockLLMClient } from '../../src/services/llmClient.js';
import { TopicRow, NoteRow, ExtractedTopic, GeneratedQuizQuestion } from '../../src/types.js';

describe('Unit: BAC-27 Intelligent Content Merger (contentMerger.ts)', () => {
  describe('1. Topic Matching & Fuzzy Similarity', () => {
    const mockExistingTopics: TopicRow[] = [
      {
        id: 'TOPIC-CASSANDRA-1',
        name: 'Cassandra Storage Engine',
        category: 'SYSTEMS',
        summary: 'Log-structured merge tree storage model in Apache Cassandra.',
        mastery: 50,
        status: 'LEARNING',
        coord_x: 0,
        coord_y: 0,
        coord_z: 0,
        last_reviewed: null
      },
      {
        id: 'TOPIC-CONSISTENT-HASHING-1',
        name: 'Consistent Hashing',
        category: 'SYSTEMS',
        summary: 'Partitioning scheme minimizing re-keys upon ring scaling.',
        mastery: 80,
        status: 'MASTERED',
        coord_x: 1,
        coord_y: 1,
        coord_z: 1,
        last_reviewed: null
      },
      {
        id: 'TOPIC-BACKPROP-1',
        name: 'Backpropagation & Autograd',
        category: 'AI & ML',
        summary: 'Reverse-mode automatic differentiation via chain rule.',
        mastery: 30,
        status: 'LEARNING',
        coord_x: 2,
        coord_y: 2,
        coord_z: 2,
        last_reviewed: null
      }
    ];

    it('matches exact normalized topic names (score 1.0)', () => {
      const match = findMatchingTopic('Consistent Hashing', mockExistingTopics);
      expect(match.matchedTopic).toBeDefined();
      expect(match.matchedTopic?.id).toBe('TOPIC-CONSISTENT-HASHING-1');
      expect(match.score).toBe(1.0);
    });

    it('matches with punctuation, different case, and surrounding whitespace', () => {
      const match = findMatchingTopic('  consistent  hashing!  ', mockExistingTopics);
      expect(match.matchedTopic?.id).toBe('TOPIC-CONSISTENT-HASHING-1');
      expect(match.score).toBe(1.0);
    });

    it('matches substring containment with high score', () => {
      const match = findMatchingTopic('Consistent Hashing Ring Algorithm', mockExistingTopics);
      expect(match.matchedTopic?.id).toBe('TOPIC-CONSISTENT-HASHING-1');
      expect(match.score).toBeGreaterThanOrEqual(0.75);
    });

    it('matches Cassandra storage engine variant', () => {
      const match = findMatchingTopic('Cassandra Storage Model', mockExistingTopics);
      expect(match.matchedTopic?.id).toBe('TOPIC-CASSANDRA-1');
      expect(match.score).toBeGreaterThanOrEqual(0.75);
    });

    it('rejects completely unrelated topics', () => {
      const match = findMatchingTopic('Two-Phase Locking (2PL)', mockExistingTopics);
      expect(match.matchedTopic).toBeNull();
      expect(match.score).toBeLessThan(0.75);
    });

    it('handles empty inputs gracefully', () => {
      expect(findMatchingTopic('', mockExistingTopics).matchedTopic).toBeNull();
      expect(findMatchingTopic('Test', []).matchedTopic).toBeNull();
    });
  });

  describe('2. Deterministic Zero-Information-Loss Preservation Guard', () => {
    const sampleOriginalNote = `# Transformer Self-Attention

> **Prerequisites**: [[Linear Algebra]]
> **Key Metric / Guarantee**: $\\mathcal{O}(N^2)$ pairwise complexity

---

## 1. Problem Context & The "Why"
Sequential RNNs could not be parallelized on GPUs.

## 2. Conceptual Core & Mental Model
Key-Value-Query information retrieval analogy.

\`\`\`mermaid
flowchart LR
    Q --> S
    K --> S
    S --> W
\`\`\`

## 3. Formal Deep-Dive Specification
$$
\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V
$$

## 4. Algorithmic Logic & Pseudocode
\`\`\`text
ALGORITHM ScaledDotProductAttention(Q, K, V):
    RETURN MATMUL(SOFTMAX(MATMUL(Q, TRANSPOSE(K)) / SQRT(d_k)), V)
\`\`\`

## 5. Step-by-Step Worked Trace / Execution Flow
\`\`\`mermaid
sequenceDiagram
    participant A
    participant B
    A->>B: Trace
\`\`\`

## 6. Trade-Offs, Alternatives & Decision Matrix
| Feature | Standard | Linear |
| :--- | :--- | :--- |

## 7. Failure Modes, Edge Cases & Common Pitfalls
- Softmax gradient saturation when $d_k$ is large.

## 8. Summary & Key Takeaways Checklist
- [x] O(N^2) complexity.
`;

    it('passes when candidate preserves all formulas, diagrams, and sections', () => {
      const candidate = sampleOriginalNote + '\n\nAdditional insights integrated cleanly.';
      const result = validateMergePreservation(sampleOriginalNote, candidate);
      expect(result.passed).toBe(true);
      expect(result.lostItems).toHaveLength(0);
    });

    it('flags regression if KaTeX display formula ($$) is dropped', () => {
      const candidateWithoutFormula = sampleOriginalNote.replace(
        /\$\$[\s\S]*?\$\$/g,
        'Formula was omitted in merged version.'
      );
      const result = validateMergePreservation(sampleOriginalNote, candidateWithoutFormula);
      expect(result.passed).toBe(false);
      expect(result.lostItems.some((item) => item.includes('Display math regression'))).toBe(true);
    });

    it('flags regression if Mermaid diagram is dropped', () => {
      const candidateWithoutMermaid = sampleOriginalNote.replace(/```mermaid[\s\S]*?```/g, '');
      const result = validateMergePreservation(sampleOriginalNote, candidateWithoutMermaid);
      expect(result.passed).toBe(false);
      expect(result.lostItems.some((item) => item.includes('Mermaid diagram regression'))).toBe(true);
    });

    it('flags regression if a core section (e.g. Failure Modes) is omitted', () => {
      const candidateWithoutFailureModes = sampleOriginalNote.replace(
        /## 7\. Failure Modes[\s\S]*?(?=## 8|$)/,
        ''
      );
      const result = validateMergePreservation(sampleOriginalNote, candidateWithoutFailureModes);
      expect(result.passed).toBe(false);
      expect(result.lostItems.some((item) => item.includes('Section 7'))).toBe(true);
    });
  });

  describe('3. Dual-Agent Semantic Merge & Review Critic (mergeTopicContent)', () => {
    let mockLlm: MockLLMClient;

    beforeEach(() => {
      mockLlm = new MockLLMClient();
    });

    it('successfully merges new context into existing note preserving depth', async () => {
      const existingNote = {
        title: 'Transformer Self-Attention',
        content: `# Transformer Self-Attention\n\n## 1. Problem Context & The "Why"\nLegacy RNNs.\n\n## 2. Conceptual Core & Mental Model\n\`\`\`mermaid\nflowchart LR\n  A --> B\n\`\`\`\n\n## 3. Formal Deep-Dive Specification\n$$\\text{Attention}(Q, K, V) = \\text{softmax}(QK^T)V$$\n\n## 4. Algorithmic Logic & Pseudocode\n\`\`\`text\nALGORITHM Attention():\n  RETURN 0\n\`\`\`\n\n## 5. Step-by-Step Worked Trace / Execution Flow\n\`\`\`mermaid\nsequenceDiagram\n  A->>B: msg\n\`\`\`\n\n## 6. Trade-Offs, Alternatives & Decision Matrix\n| A | B |\n\n## 7. Failure Modes, Edge Cases & Common Pitfalls\n- Gotchas\n\n## 8. Summary & Key Takeaways Checklist\n- [x] Item\n`
      };

      const topic: ExtractedTopic = {
        name: 'Transformer Self-Attention',
        category: 'AI & ML',
        summary: 'Attention mechanism across sequence representations.'
      };

      const result = await mergeTopicContent(
        existingNote,
        'FlashAttention utilizes SRAM tiling to reduce memory transfers from O(N^2) to O(N).',
        topic,
        { llmClient: mockLlm }
      );

      expect(result.updateType).toBe('NOTE_UPDATE');
      expect(result.mergedNote.content).toContain('## 1. Problem Context & The "Why"');
      expect(result.mergedNote.content).toContain('## 3. Formal Deep-Dive Specification');
      expect(result.mergedNote.content).toContain('flowchart LR');
      expect(result.auditReport.passed).toBe(true);
      expect(result.auditReport.preservationScore).toBeGreaterThanOrEqual(90);
    });

    it('enforces deterministic guard and flags audit failure if formulas are dropped', async () => {
      // Mock that forces generator to drop formulas
      const failingMock = new MockLLMClient();
      failingMock.setCustomHandler((options) => {
        const sys = options.systemPrompt.toLowerCase();
        if (sys.includes('content synthesizer') || sys.includes('semantic merge')) {
          // Drops formula
          return `# Transformer Self-Attention
## 1. Problem Context & The "Why"
No formula here.
## 2. Conceptual Core & Mental Model
## 3. Formal Deep-Dive Specification
## 4. Algorithmic Logic & Pseudocode
## 5. Step-by-Step Worked Trace
## 6. Trade-Offs
## 7. Failure Modes
## 8. Summary
`;
        }
        return JSON.stringify({
          passed: true,
          preservationScore: 90,
          coverageScore: 85,
          lostOriginalConcepts: [],
          omittedNewConcepts: [],
          unresolvedDuplicates: [],
          feedback: 'Pass'
        });
      });

      const existingNoteWithFormula = {
        title: 'Transformer Self-Attention',
        content: `# Transformer Self-Attention
## 3. Formal Deep-Dive Specification
$$ E = mc^2 $$
## 7. Failure Modes, Edge Cases & Common Pitfalls
- Edge case
`
      };

      const topic: ExtractedTopic = {
        name: 'Transformer Self-Attention',
        category: 'AI & ML',
        summary: 'Attention mechanism'
      };

      const result = await mergeTopicContent(
        existingNoteWithFormula,
        'New context text',
        topic,
        { llmClient: failingMock, maxRefinementIterations: 1 }
      );

      // Deterministic check must fail the audit because display math $$ was dropped!
      expect(result.auditReport.passed).toBe(false);
      expect(result.auditReport.lostOriginalConcepts.some((c) => c.includes('Display math'))).toBe(true);
    });
  });

  describe('4. Incremental Quiz Question Union (mergeQuizQuestions)', () => {
    const existingQuestions: GeneratedQuizQuestion[] = [
      {
        type: 'MCQ',
        prompt: 'What is the memory complexity of standard dense self-attention with sequence length N?',
        payload: { options: [{ id: 'A', text: 'O(N^2)' }] },
        correctAnswer: 'A',
        explanation: 'Pairwise attention matrix is N x N.',
        difficulty: 'MEDIUM'
      },
      {
        type: 'TRUE_FALSE',
        prompt: 'FlashAttention reduces high-bandwidth memory (HBM) accesses using SRAM tiling.',
        payload: { statement: 'True statement', isTrue: true },
        correctAnswer: 'True',
        explanation: 'FlashAttention fuses attention computation in fast SRAM.',
        difficulty: 'HARD'
      }
    ];

    it('preserves existing questions and skips duplicate incoming questions', () => {
      const incomingQuestions: GeneratedQuizQuestion[] = [
        // Duplicate of question 1
        {
          type: 'MCQ',
          prompt: 'What is the memory complexity of standard dense self-attention with sequence length N?',
          payload: { options: [{ id: 'B', text: 'O(N^2)' }] },
          correctAnswer: 'B',
          explanation: 'Duplicate question.',
          difficulty: 'MEDIUM'
        },
        // Brand new question
        {
          type: 'MCQ',
          prompt: 'Which scaling factor is applied to dot products before the softmax layer in attention?',
          payload: { options: [{ id: 'A', text: '1/sqrt(d_k)' }] },
          correctAnswer: 'A',
          explanation: 'Dividing by sqrt(d_k) prevents softmax gradient saturation.',
          difficulty: 'MEDIUM'
        }
      ];

      const merged = mergeQuizQuestions(existingQuestions, incomingQuestions);
      expect(merged.mergedQuestions).toHaveLength(3); // 2 existing + 1 novel
      expect(merged.addedCount).toBe(1);
      expect(merged.mergedQuestions[2].prompt).toContain('scaling factor');
    });
  });

  describe('5. GraphUpdate Factory & Data Model (createGraphUpdate)', () => {
    it('creates standardized GraphUpdate with required entity fields', () => {
      const update = createGraphUpdate({
        type: 'NOTE_UPDATE',
        targetId: 'TOPIC-123',
        targetName: 'Distributed Consensus',
        title: 'Semantic Merge: Distributed Consensus',
        description: 'Merged Raft and Paxos trade-off matrix',
        category: 'SYSTEMS',
        oldContent: 'Old Paxos note',
        newContent: 'Merged Paxos + Raft note',
        status: 'APPROVED',
        payload: { topicId: 'TOPIC-123', noteId: 'NOTE-456' }
      });

      expect(update.id).toMatch(/^UPDATE-/);
      expect(update.type).toBe('NOTE_UPDATE');
      expect(update.status).toBe('APPROVED');
      expect(update.oldContent).toBe('Old Paxos note');
      expect(update.newContent).toBe('Merged Paxos + Raft note');
      expect(update.payload?.topicId).toBe('TOPIC-123');
    });
  });

  describe('6. Ingestion Pipeline Integration with Intelligent Merge', () => {
    let mockLlm: MockLLMClient;

    beforeEach(() => {
      mockLlm = new MockLLMClient();
    });

    it('routes through mergeTopicContent when extracted topic matches an existing topic in DB', async () => {
      const existingTopics: TopicRow[] = [
        {
          id: 'TOPIC-TRANSFORMER',
          name: 'Transformer Self-Attention',
          category: 'AI & ML',
          summary: 'Scaled dot-product attention mechanism.',
          mastery: 40,
          status: 'LEARNING',
          coord_x: 0,
          coord_y: 0,
          coord_z: 0,
          last_reviewed: null
        }
      ];

      const existingNotes: Record<string, NoteRow> = {
        'TOPIC-TRANSFORMER': {
          id: 'NOTE-TRANSFORMER-1',
          topic_id: 'TOPIC-TRANSFORMER',
          title: 'Transformer Self-Attention',
          filename: null,
          content: `# Transformer Self-Attention\n\n## 1. Problem Context & The "Why"\nRNN limits.\n\n## 2. Conceptual Core & Mental Model\n\`\`\`mermaid\nflowchart LR\n  A --> B\n\`\`\`\n\n## 3. Formal Deep-Dive Specification\n$$\\text{Attention}(Q, K, V) = \\text{softmax}(QK^T)V$$\n\n## 4. Algorithmic Logic & Pseudocode\n\`\`\`text\nALGORITHM Attention():\n  RETURN 0\n\`\`\`\n\n## 5. Step-by-Step Worked Trace / Execution Flow\n\`\`\`mermaid\nsequenceDiagram\n  A->>B: msg\n\`\`\`\n\n## 6. Trade-Offs, Alternatives & Decision Matrix\n| A | B |\n\n## 7. Failure Modes, Edge Cases & Common Pitfalls\n- Gradient vanishing\n\n## 8. Summary & Key Takeaways Checklist\n- [x] Retention item\n`,
          created_at: new Date(),
          updated_at: new Date()
        }
      };

      const extractedTopics: ExtractedTopic[] = [
        {
          name: 'Transformer Self-Attention',
          category: 'AI & ML',
          summary: 'Scaled dot product attention core.'
        }
      ];

      const result = await generateContentStep(
        extractedTopics,
        'Incoming article on multi-head attention and flash attention optimizations.',
        {
          llmClient: mockLlm,
          existingTopics,
          existingNotes
        }
      );

      expect(result.notes).toHaveLength(1);
      expect(result.mergeAudits).toBeDefined();
      expect(result.mergeAudits).toHaveLength(1);
      expect(result.mergeAudits![0].passed).toBe(true);
      expect(result.graphUpdates).toBeDefined();
      expect(result.graphUpdates!.some((u) => u.type === 'NOTE_UPDATE')).toBe(true);

      const noteUpdate = result.graphUpdates!.find((u) => u.type === 'NOTE_UPDATE');
      expect(noteUpdate?.oldContent).toContain('Transformer Self-Attention');
      expect(noteUpdate?.newContent).toContain('Transformer Self-Attention');

      // Test review aggregation
      const reviewRes = await reviewGeneratedContentStep({
        topics: extractedTopics,
        notes: result.notes,
        quizzes: result.quizzes,
        noteAudits: result.auditReports,
        quizAudits: result.quizAudits,
        mergeAudits: result.mergeAudits
      });

      expect(reviewRes.passed).toBe(true);
      expect(reviewRes.overallScore).toBeGreaterThanOrEqual(90);
    });
  });
});
