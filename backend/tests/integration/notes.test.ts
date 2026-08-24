import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { setupTestDatabase, seedBasicTestData } from '../helpers.js';

describe('Integration: Notes REST API (/api/topics/:id/notes & /api/notes)', () => {
  let db: any;

  beforeEach(() => {
    db = setupTestDatabase();
    seedBasicTestData(db);
  });

  describe('GET /api/topics/:topicId/notes', () => {
    it('returns all notes for a specific topic', async () => {
      const res = await request(app).get('/api/topics/TOPIC-001/notes');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe('NOTE-001');
      expect(res.body[0].title).toBe('Backprop Notes');
      expect(res.body[0].content).toContain('$$ E = mc^2 $$');
    });

    it('returns empty array for topic with no notes', async () => {
      const res = await request(app).get('/api/topics/TOPIC-002/notes');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('POST /api/topics/:topicId/notes', () => {
    it('creates a new note attached to a topic with KaTeX markdown payload', async () => {
      const notePayload = {
        title: 'Attention Mechanism & Multi-Head Projections',
        content: '# Self-Attention\n\n$$ \\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V $$',
        filename: 'attention.md'
      };

      const res = await request(app)
        .post('/api/topics/TOPIC-002/notes')
        .send(notePayload);

      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^NOTE-/);
      expect(res.body.title).toBe(notePayload.title);
      expect(res.body.filename).toBe('attention.md');
      expect(res.body.content).toContain('\\text{Attention}');

      // Verify note is now returned under topic
      const topicNotes = await request(app).get('/api/topics/TOPIC-002/notes');
      expect(topicNotes.body.length).toBe(1);
      expect(topicNotes.body[0].id).toBe(res.body.id);
    });

    it('preserves complex LaTeX equations with escapes, backslashes, and multiline markdown', async () => {
      const complexMathContent = [
        '# Loss Formulation',
        '$$\\mathcal{L}_{\\text{total}} = \\frac{1}{N} \\sum_{i=1}^N \\left( y_i - \\hat{y}_i \\right)^2 + \\lambda \\|\\mathbf{w}\\|_2^2$$',
        'Gradient step: $\\theta_{t+1} := \\theta_t - \\eta \\nabla_\\theta J(\\theta)$'
      ].join('\n\n');

      const createRes = await request(app)
        .post('/api/topics/TOPIC-001/notes')
        .send({
          title: 'Loss Formulations & Regularization',
          content: complexMathContent
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.content).toBe(complexMathContent);

      // Verify retrieval matches verbatim
      const getRes = await request(app).get(`/api/notes/${createRes.body.id}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.content).toBe(complexMathContent);
    });

    it('rejects note creation with missing or empty title', async () => {
      const res = await request(app)
        .post('/api/topics/TOPIC-001/notes')
        .send({ title: '   ', content: 'Some content' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Note title is required');
    });

    it('returns 400 when attaching a note to non-existent topic (foreign key violation)', async () => {
      const res = await request(app)
        .post('/api/topics/TOPIC-999/notes')
        .send({ title: 'Orphan Note' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Foreign key constraint failed');
    });
  });

  describe('GET /api/notes/:id', () => {
    it('retrieves a single note by ID', async () => {
      const res = await request(app).get('/api/notes/NOTE-001');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('NOTE-001');
      expect(res.body.title).toBe('Backprop Notes');
      expect(res.body.filename).toBe('backprop.md');
    });

    it('returns 404 for unknown note ID', async () => {
      const res = await request(app).get('/api/notes/NOTE-999');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/notes/:id', () => {
    it('updates note title and content, bumping updatedAt timestamp', async () => {
      const res = await request(app)
        .patch('/api/notes/NOTE-001')
        .send({
          title: 'Updated Backprop Derivation',
          content: 'New content with updated formulas.'
        });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('NOTE-001');
      expect(res.body.title).toBe('Updated Backprop Derivation');
      expect(res.body.content).toBe('New content with updated formulas.');
      expect(res.body.updatedAt).toBeDefined();
    });

    it('rejects PATCH with empty title', async () => {
      const res = await request(app)
        .patch('/api/notes/NOTE-001')
        .send({ title: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Title must be a non-empty string');
    });

    it('returns 404 when patching non-existent note', async () => {
      const res = await request(app)
        .patch('/api/notes/NOTE-999')
        .send({ title: 'Non-existent Note' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/notes/:id', () => {
    it('deletes a note by ID', async () => {
      const res = await request(app).delete('/api/notes/NOTE-001');
      expect(res.status).toBe(204);

      const check = await request(app).get('/api/notes/NOTE-001');
      expect(check.status).toBe(404);
    });

    it('returns 404 when deleting non-existent note', async () => {
      const res = await request(app).delete('/api/notes/NOTE-999');
      expect(res.status).toBe(404);
    });
  });
});
