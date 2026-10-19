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

  describe('Manual Quiz Creation & Management (REST API)', () => {
    it('creates a new quiz with diverse question types via POST /api/quizzes', async () => {
      const payload = {
        topicId: 'TOPIC-002',
        title: 'Attention Mechanisms Deep Dive',
        description: 'Covers scaled dot-product attention and multi-head attention',
        questions: [
          {
            type: 'MCQ',
            prompt: 'What scaling factor is used in scaled dot-product attention?',
            options: { A: 'sqrt(d_k)', B: 'd_k^2', C: 'log(d_k)', D: '1/d_k' },
            correctAnswer: 'A',
            explanation: 'We divide by sqrt(d_k) to counteract small gradients for large dimensions.',
            difficulty: 'MEDIUM'
          },
          {
            type: 'TRUE_FALSE',
            prompt: 'Cross-attention uses queries from the decoder and keys/values from the encoder.',
            correctAnswer: 'true',
            explanation: 'Cross-attention connects decoder representations to encoder outputs.',
            difficulty: 'EASY'
          },
          {
            type: 'FLASHCARD',
            term: 'Softmax temperature',
            definition: 'A hyperparameter controlling the sharpness of attention distribution.',
            memorizationReason: 'Frequently tuned during LLM sampling.',
            difficulty: 'HARD'
          }
        ]
      };

      const res = await request(app).post('/api/quizzes').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.topicId).toBe('TOPIC-002');
      expect(res.body.title).toBe('Attention Mechanisms Deep Dive');
      expect(res.body.questions.length).toBe(3);
      expect(res.body.questions[0].type).toBe('MCQ');
      expect(res.body.questions[1].type).toBe('TRUE_FALSE');
      expect(res.body.questions[2].type).toBe('FLASHCARD');

      // Verify it is queryable via GET /api/quizzes/:id
      const getRes = await request(app).get(`/api/quizzes/${res.body.id}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.title).toBe('Attention Mechanisms Deep Dive');
      expect(getRes.body.questions.length).toBe(3);
    });

    it('creates a quiz scoped to a topic via POST /api/topics/:id/quizzes', async () => {
      const res = await request(app)
        .post('/api/topics/TOPIC-002/quizzes')
        .send({
          title: 'Direct Topic Quiz',
          questions: [
            {
              type: 'MCQ',
              prompt: 'Is this topic scoped?',
              correctAnswer: 'Yes',
              explanation: 'Created through topic endpoint'
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.topicId).toBe('TOPIC-002');
      expect(res.body.title).toBe('Direct Topic Quiz');
    });

    it('rejects quiz creation with missing or empty title', async () => {
      const res = await request(app).post('/api/quizzes').send({
        topicId: 'TOPIC-002',
        title: '   '
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Quiz title is required');
    });

    it('rejects quiz creation for nonexistent topic', async () => {
      const res = await request(app).post('/api/quizzes').send({
        topicId: 'NONEXISTENT_TOPIC',
        title: 'Ghost Quiz'
      });
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('retrieves all quizzes for a topic via GET /api/quizzes/topics/:topicId', async () => {
      const res = await request(app).get('/api/quizzes/topics/TOPIC-002');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body.some((q: any) => q.id === 'QUIZ-INT-1')).toBe(true);
    });

    it('updates quiz title, description, and replaces questions via PATCH /api/quizzes/:id', async () => {
      const patchRes = await request(app)
        .patch('/api/quizzes/QUIZ-INT-1')
        .send({
          title: 'Updated Transformer Quiz Title',
          questions: [
            {
              type: 'MCQ',
              prompt: 'Brand new prompt?',
              correctAnswer: 'New Answer',
              explanation: 'Updated question set',
              difficulty: 'EASY'
            }
          ]
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.title).toBe('Updated Transformer Quiz Title');
      expect(patchRes.body.questions.length).toBe(1);
      expect(patchRes.body.questions[0].prompt).toBe('Brand new prompt?');
    });

    it('deletes quiz and cascades via DELETE /api/quizzes/:id', async () => {
      const delRes = await request(app).delete('/api/quizzes/QUIZ-INT-1');
      expect(delRes.status).toBe(204);

      const getRes = await request(app).get('/api/quizzes/QUIZ-INT-1');
      expect(getRes.status).toBe(404);
    });
  });
});
