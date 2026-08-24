import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { setupTestDatabase, seedBasicTestData } from '../helpers.js';

describe('Integration: Study Todos REST API (/api/todos)', () => {
  let db: any;

  beforeEach(() => {
    db = setupTestDatabase();
    seedBasicTestData(db);
  });

  describe('GET /api/todos', () => {
    it('lists all study todos', async () => {
      const res = await request(app).get('/api/todos');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);

      const todo1 = res.body.find((t: any) => t.id === 'TODO-001');
      expect(todo1).toBeDefined();
      expect(todo1.title).toBe('Implement Autograd');
      expect(todo1.topicId).toBe('TOPIC-001');
      expect(todo1.completed).toBe(false);

      const todo2 = res.body.find((t: any) => t.id === 'TODO-002');
      expect(todo2.topicId).toBeUndefined();
      expect(todo2.completed).toBe(true);
    });

    it('filters todos by completion state', async () => {
      const activeRes = await request(app).get('/api/todos?completed=false');
      expect(activeRes.status).toBe(200);
      expect(activeRes.body.length).toBe(1);
      expect(activeRes.body[0].id).toBe('TODO-001');

      const completedRes = await request(app).get('/api/todos?completed=true');
      expect(completedRes.status).toBe(200);
      expect(completedRes.body.length).toBe(1);
      expect(completedRes.body[0].id).toBe('TODO-002');
    });

    it('filters todos by category', async () => {
      const res = await request(app).get('/api/todos?category=MATH');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Review Math Notes');
    });
  });

  describe('POST /api/todos', () => {
    it('creates a new study todo with optional linked topicId', async () => {
      const newTodo = {
        title: 'Review Transformer Multi-Head Math',
        category: 'AI & ML',
        priority: 'HIGH',
        dueDate: 'Today',
        topicId: 'TOPIC-002'
      };

      const res = await request(app).post('/api/todos').send(newTodo);

      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^TODO-/);
      expect(res.body.title).toBe(newTodo.title);
      expect(res.body.category).toBe('AI & ML');
      expect(res.body.priority).toBe('HIGH');
      expect(res.body.completed).toBe(false);
      expect(res.body.topicId).toBe('TOPIC-002');
    });

    it('rejects todo creation when referencing non-existent topicId', async () => {
      const res = await request(app).post('/api/todos').send({
        title: 'Invalid Topic Todo',
        category: 'CS',
        topicId: 'TOPIC-999'
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('does not exist');
    });
  });

  describe('PATCH /api/todos/:id', () => {
    it('toggles completion status and updates priority', async () => {
      const res = await request(app)
        .patch('/api/todos/TODO-001')
        .send({ completed: true, priority: 'MEDIUM' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('TODO-001');
      expect(res.body.completed).toBe(true);
      expect(res.body.priority).toBe('MEDIUM');
    });
  });

  describe('DELETE /api/todos/:id', () => {
    it('deletes a study todo by ID', async () => {
      const res = await request(app).delete('/api/todos/TODO-001');
      expect(res.status).toBe(204);

      const check = await request(app).get('/api/todos/TODO-001');
      expect(check.status).toBe(404);
    });
  });
});
