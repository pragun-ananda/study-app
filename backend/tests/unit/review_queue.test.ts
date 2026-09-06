import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDatabase } from '../helpers.js';
import {
  applyGraphUpdateToDatabase,
  getReviewQueue,
  getUpdateById,
  approveQueueUpdate,
  rejectQueueUpdate,
  requestChangesOnUpdate,
  approveEntireQueueItem,
  rejectEntireQueueItem
} from '../../src/services/reviewQueueService.js';
import { reDraftNoteWithFeedback, createGraphUpdate } from '../../src/services/contentMerger.js';
import { query } from '../../src/db.js';
import { MockLLMClient } from '../../src/services/llmClient.js';
import { GraphUpdate, LineReviewComment } from '../../src/types.js';

describe('Unit: Review Queue Service & Agent Redrafting', () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  describe('applyGraphUpdateToDatabase', () => {
    it('applies a new TOPIC_UPDATE to the topics table', async () => {
      const topicUpdate: GraphUpdate = createGraphUpdate({
        type: 'TOPIC_UPDATE',
        targetId: 'TOPIC-101',
        targetName: 'Distributed Consensus',
        title: 'New Topic: Distributed Consensus',
        description: 'Consensus mechanisms including Paxos and Raft',
        category: 'Computer Science',
        oldContent: '',
        newContent: 'Consensus overview',
        payload: {
          topicId: 'TOPIC-101',
          summary: 'Consensus mechanisms including Paxos and Raft',
          coord_x: 12.5,
          coord_y: 5.0,
          coord_z: -3.0
        }
      });

      await applyGraphUpdateToDatabase(topicUpdate);

      const res = await query(`SELECT * FROM topics WHERE id = $1`, ['TOPIC-101']);
      expect(res.rows.length).toBe(1);
      expect(res.rows[0].name).toBe('Distributed Consensus');
      expect(res.rows[0].category).toBe('Computer Science');
      expect(res.rows[0].coord_x).toBe(12.5);
    });

    it('updates an existing topic on TOPIC_UPDATE', async () => {
      await query(
        `INSERT INTO topics (id, name, category, summary, mastery, status, coord_x, coord_y, coord_z)
         VALUES ('TOPIC-102', 'Old Name', 'AI & ML', 'Old summary', 20.0, 'NEW', 0, 0, 0)`
      );

      const update = createGraphUpdate({
        type: 'TOPIC_UPDATE',
        targetId: 'TOPIC-102',
        targetName: 'Updated Name',
        title: 'Update Topic Name',
        description: 'Updated summary description',
        category: 'AI & ML',
        oldContent: '',
        newContent: '',
        payload: {
          topicId: 'TOPIC-102',
          summary: 'Updated summary description'
        }
      });

      await applyGraphUpdateToDatabase(update);

      const res = await query(`SELECT * FROM topics WHERE id = $1`, ['TOPIC-102']);
      expect(res.rows[0].name).toBe('Updated Name');
      expect(res.rows[0].summary).toBe('Updated summary description');
    });

    it('inserts a new note on NOTE_UPDATE', async () => {
      await query(
        `INSERT INTO topics (id, name, category, summary, mastery, status, coord_x, coord_y, coord_z)
         VALUES ('TOPIC-201', 'Raft Protocol', 'Computer Science', 'Consensus protocol', 0, 'NEW', 0, 0, 0)`
      );

      const noteUpdate = createGraphUpdate({
        type: 'NOTE_UPDATE',
        targetId: 'TOPIC-201',
        targetName: 'Raft Protocol',
        title: 'Raft Consensus Study Note',
        description: 'Complete 8-part master architecture note',
        category: 'Computer Science',
        oldContent: '',
        newContent: '# Raft Protocol\n\n## 1. Problem Context\nConsensus problem.',
        payload: {
          topicId: 'TOPIC-201',
          noteId: 'NOTE-201'
        }
      });

      await applyGraphUpdateToDatabase(noteUpdate);

      const res = await query(`SELECT * FROM notes WHERE id = $1`, ['NOTE-201']);
      expect(res.rows.length).toBe(1);
      expect(res.rows[0].topic_id).toBe('TOPIC-201');
      expect(res.rows[0].content).toContain('Raft Protocol');
    });

    it('updates an existing note on NOTE_UPDATE', async () => {
      await query(
        `INSERT INTO topics (id, name, category, summary, mastery, status, coord_x, coord_y, coord_z)
         VALUES ('TOPIC-202', 'Paxos', 'Computer Science', 'Paxos', 0, 'NEW', 0, 0, 0)`
      );
      await query(
        `INSERT INTO notes (id, topic_id, title, content)
         VALUES ('NOTE-202', 'TOPIC-202', 'Original Title', 'Original content')`
      );

      const noteUpdate = createGraphUpdate({
        type: 'NOTE_UPDATE',
        targetId: 'TOPIC-202',
        targetName: 'Paxos',
        title: 'Updated Paxos Note',
        description: 'Merged content',
        category: 'Computer Science',
        oldContent: 'Original content',
        newContent: 'Updated content with formulas $$ S_n $$',
        payload: {
          noteId: 'NOTE-202',
          topicId: 'TOPIC-202'
        }
      });

      await applyGraphUpdateToDatabase(noteUpdate);

      const res = await query(`SELECT * FROM notes WHERE id = $1`, ['NOTE-202']);
      expect(res.rows[0].content).toBe('Updated content with formulas $$ S_n $$');
      expect(res.rows[0].title).toBe('Updated Paxos Note');
    });

    it('inserts quizzes and quiz questions on QUIZ_UPDATE', async () => {
      await query(
        `INSERT INTO topics (id, name, category, summary, mastery, status, coord_x, coord_y, coord_z)
         VALUES ('TOPIC-301', 'Bloom Filters', 'Computer Science', 'Probabilistic data structure', 0, 'NEW', 0, 0, 0)`
      );

      const quizUpdate = createGraphUpdate({
        type: 'QUIZ_UPDATE',
        targetId: 'TOPIC-301',
        targetName: 'Bloom Filters',
        title: 'Bloom Filters Quiz',
        description: 'Assessment questions',
        category: 'Computer Science',
        oldContent: '',
        newContent: 'Quiz with 2 questions',
        payload: {
          topicId: 'TOPIC-301',
          quizId: 'QUIZ-301',
          questions: [
            {
              id: 'QUESTION-301-1',
              type: 'MCQ',
              prompt: 'Can a Bloom filter produce false negatives?',
              payload: {
                options: [
                  { text: 'Yes', isCorrect: false, rationale: 'Bloom filters never produce false negatives.' },
                  { text: 'No', isCorrect: true, rationale: 'Correct, only false positives are possible.' }
                ]
              },
              correctAnswer: 'No',
              explanation: 'Bloom filters guarantee no false negatives.',
              difficulty: 'MEDIUM'
            }
          ]
        }
      });

      await applyGraphUpdateToDatabase(quizUpdate);

      const quizRes = await query(`SELECT * FROM quizzes WHERE id = $1`, ['QUIZ-301']);
      expect(quizRes.rows.length).toBe(1);

      const questionRes = await query(`SELECT * FROM quiz_questions WHERE quiz_id = $1`, ['QUIZ-301']);
      expect(questionRes.rows.length).toBe(1);
      expect(questionRes.rows[0].prompt).toContain('false negatives');
      expect(questionRes.rows[0].correct_answer).toBe('No');
    });

    it('inserts topic prerequisites on EDGE_UPDATE avoiding self-loops', async () => {
      await query(
        `INSERT INTO topics (id, name, category, summary, mastery, status, coord_x, coord_y, coord_z) VALUES
         ('TOPIC-401', 'LSM-Trees', 'Computer Science', 'Log-structured merge-tree', 0, 'NEW', 0, 0, 0),
         ('TOPIC-402', 'B-Trees', 'Computer Science', 'Balanced tree', 0, 'NEW', 0, 0, 0)`
      );

      const edgeUpdate = createGraphUpdate({
        type: 'EDGE_UPDATE',
        targetId: 'TOPIC-401',
        targetName: 'LSM-Trees Prerequisites',
        title: 'Link LSM-Trees to B-Trees',
        description: 'Add prerequisite',
        category: 'Computer Science',
        oldContent: '',
        newContent: 'LSM-Trees requires B-Trees',
        payload: {
          topicId: 'TOPIC-401',
          prerequisites: ['TOPIC-402', 'TOPIC-401'] // second is a self-loop that should be ignored
        }
      });

      await applyGraphUpdateToDatabase(edgeUpdate);

      const edgeRes = await query(`SELECT * FROM topic_prerequisites WHERE topic_id = $1`, ['TOPIC-401']);
      expect(edgeRes.rows.length).toBe(1);
      expect(edgeRes.rows[0].prerequisite_id).toBe('TOPIC-402');
    });
  });

  describe('Review Queue Aggregation & Queries', () => {
    it('aggregates counts and lists updates correctly', async () => {
      const update1 = createGraphUpdate({
        type: 'NOTE_UPDATE',
        targetId: 'TOPIC-501',
        targetName: 'Topic 1',
        title: 'Note 1',
        description: 'Desc 1',
        category: 'Computer Science',
        oldContent: '',
        newContent: 'Content 1'
      });
      const update2 = createGraphUpdate({
        type: 'TOPIC_UPDATE',
        targetId: 'TOPIC-502',
        targetName: 'Topic 2',
        title: 'Topic 2',
        description: 'Desc 2',
        category: 'AI & ML',
        oldContent: '',
        newContent: 'Content 2'
      });

      await query(
        `INSERT INTO ingest_review_queue (id, source_url, status, payload, audit_report, created_at)
         VALUES ('QUEUE-1', 'http://test1.com', 'PENDING', $1, '{}'::jsonb, NOW())`,
        [JSON.stringify({ graphUpdates: [update1] })]
      );
      await query(
        `INSERT INTO ingest_review_queue (id, source_url, status, payload, audit_report, created_at)
         VALUES ('QUEUE-2', 'http://test2.com', 'APPROVED', $1, '{}'::jsonb, NOW())`,
        [JSON.stringify({ graphUpdates: [update2] })]
      );

      const allRes = await getReviewQueue();
      expect(allRes.counts.total).toBe(2);
      expect(allRes.counts.pending).toBe(1);
      expect(allRes.counts.approved).toBe(1);
      expect(allRes.updates.length).toBe(2);

      const pendingOnly = await getReviewQueue({ status: 'PENDING' });
      expect(pendingOnly.queueItems.length).toBe(1);
      expect(pendingOnly.queueItems[0].id).toBe('QUEUE-1');
    });

    it('locates a single update by ID across queue rows', async () => {
      const updateTarget = createGraphUpdate({
        type: 'NOTE_UPDATE',
        targetId: 'TOPIC-601',
        targetName: 'Target Note',
        title: 'Target Title',
        description: 'Target Desc',
        category: 'Computer Science',
        oldContent: '',
        newContent: 'Target Content'
      });

      await query(
        `INSERT INTO ingest_review_queue (id, source_url, status, payload, audit_report, created_at)
         VALUES ('QUEUE-3', 'http://test3.com', 'PENDING', $1, '{}'::jsonb, NOW())`,
        [JSON.stringify({ graphUpdates: [updateTarget] })]
      );

      const match = await getUpdateById(updateTarget.id);
      expect(match).not.toBeNull();
      expect(match?.update.id).toBe(updateTarget.id);
      expect(match?.queueItem.id).toBe('QUEUE-3');
    });
  });

  describe('Approval and Rejection Workflow', () => {
    it('approves a single update, applies to DB, and marks queue row approved', async () => {
      await query(
        `INSERT INTO topics (id, name, category, summary, mastery, status, coord_x, coord_y, coord_z)
         VALUES ('TOPIC-701', 'Distributed Locks', 'Computer Science', 'Locks', 0, 'NEW', 0, 0, 0)`
      );

      const update = createGraphUpdate({
        type: 'NOTE_UPDATE',
        targetId: 'TOPIC-701',
        targetName: 'Distributed Locks',
        title: 'Distributed Locks Note',
        description: 'Redlock and Chubby',
        category: 'Computer Science',
        oldContent: '',
        newContent: '# Distributed Locks\n\n## 1. Problem Context\nConcurrency control.',
        payload: {
          topicId: 'TOPIC-701',
          noteId: 'NOTE-701'
        }
      });

      await query(
        `INSERT INTO ingest_review_queue (id, source_url, status, payload, audit_report, created_at)
         VALUES ('QUEUE-701', 'http://locks.com', 'PENDING', $1, '{}'::jsonb, NOW())`,
        [JSON.stringify({ graphUpdates: [update] })]
      );

      const result = await approveQueueUpdate(update.id);
      expect(result.success).toBe(true);
      expect(result.update.status).toBe('APPROVED');

      // Verify DB note exists
      const noteRes = await query(`SELECT * FROM notes WHERE id = $1`, ['NOTE-701']);
      expect(noteRes.rows.length).toBe(1);

      // Verify queue row is updated to APPROVED
      const queueRes = await query(`SELECT status FROM ingest_review_queue WHERE id = $1`, ['QUEUE-701']);
      expect(queueRes.rows[0].status).toBe('APPROVED');
    });

    it('rejects an update without applying changes to DB', async () => {
      const update = createGraphUpdate({
        type: 'NOTE_UPDATE',
        targetId: 'TOPIC-801',
        targetName: 'Spurious Note',
        title: 'Spurious Title',
        description: 'Should be rejected',
        category: 'Computer Science',
        oldContent: '',
        newContent: 'Spurious Content',
        payload: {
          topicId: 'TOPIC-801',
          noteId: 'NOTE-801'
        }
      });

      await query(
        `INSERT INTO ingest_review_queue (id, source_url, status, payload, audit_report, created_at)
         VALUES ('QUEUE-801', 'http://spurious.com', 'PENDING', $1, '{}'::jsonb, NOW())`,
        [JSON.stringify({ graphUpdates: [update] })]
      );

      const result = await rejectQueueUpdate(update.id);
      expect(result.success).toBe(true);
      expect(result.update.status).toBe('REJECTED');

      // Verify no note was inserted
      const noteRes = await query(`SELECT * FROM notes WHERE id = $1`, ['NOTE-801']);
      expect(noteRes.rows.length).toBe(0);

      // Queue row is REJECTED
      const queueRes = await query(`SELECT status FROM ingest_review_queue WHERE id = $1`, ['QUEUE-801']);
      expect(queueRes.rows[0].status).toBe('REJECTED');
    });
  });

  describe('reDraftNoteWithFeedback & Agent Redrafting Loop', () => {
    it('re-drafts note incorporating line comments and general feedback with zero information loss', async () => {
      const mockLLM = new MockLLMClient();
      const existingNote = `# Transformer Self-Attention

> **Prerequisites**: [[Linear Algebra]]  
> **Key Metric / Guarantee**: $\\mathcal{O}(N^2)$ pairwise attention complexity

---

## 1. Problem Context & The "Why"
Sequential recurrence creates GPU bottlenecks.

## 2. Conceptual Core & Mental Model
Key-Value retrieval model.

\`\`\`mermaid
flowchart LR
    Q --> K
\`\`\`

## 3. Formal Deep-Dive Specification
$$
\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V
$$

## 4. Algorithmic Logic & Pseudocode
\`\`\`text
ALGORITHM ScaledAttention(Q, K, V):
    RETURN MATMUL(SOFTMAX(MATMUL(Q, TRANSPOSE(K)) / SQRT(d_k)), V)
\`\`\`

## 5. Step-by-Step Worked Trace
Trace steps.

## 6. Trade-Offs, Alternatives & Decision Matrix
Matrix.

## 7. Failure Modes, Edge Cases & Common Pitfalls
Pitfalls.

## 8. Summary & Key Takeaways Checklist
- [x] Attention is parallel.
`;

      const lineComments: LineReviewComment[] = [
        {
          id: 'c1',
          lineNumber: 15,
          selectedText: 'Key-Value retrieval model',
          comment: 'Please elaborate on the intuition with a search engine comparison.',
          createdAt: new Date().toISOString()
        }
      ];

      const res = await reDraftNoteWithFeedback(
        existingNote,
        existingNote,
        lineComments,
        'Please ensure the trace in section 5 is clear and mathematical formulas remain exact.',
        { name: 'Transformer Self-Attention', category: 'AI & ML' },
        { llmClient: mockLLM }
      );

      expect(res.revisedMarkdown).toBeDefined();
      expect(res.revisedMarkdown).toContain('$$');
      expect(res.revisedMarkdown).toContain('```mermaid');
      expect(res.auditReport.passed).toBe(true);
      expect(res.auditReport.preservationScore).toBeGreaterThanOrEqual(95);
    });

    it('requestChangesOnUpdate updates the review queue diff with revised content and keeps status PENDING', async () => {
      const mockLLM = new MockLLMClient();
      const update = createGraphUpdate({
        type: 'NOTE_UPDATE',
        targetId: 'TOPIC-901',
        targetName: 'Transformer Self-Attention',
        title: 'Transformer Self-Attention Note',
        description: 'Draft note',
        category: 'AI & ML',
        oldContent: '',
        newContent: `# Transformer Self-Attention

> **Prerequisites**: [[Linear Algebra]]  
> **Key Metric / Guarantee**: $\\mathcal{O}(N^2)$ complexity

---

## 1. Problem Context & The "Why"
Sequential limits.

## 2. Conceptual Core & Mental Model
Relational affinity.

\`\`\`mermaid
flowchart LR
    Q --> K
\`\`\`

## 3. Formal Deep-Dive Specification
$$
\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V
$$

## 4. Algorithmic Logic & Pseudocode
\`\`\`text
ALGORITHM ScaledAttention(Q, K, V):
    RETURN MATMUL(SOFTMAX(MATMUL(Q, TRANSPOSE(K)) / SQRT(d_k)), V)
\`\`\`

## 5. Step-by-Step Worked Trace
Trace.

## 6. Trade-Offs, Alternatives & Decision Matrix
Matrix.

## 7. Failure Modes, Edge Cases & Common Pitfalls
Pitfalls.

## 8. Summary & Key Takeaways Checklist
- [x] Parallel.
`,
        payload: {
          topicId: 'TOPIC-901',
          noteId: 'NOTE-901'
        }
      });

      await query(
        `INSERT INTO ingest_review_queue (id, source_url, status, payload, audit_report, created_at)
         VALUES ('QUEUE-901', 'http://transformer.com', 'PENDING', $1, '{}'::jsonb, NOW())`,
        [JSON.stringify({ graphUpdates: [update] })]
      );

      const requestChangesResult = await requestChangesOnUpdate(
        update.id,
        {
          comments: [
            {
              id: 'c1',
              lineNumber: 10,
              comment: 'Clarify sequential bottleneck',
              createdAt: new Date().toISOString()
            }
          ],
          generalFeedback: 'Make sure the 8-part structure is preserved.'
        },
        { llmClient: mockLLM }
      );

      expect(requestChangesResult.success).toBe(true);
      expect(requestChangesResult.update.status).toBe('PENDING');
      expect(requestChangesResult.update.newContent).toContain('Transformer Self-Attention');
      expect(requestChangesResult.update.comments?.length).toBe(1);

      // Verify in review queue table
      const queueRes = await query(`SELECT * FROM ingest_review_queue WHERE id = $1`, ['QUEUE-901']);
      expect(queueRes.rows[0].status).toBe('PENDING');
      const rawPayload = queueRes.rows[0].payload;
      const payload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
      expect(payload.graphUpdates[0].newContent).toContain('Transformer Self-Attention');
    });
  });
});
