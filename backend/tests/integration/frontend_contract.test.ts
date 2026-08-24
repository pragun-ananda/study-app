import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { app } from '../../src/app.js';
import { setupTestDatabase } from '../helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Integration: Frontend Seamless Contract Compatibility', () => {
  beforeEach(() => {
    const db = setupTestDatabase();
    // Load full production seed data into in-memory Postgres
    const seedPath = path.resolve(__dirname, '../../../storage/seeds/seed_test_db.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    db.public.none(seedSql);
  });

  it('GET /api/topics returns all 187 cosmos topics matching frontend TopicNode interface', async () => {
    const res = await request(app).get('/api/topics');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(187);

    // Verify every single topic node satisfies the frontend TopicNode structure
    const validCategories = new Set(['CS', 'AI & ML', 'MATH', 'PHYSICS', 'SYSTEMS', 'CYBERSECURITY', 'ARCH']);
    const validStatuses = new Set(['DUE', 'LEARNING', 'MASTERED', 'NEW']);

    for (const node of res.body) {
      // id
      expect(typeof node.id).toBe('string');
      expect(node.id).toMatch(/^TOPIC-\d{3}$/);

      // name & summary
      expect(typeof node.name).toBe('string');
      expect(node.name.length).toBeGreaterThan(0);
      expect(typeof node.summary).toBe('string');

      // category & status
      expect(validCategories.has(node.category)).toBe(true);
      expect(validStatuses.has(node.status)).toBe(true);

      // mastery
      expect(typeof node.mastery).toBe('number');
      expect(node.mastery).toBeGreaterThanOrEqual(0);
      expect(node.mastery).toBeLessThanOrEqual(100);

      // 3D coordinates [x, y, z]
      expect(Array.isArray(node.coordinates)).toBe(true);
      expect(node.coordinates.length).toBe(3);
      for (const coord of node.coordinates) {
        expect(typeof coord).toBe('number');
        expect(isNaN(coord)).toBe(false);
      }

      // lastReviewed string
      expect(typeof node.lastReviewed).toBe('string');

      // prerequisites & unlocks arrays
      expect(Array.isArray(node.prerequisites)).toBe(true);
      expect(Array.isArray(node.unlocks)).toBe(true);

      // notes array
      expect(Array.isArray(node.notes)).toBe(true);
      for (const note of node.notes) {
        expect(typeof note.id).toBe('string');
        expect(typeof note.title).toBe('string');
        expect(typeof note.content).toBe('string');
        if (note.filename) expect(typeof note.filename).toBe('string');
      }
    }
  });

  it('GET /api/topics hydrates notes with KaTeX math and complex code blocks verbatim', async () => {
    const res = await request(app).get('/api/topics');
    expect(res.status).toBe(200);

    const backpropTopic = res.body.find((t: any) => t.name === 'Neural Network Backpropagation');
    expect(backpropTopic).toBeDefined();
    expect(backpropTopic.notes.length).toBe(1);

    const note = backpropTopic.notes[0];
    expect(note.title).toBe('Backpropagation Derivation Notes');
    expect(note.filename).toBe('backpropagation.md');
    expect(note.content).toContain('$$ Z^{[l]} = W^{[l]} A^{[l-1]} + b^{[l]} $$');
    expect(note.content).toContain('```python');
    expect(note.content).toContain('def backward_propagation(dAL, caches):');
  });

  it('GET /api/todos returns all 5 seed study todos matching frontend StudyTodo interface', async () => {
    const res = await request(app).get('/api/todos');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(5);

    const validPriorities = new Set(['HIGH', 'MEDIUM', 'LOW']);

    for (const todo of res.body) {
      expect(typeof todo.id).toBe('string');
      expect(typeof todo.title).toBe('string');
      expect(typeof todo.completed).toBe('boolean');
      expect(typeof todo.category).toBe('string');
      expect(validPriorities.has(todo.priority)).toBe(true);
      expect(typeof todo.dueDate).toBe('string');
      if (todo.topicId) {
        expect(typeof todo.topicId).toBe('string');
      }
    }
  });
});
