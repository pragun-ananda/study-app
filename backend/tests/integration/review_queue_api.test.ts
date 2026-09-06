import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { setupTestDatabase } from '../helpers.js';
import { query } from '../../src/db.js';
import { createGraphUpdate } from '../../src/services/contentMerger.js';

describe('Integration: Review Queue REST API (/api/review-queue)', () => {
  beforeEach(() => {
    setupTestDatabase();
  });

  describe('GET /api/review-queue', () => {
    it('returns empty queue with zero counts when no items exist', async () => {
      const res = await request(app).get('/api/review-queue');
      expect(res.status).toBe(200);
      expect(res.body.queueItems).toEqual([]);
      expect(res.body.updates).toEqual([]);
      expect(res.body.counts).toEqual({
        pending: 0,
        approved: 0,
        rejected: 0,
        changesRequested: 0,
        total: 0
      });
    });

    it('returns items, updates, and correct counts with status filtering', async () => {
      const update1 = createGraphUpdate({
        type: 'NOTE_UPDATE',
        targetId: 'TOPIC-1',
        targetName: 'Topic 1',
        title: 'Title 1',
        description: 'Desc 1',
        category: 'Computer Science',
        oldContent: '',
        newContent: 'Content 1'
      });
      const update2 = createGraphUpdate({
        type: 'TOPIC_UPDATE',
        targetId: 'TOPIC-2',
        targetName: 'Topic 2',
        title: 'Title 2',
        description: 'Desc 2',
        category: 'AI & ML',
        oldContent: '',
        newContent: 'Content 2'
      });

      await query(
        `INSERT INTO ingest_review_queue (id, source_url, status, payload, audit_report, created_at)
         VALUES ('Q-1', 'http://example.com/1', 'PENDING', $1, '{}'::jsonb, NOW())`,
        [JSON.stringify({ graphUpdates: [update1] })]
      );
      await query(
        `INSERT INTO ingest_review_queue (id, source_url, status, payload, audit_report, created_at)
         VALUES ('Q-2', 'http://example.com/2', 'APPROVED', $1, '{}'::jsonb, NOW())`,
        [JSON.stringify({ graphUpdates: [update2] })]
      );

      // Fetch all
      const resAll = await request(app).get('/api/review-queue');
      expect(resAll.status).toBe(200);
      expect(resAll.body.counts.total).toBe(2);
      expect(resAll.body.counts.pending).toBe(1);
      expect(resAll.body.counts.approved).toBe(1);
      expect(resAll.body.updates.length).toBe(2);

      // Filter by PENDING
      const resPending = await request(app).get('/api/review-queue?status=PENDING');
      expect(resPending.status).toBe(200);
      expect(resPending.body.queueItems.length).toBe(1);
      expect(resPending.body.queueItems[0].id).toBe('Q-1');
    });
  });

  describe('GET /api/review-queue/updates/:updateId', () => {
    it('returns 200 with the update and queueItem when found', async () => {
      const update = createGraphUpdate({
        type: 'NOTE_UPDATE',
        targetId: 'TOPIC-3',
        targetName: 'Topic 3',
        title: 'Title 3',
        description: 'Desc 3',
        category: 'Computer Science',
        oldContent: '',
        newContent: 'Content 3'
      });

      await query(
        `INSERT INTO ingest_review_queue (id, source_url, status, payload, audit_report, created_at)
         VALUES ('Q-3', 'http://example.com/3', 'PENDING', $1, '{}'::jsonb, NOW())`,
        [JSON.stringify({ graphUpdates: [update] })]
      );

      const res = await request(app).get(`/api/review-queue/updates/${update.id}`);
      expect(res.status).toBe(200);
      expect(res.body.update.id).toBe(update.id);
      expect(res.body.queueItem.id).toBe('Q-3');
    });

    it('returns 404 when updateId is not found', async () => {
      const res = await request(app).get('/api/review-queue/updates/UPDATE-NONEXISTENT');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not Found');
    });
  });

  describe('POST /api/review-queue/updates/:updateId/approve', () => {
    it('approves an update, updates PostgreSQL tables, and marks queue row approved', async () => {
      await query(
        `INSERT INTO topics (id, name, category, summary, mastery, status, coord_x, coord_y, coord_z)
         VALUES ('TOPIC-4', 'Raft Protocol', 'Computer Science', 'Consensus', 0, 'NEW', 0, 0, 0)`
      );

      const update = createGraphUpdate({
        type: 'NOTE_UPDATE',
        targetId: 'TOPIC-4',
        targetName: 'Raft Protocol',
        title: 'Raft Protocol Note',
        description: 'Consensus study guide',
        category: 'Computer Science',
        oldContent: '',
        newContent: '# Raft Protocol\n\nLeader election and log replication.',
        payload: {
          topicId: 'TOPIC-4',
          noteId: 'NOTE-4'
        }
      });

      await query(
        `INSERT INTO ingest_review_queue (id, source_url, status, payload, audit_report, created_at)
         VALUES ('Q-4', 'http://example.com/raft', 'PENDING', $1, '{}'::jsonb, NOW())`,
        [JSON.stringify({ graphUpdates: [update] })]
      );

      const res = await request(app).post(`/api/review-queue/updates/${update.id}/approve`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.update.status).toBe('APPROVED');

      // Check that note now exists in notes table
      const noteRes = await query(`SELECT * FROM notes WHERE id = $1`, ['NOTE-4']);
      expect(noteRes.rows.length).toBe(1);
      expect(noteRes.rows[0].content).toContain('Leader election');

      // Check that queue row is marked APPROVED
      const queueRes = await query(`SELECT status FROM ingest_review_queue WHERE id = $1`, ['Q-4']);
      expect(queueRes.rows[0].status).toBe('APPROVED');
    });

    it('returns 404 when approving a nonexistent updateId', async () => {
      const res = await request(app).post('/api/review-queue/updates/UPDATE-FAKE/approve');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/review-queue/updates/:updateId/reject', () => {
    it('rejects an update without applying DB mutations', async () => {
      const update = createGraphUpdate({
        type: 'NOTE_UPDATE',
        targetId: 'TOPIC-5',
        targetName: 'Rejectable Topic',
        title: 'Rejectable Note',
        description: 'Should be rejected',
        category: 'Computer Science',
        oldContent: '',
        newContent: 'Bad content',
        payload: {
          topicId: 'TOPIC-5',
          noteId: 'NOTE-5'
        }
      });

      await query(
        `INSERT INTO ingest_review_queue (id, source_url, status, payload, audit_report, created_at)
         VALUES ('Q-5', 'http://example.com/reject', 'PENDING', $1, '{}'::jsonb, NOW())`,
        [JSON.stringify({ graphUpdates: [update] })]
      );

      const res = await request(app).post(`/api/review-queue/updates/${update.id}/reject`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.update.status).toBe('REJECTED');

      // No note inserted
      const noteRes = await query(`SELECT * FROM notes WHERE id = $1`, ['NOTE-5']);
      expect(noteRes.rows.length).toBe(0);

      // Queue row is REJECTED
      const queueRes = await query(`SELECT status FROM ingest_review_queue WHERE id = $1`, ['Q-5']);
      expect(queueRes.rows[0].status).toBe('REJECTED');
    });
  });

  describe('POST /api/review-queue/updates/:updateId/request-changes', () => {
    it('triggers agent redrafting, updates the review queue diff, and preserves PENDING status', async () => {
      const update = createGraphUpdate({
        type: 'NOTE_UPDATE',
        targetId: 'TOPIC-6',
        targetName: 'Transformer Architecture',
        title: 'Transformer Architecture Note',
        description: 'Attention mechanisms',
        category: 'AI & ML',
        oldContent: '',
        newContent: `# Transformer Architecture

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
          topicId: 'TOPIC-6',
          noteId: 'NOTE-6'
        }
      });

      await query(
        `INSERT INTO ingest_review_queue (id, source_url, status, payload, audit_report, created_at)
         VALUES ('Q-6', 'http://example.com/transformer', 'PENDING', $1, '{}'::jsonb, NOW())`,
        [JSON.stringify({ graphUpdates: [update] })]
      );

      const res = await request(app)
        .post(`/api/review-queue/updates/${update.id}/request-changes`)
        .send({
          comments: [
            {
              id: 'comment-1',
              lineNumber: 12,
              selectedText: 'Relational affinity',
              comment: 'Can you clarify the dot product analogy here?'
            }
          ],
          generalFeedback: 'Ensure all math and Mermaid diagrams are preserved.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.update.status).toBe('PENDING');
      expect(res.body.update.newContent).toContain('Transformer Self-Attention');
      expect(res.body.auditReport).toBeDefined();
      expect(res.body.auditReport.passed).toBe(true);
    });

    it('returns 400 Bad Request when comments and generalFeedback are both empty', async () => {
      const res = await request(app)
        .post('/api/review-queue/updates/UPDATE-ANY/request-changes')
        .send({ comments: [] });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Bad Request');
    });
  });

  describe('Batch item operations', () => {
    it('approves an entire queue batch with multiple updates', async () => {
      await query(
        `INSERT INTO topics (id, name, category, summary, mastery, status, coord_x, coord_y, coord_z) VALUES
         ('TOPIC-B1', 'Topic B1', 'CS', 'Summary 1', 0, 'NEW', 0, 0, 0),
         ('TOPIC-B2', 'Topic B2', 'CS', 'Summary 2', 0, 'NEW', 0, 0, 0)`
      );

      const u1 = createGraphUpdate({
        type: 'NOTE_UPDATE',
        targetId: 'TOPIC-B1',
        targetName: 'Topic B1',
        title: 'Note B1',
        description: 'Desc',
        category: 'CS',
        oldContent: '',
        newContent: 'Content B1',
        payload: { topicId: 'TOPIC-B1', noteId: 'NOTE-B1' }
      });
      const u2 = createGraphUpdate({
        type: 'NOTE_UPDATE',
        targetId: 'TOPIC-B2',
        targetName: 'Topic B2',
        title: 'Note B2',
        description: 'Desc',
        category: 'CS',
        oldContent: '',
        newContent: 'Content B2',
        payload: { topicId: 'TOPIC-B2', noteId: 'NOTE-B2' }
      });

      await query(
        `INSERT INTO ingest_review_queue (id, source_url, status, payload, audit_report, created_at)
         VALUES ('Q-BATCH-1', 'http://batch.com', 'PENDING', $1, '{}'::jsonb, NOW())`,
        [JSON.stringify({ graphUpdates: [u1, u2] })]
      );

      const res = await request(app).post('/api/review-queue/items/Q-BATCH-1/approve');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.queueItem.status).toBe('APPROVED');

      // Verify both notes in database
      const notesRes = await query(`SELECT id FROM notes WHERE id IN ('NOTE-B1', 'NOTE-B2')`);
      expect(notesRes.rows.length).toBe(2);
    });

    it('rejects an entire queue batch', async () => {
      const u1 = createGraphUpdate({
        type: 'NOTE_UPDATE',
        targetId: 'TOPIC-R1',
        targetName: 'Topic R1',
        title: 'Note R1',
        description: 'Desc',
        category: 'CS',
        oldContent: '',
        newContent: 'Content R1'
      });

      await query(
        `INSERT INTO ingest_review_queue (id, source_url, status, payload, audit_report, created_at)
         VALUES ('Q-BATCH-2', 'http://batch-reject.com', 'PENDING', $1, '{}'::jsonb, NOW())`,
        [JSON.stringify({ graphUpdates: [u1] })]
      );

      const res = await request(app).post('/api/review-queue/items/Q-BATCH-2/reject');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.queueItem.status).toBe('REJECTED');
    });
  });
});
