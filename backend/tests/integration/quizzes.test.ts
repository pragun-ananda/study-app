import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { setupTestDatabase, seedBasicTestData } from '../helpers.js';

describe('Integration: Quizzes & Spaced Repetition REST API (/api/quizzes & /api/topics/due)', () => {
  let db: any;

  beforeEach(() => {
    db = setupTestDatabase();
    seedBasicTestData(db);

    db.public.none(`
      INSERT INTO quizzes (id, topic_id, title, description)
      VALUES ('QUIZ-INT-1', 'TOPIC-002', 'Transformer Self-Attention Assessment', 'Challenging questions on QKV projections.');

      INSERT INTO quiz_questions (id, quiz_id, type, prompt, correct_answer, explanation, difficulty)
      VALUES ('Q-01', 'QUIZ-INT-1', 'MCQ', 'What is the attention formula?', 'softmax(QK^T / sqrt(d_k))V', 'Scaled dot product', 'MEDIUM');
    `);
  });

  describe('GET /api/quizzes/:id', () => {
    it('returns quiz details with questions and status 200', async () => {
      const res = await request(app).get('/api/quizzes/QUIZ-INT-1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('QUIZ-INT-1');
      expect(res.body.topicId).toBe('TOPIC-002');
      expect(res.body.title).toContain('Transformer Self-Attention');
      expect(Array.isArray(res.body.questions)).toBe(true);
      expect(res.body.questions.length).toBe(1);
      expect(res.body.questions[0].prompt).toContain('attention formula');
    });

    it('returns 404 when quiz does not exist', async () => {
      const res = await request(app).get('/api/quizzes/NONEXISTENT');
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });
  });

  describe('POST /api/quizzes/:id/attempt', () => {
    it('records quiz attempt and updates topic mastery and status (BAC-33)', async () => {
      const res = await request(app)
        .post('/api/quizzes/QUIZ-INT-1/attempt')
        .send({ score: 90 });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.attempt).toBeDefined();
      expect(res.body.data.attempt.score).toBe(90);
      expect(res.body.data.attempt.repetitionCount).toBe(1);
      expect(res.body.data.attempt.intervalDays).toBe(1);
      expect(res.body.data.sm2).toBeDefined();
      expect(res.body.data.sm2.mastery).toBeGreaterThan(0);

      // Verify topic was updated
      const topicRes = await request(app).get('/api/topics/TOPIC-002');
      expect(topicRes.status).toBe(200);
      expect(topicRes.body.lastReviewed).not.toBe('Never');
      expect(topicRes.body.mastery).toBe(res.body.data.sm2.mastery);
    });

    it('rejects attempt with invalid score (< 0 or > 100 or missing)', async () => {
      const resLow = await request(app)
        .post('/api/quizzes/QUIZ-INT-1/attempt')
        .send({ score: -5 });
      expect(resLow.status).toBe(400);

      const resHigh = await request(app)
        .post('/api/quizzes/QUIZ-INT-1/attempt')
        .send({ score: 105 });
      expect(resHigh.status).toBe(400);

      const resMissing = await request(app)
        .post('/api/quizzes/QUIZ-INT-1/attempt')
        .send({});
      expect(resMissing.status).toBe(400);
    });

    it('returns 404 when recording attempt on non-existent quiz', async () => {
      const res = await request(app)
        .post('/api/quizzes/QUIZ-GHOST/attempt')
        .send({ score: 85 });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/quizzes/:id/attempts', () => {
    it('returns array of historical attempts for quiz', async () => {
      await request(app).post('/api/quizzes/QUIZ-INT-1/attempt').send({ score: 80 });
      await request(app).post('/api/quizzes/QUIZ-INT-1/attempt').send({ score: 95 });

      const res = await request(app).get('/api/quizzes/QUIZ-INT-1/attempts');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0].score).toBe(95);
      expect(res.body[1].score).toBe(80);
    });
  });

  describe('GET /api/topics/due', () => {
    it('returns topics due for spaced repetition review', async () => {
      // Mark TOPIC-003 as DUE
      db.public.none("UPDATE topics SET status = 'DUE' WHERE id = 'TOPIC-003'");

      const res = await request(app).get('/api/topics/due');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((t: any) => t.id === 'TOPIC-003')).toBe(true);
    });
  });
});
