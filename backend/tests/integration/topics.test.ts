import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { setupTestDatabase, seedBasicTestData } from '../helpers.js';

describe('Integration: Topics REST API (/api/topics)', () => {
  let db: any;

  beforeEach(() => {
    db = setupTestDatabase();
    seedBasicTestData(db);
  });

  describe('GET /api/topics', () => {
    it('returns all topics with populated prerequisites, unlocks, and attached notes', async () => {
      const res = await request(app).get('/api/topics');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3);

      const backprop = res.body.find((t: any) => t.id === 'TOPIC-001');
      expect(backprop).toBeDefined();
      expect(backprop.name).toBe('Neural Network Backpropagation');
      expect(backprop.category).toBe('AI & ML');
      expect(backprop.mastery).toBe(80);
      expect(backprop.status).toBe('MASTERED');
      expect(backprop.coordinates).toEqual([10, 5, 2]);
      expect(backprop.unlocks).toContain('TOPIC-002');
      expect(backprop.notes.length).toBe(1);
      expect(backprop.notes[0].title).toBe('Backprop Notes');
      expect(backprop.notes[0].content).toContain('$$ E = mc^2 $$');

      const transformer = res.body.find((t: any) => t.id === 'TOPIC-002');
      expect(transformer.prerequisites).toContain('TOPIC-001');
    });

    it('filters topics by category', async () => {
      const res = await request(app).get('/api/topics?category=CS');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Binary Search Trees');
    });

    it('filters topics by status', async () => {
      const res = await request(app).get('/api/topics?status=MASTERED');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe('TOPIC-001');
    });

    it('filters topics by combined category and status query params', async () => {
      const res = await request(app).get(`/api/topics?category=${encodeURIComponent('AI & ML')}&status=MASTERED`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe('TOPIC-001');
    });

    it('returns empty array when filter matches no topics', async () => {
      const res = await request(app).get('/api/topics?category=PHYSICS');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/topics/:id', () => {
    it('retrieves a single topic by ID with its details', async () => {
      const res = await request(app).get('/api/topics/TOPIC-001');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('TOPIC-001');
      expect(res.body.name).toBe('Neural Network Backpropagation');
      expect(res.body.unlocks).toContain('TOPIC-002');
      expect(res.body.notes.length).toBe(1);
    });

    it('returns 404 for non-existent topic ID', async () => {
      const res = await request(app).get('/api/topics/TOPIC-999');
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });
  });

  describe('POST /api/topics', () => {
    it('creates a new topic with custom coordinates and category', async () => {
      const newTopic = {
        name: 'Quantum Key Distribution',
        category: 'CYBERSECURITY',
        summary: 'BB84 photon polarization protocol.',
        mastery: 15,
        status: 'NEW',
        coordinates: [-5.5, 12.0, 3.4],
        lastReviewed: 'Never'
      };

      const res = await request(app).post('/api/topics').send(newTopic);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Quantum Key Distribution');
      expect(res.body.category).toBe('CYBERSECURITY');
      expect(res.body.mastery).toBe(15);
      expect(res.body.coordinates).toEqual([-5.5, 12.0, 3.4]);
      expect(res.body.lastReviewed).toBe('Never');
      expect(res.body.prerequisites).toEqual([]);
      expect(res.body.unlocks).toEqual([]);
    });

    it('handles boundary mastery values (0 and 100)', async () => {
      const resMin = await request(app).post('/api/topics').send({
        name: 'Zero Mastery Topic',
        category: 'CS',
        mastery: 0
      });
      expect(resMin.status).toBe(201);
      expect(resMin.body.mastery).toBe(0);

      const resMax = await request(app).post('/api/topics').send({
        name: 'Max Mastery Topic',
        category: 'CS',
        mastery: 100
      });
      expect(resMax.status).toBe(201);
      expect(resMax.body.mastery).toBe(100);
    });

    it('rejects creation with invalid category', async () => {
      const res = await request(app).post('/api/topics').send({
        name: 'Invalid Category Topic',
        category: 'INVALID_CATEGORY'
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid category');
    });

    it('rejects out of bounds mastery', async () => {
      const resNegative = await request(app).post('/api/topics').send({
        name: 'Negative Mastery',
        category: 'CS',
        mastery: -1
      });
      expect(resNegative.status).toBe(400);
      expect(resNegative.body.error).toContain('Mastery must be a number between 0 and 100');

      const resOver = await request(app).post('/api/topics').send({
        name: 'Over Mastery',
        category: 'CS',
        mastery: 101
      });
      expect(resOver.status).toBe(400);
    });

    it('rejects malformed coordinate arrays', async () => {
      const malformedPayloads = [
        { coordinates: [] },
        { coordinates: [1, 2] },
        { coordinates: [1, 2, 'three'] },
        { coordinates: [1, 2, 3, 4] }
      ];

      for (const payload of malformedPayloads) {
        const res = await request(app).post('/api/topics').send({
          name: 'Invalid Coords',
          category: 'MATH',
          ...payload
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Coordinates must be an array of three numbers');
      }
    });
  });

  describe('PATCH /api/topics/:id', () => {
    it('updates topic mastery, status, and summary', async () => {
      const res = await request(app).patch('/api/topics/TOPIC-002').send({
        mastery: 92,
        status: 'MASTERED',
        summary: 'Updated summary description.',
        lastReviewed: '2026-08-24T12:00:00Z'
      });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('TOPIC-002');
      expect(res.body.mastery).toBe(92);
      expect(res.body.status).toBe('MASTERED');
      expect(res.body.summary).toBe('Updated summary description.');
      expect(res.body.lastReviewed).toBe('2026-08-24T12:00:00.000Z');
    });

    it('handles empty PATCH body gracefully without modifying topic', async () => {
      const res = await request(app).patch('/api/topics/TOPIC-001').send({});
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('TOPIC-001');
      expect(res.body.name).toBe('Neural Network Backpropagation');
      expect(res.body.mastery).toBe(80);
      expect(res.body.unlocks).toContain('TOPIC-002');
    });

    it('returns 400 on invalid field updates during PATCH', async () => {
      const resName = await request(app).patch('/api/topics/TOPIC-001').send({ name: '   ' });
      expect(resName.status).toBe(400);

      const resCat = await request(app).patch('/api/topics/TOPIC-001').send({ category: 'INVALID_CAT' });
      expect(resCat.status).toBe(400);

      const resMastery = await request(app).patch('/api/topics/TOPIC-001').send({ mastery: -10 });
      expect(resMastery.status).toBe(400);

      const resCoords = await request(app).patch('/api/topics/TOPIC-001').send({ coordinates: [1, 2] });
      expect(resCoords.status).toBe(400);
    });

    it('returns 404 when patching non-existent topic', async () => {
      const res = await request(app).patch('/api/topics/TOPIC-999').send({ mastery: 50 });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/topics/:id', () => {
    it('deletes topic and cascades deletion to prerequisites and notes', async () => {
      const res = await request(app).delete('/api/topics/TOPIC-001');
      expect(res.status).toBe(204);

      // Verify topic is gone
      const checkTopic = await request(app).get('/api/topics/TOPIC-001');
      expect(checkTopic.status).toBe(404);

      // Verify notes are cascade deleted
      const checkNote = await request(app).get('/api/notes/NOTE-001');
      expect(checkNote.status).toBe(404);

      // Verify prerequisite edge is removed
      const checkPrereqs = await request(app).get('/api/topics/TOPIC-002');
      expect(checkPrereqs.body.prerequisites).toEqual([]);

      // Verify study todo topicId was set to NULL (loose coupling)
      const checkTodo = await request(app).get('/api/todos/TODO-001');
      expect(checkTodo.status).toBe(200);
      expect(checkTodo.body.topicId).toBeUndefined();
    });

    it('returns 404 when deleting a non-existent topic', async () => {
      const res = await request(app).delete('/api/topics/TOPIC-999');
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });
  });
});
