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

    it('filters todos by priority and combined queries', async () => {
      const resPriority = await request(app).get('/api/todos?priority=HIGH');
      expect(resPriority.status).toBe(200);
      expect(resPriority.body.every((t: any) => t.priority === 'HIGH')).toBe(true);

      const resCombined = await request(app).get(`/api/todos?completed=false&priority=HIGH&category=${encodeURIComponent('AI & ML')}`);
      expect(resCombined.status).toBe(200);
      expect(resCombined.body.length).toBe(1);
      expect(resCombined.body[0].id).toBe('TODO-001');
    });
  });

  describe('GET /api/todos/:id', () => {
    it('retrieves a single todo by ID', async () => {
      const res = await request(app).get('/api/todos/TODO-001');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('TODO-001');
      expect(res.body.title).toBe('Implement Autograd');
    });

    it('returns 404 for non-existent todo ID', async () => {
      const res = await request(app).get('/api/todos/TODO-999');
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
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
      expect(res.body.error).toContain('Foreign key constraint failed');
    });

    it('rejects todo creation with missing title or invalid category', async () => {
      const resMissingTitle = await request(app).post('/api/todos').send({
        category: 'CS'
      });
      expect(resMissingTitle.status).toBe(400);
      expect(resMissingTitle.body.error).toContain('Todo title is required');

      const resInvalidCat = await request(app).post('/api/todos').send({
        title: 'Valid Title',
        category: 'INVALID_CAT'
      });
      expect(resInvalidCat.status).toBe(400);
      expect(resInvalidCat.body.error).toContain('Invalid category');
    });
  });

  describe('PATCH /api/todos/:id', () => {
    it('toggles completion status back and forth and verifies persistence', async () => {
      // 1. Toggle to true
      const res1 = await request(app).patch('/api/todos/TODO-001').send({ completed: true });
      expect(res1.status).toBe(200);
      expect(res1.body.completed).toBe(true);

      // Verify persistence via GET
      const check1 = await request(app).get('/api/todos/TODO-001');
      expect(check1.body.completed).toBe(true);

      // 2. Toggle back to false
      const res2 = await request(app).patch('/api/todos/TODO-001').send({ completed: false });
      expect(res2.status).toBe(200);
      expect(res2.body.completed).toBe(false);

      // Verify persistence via GET
      const check2 = await request(app).get('/api/todos/TODO-001');
      expect(check2.body.completed).toBe(false);
    });

    it('sets, changes, and unsets linked topicId', async () => {
      // Link TODO-002 (currently unlinked) to TOPIC-002
      const linkRes = await request(app).patch('/api/todos/TODO-002').send({ topicId: 'TOPIC-002' });
      expect(linkRes.status).toBe(200);
      expect(linkRes.body.topicId).toBe('TOPIC-002');

      // Unlink topicId by setting to null
      const unlinkRes = await request(app).patch('/api/todos/TODO-002').send({ topicId: null });
      expect(unlinkRes.status).toBe(200);
      expect(unlinkRes.body.topicId).toBeUndefined();
    });

    it('updates todo title, category, priority, and dueDate', async () => {
      const res = await request(app).patch('/api/todos/TODO-001').send({
        title: 'Updated Todo Title',
        category: 'SYSTEMS',
        priority: 'LOW',
        dueDate: 'Next Week'
      });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Todo Title');
      expect(res.body.category).toBe('SYSTEMS');
      expect(res.body.priority).toBe('LOW');
      expect(res.body.dueDate).toBe('Next Week');
    });

    it('handles empty PATCH payload gracefully without altering todo', async () => {
      const res = await request(app).patch('/api/todos/TODO-001').send({});
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('TODO-001');
    });

    it('rejects PATCH with non-existent topicId or invalid priority', async () => {
      const resInvalidTopic = await request(app).patch('/api/todos/TODO-001').send({ topicId: 'TOPIC-999' });
      expect(resInvalidTopic.status).toBe(400);
      expect(resInvalidTopic.body.error).toContain('Foreign key constraint failed');

      const resInvalidPriority = await request(app).patch('/api/todos/TODO-001').send({ priority: 'CRITICAL' });
      expect(resInvalidPriority.status).toBe(400);
      expect(resInvalidPriority.body.error).toContain('Invalid priority');

      const resStringCompleted = await request(app).patch('/api/todos/TODO-001').send({ completed: 'false' });
      expect(resStringCompleted.status).toBe(400);
      expect(resStringCompleted.body.error).toContain('Completed must be a boolean value');
    });

    it('returns 404 when patching non-existent todo', async () => {
      const res = await request(app).patch('/api/todos/TODO-999').send({ completed: true });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/todos/:id', () => {
    it('deletes a study todo by ID', async () => {
      const res = await request(app).delete('/api/todos/TODO-001');
      expect(res.status).toBe(204);

      const check = await request(app).get('/api/todos/TODO-001');
      expect(check.status).toBe(404);
    });

    it('returns 404 when deleting non-existent todo', async () => {
      const res = await request(app).delete('/api/todos/TODO-999');
      expect(res.status).toBe(404);
    });
  });
});
