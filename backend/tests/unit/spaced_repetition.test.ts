import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDatabase } from '../helpers.js';
import { query } from '../../src/db.js';
import {
  calculateSM2,
  recordQuizAttempt,
  getDueTopics,
  getQuizAttempts,
  MIN_EASE_FACTOR,
  DEFAULT_EASE_FACTOR
} from '../../src/services/spacedRepetition.js';
import { TopicRow } from '../../src/types.js';

describe('Unit: Spaced Repetition Service (src/services/spacedRepetition.ts)', () => {
  describe('calculateSM2 algorithm', () => {
    it('schedules 1st review with interval 1 day and increases ease factor for score >= 90', () => {
      const result = calculateSM2({
        score: 95,
        previousEaseFactor: 2.50,
        previousIntervalDays: 1,
        previousRepetitionCount: 0,
        previousMastery: 0
      });

      expect(result.easeFactor).toBe(2.60);
      expect(result.intervalDays).toBe(1);
      expect(result.repetitionCount).toBe(1);
      expect(result.mastery).toBeGreaterThan(60);
      expect(result.status).toBe('LEARNING');
      expect(result.nextDueAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('schedules 2nd review with interval 6 days on consecutive success', () => {
      const result = calculateSM2({
        score: 90,
        previousEaseFactor: 2.60,
        previousIntervalDays: 1,
        previousRepetitionCount: 1,
        previousMastery: 65
      });

      expect(result.intervalDays).toBe(6);
      expect(result.repetitionCount).toBe(2);
      expect(result.easeFactor).toBe(2.70);
      expect(result.mastery).toBeGreaterThanOrEqual(85);
      expect(result.status).toBe('MASTERED');
    });

    it('schedules 3rd review using interval * easeFactor', () => {
      const result = calculateSM2({
        score: 92,
        previousEaseFactor: 2.70,
        previousIntervalDays: 6,
        previousRepetitionCount: 2,
        previousMastery: 85
      });

      expect(result.repetitionCount).toBe(3);
      // Math.round(6 * 2.80) = 17
      expect(result.intervalDays).toBe(Math.round(6 * result.easeFactor));
      expect(result.mastery).toBeGreaterThanOrEqual(85);
      expect(result.status).toBe('MASTERED');
    });

    it('resets repetition and interval to 1 on failed recall (score < 60) and penalizes mastery', () => {
      const result = calculateSM2({
        score: 30,
        previousEaseFactor: 2.50,
        previousIntervalDays: 16,
        previousRepetitionCount: 3,
        previousMastery: 88
      });

      expect(result.repetitionCount).toBe(1);
      expect(result.intervalDays).toBe(1);
      expect(result.easeFactor).toBeLessThan(2.50);
      expect(result.mastery).toBeLessThan(60);
      expect(result.status).toBe('LEARNING');
    });

    it('enforces MIN_EASE_FACTOR boundary (1.30)', () => {
      let ef = 1.40;
      for (let i = 0; i < 5; i++) {
        const res = calculateSM2({
          score: 10,
          previousEaseFactor: ef,
          previousIntervalDays: 1,
          previousRepetitionCount: 1,
          previousMastery: 20
        });
        ef = res.easeFactor;
      }

      expect(ef).toBe(MIN_EASE_FACTOR);
    });

    it('clamps scores outside 0-100 gracefully', () => {
      const low = calculateSM2({ score: -50 });
      expect(low.repetitionCount).toBe(1);
      expect(low.intervalDays).toBe(1);

      const high = calculateSM2({ score: 150 });
      expect(high.repetitionCount).toBe(1);
      expect(high.intervalDays).toBe(1);
      expect(high.mastery).toBeLessThanOrEqual(100);
    });
  });

  describe('Database Persistence & State Transitions', () => {
    beforeEach(() => {
      const db = setupTestDatabase();
      db.public.none(`
        INSERT INTO topics (id, name, category, summary, mastery, status, coord_x, coord_y, coord_z)
        VALUES ('TOPIC-SM-1', 'Transformer Architecture', 'AI & ML', 'Self-attention transformers.', 0.00, 'NEW', 0, 0, 0);

        INSERT INTO quizzes (id, topic_id, title)
        VALUES ('QUIZ-SM-1', 'TOPIC-SM-1', 'Transformer Knowledge Check');
      `);
    });

    it('persists quiz attempt, updates topic mastery, status, and last_reviewed', async () => {
      const res = await recordQuizAttempt({
        topicId: 'TOPIC-SM-1',
        quizId: 'QUIZ-SM-1',
        score: 85
      });

      expect(res.attempt.id).toMatch(/^ATTEMPT-/);
      expect(res.attempt.topicId).toBe('TOPIC-SM-1');
      expect(res.attempt.quizId).toBe('QUIZ-SM-1');
      expect(res.attempt.score).toBe(85);
      expect(res.attempt.repetitionCount).toBe(1);
      expect(res.attempt.intervalDays).toBe(1);

      // Verify DB topic state
      const topicRes = await query<TopicRow>('SELECT * FROM topics WHERE id = $1', ['TOPIC-SM-1']);
      expect(topicRes.rows[0].status).toBe('LEARNING');
      expect(Number(topicRes.rows[0].mastery)).toBe(res.sm2.mastery);
      expect(topicRes.rows[0].last_reviewed).not.toBeNull();
    });

    it('progresses to MASTERED on second high-score attempt', async () => {
      // First attempt
      await recordQuizAttempt({
        topicId: 'TOPIC-SM-1',
        quizId: 'QUIZ-SM-1',
        score: 95
      });

      // Second attempt
      const secondRes = await recordQuizAttempt({
        topicId: 'TOPIC-SM-1',
        quizId: 'QUIZ-SM-1',
        score: 95
      });

      expect(secondRes.attempt.repetitionCount).toBe(2);
      expect(secondRes.attempt.intervalDays).toBe(6);
      expect(secondRes.sm2.status).toBe('MASTERED');

      const topicRes = await query<TopicRow>('SELECT * FROM topics WHERE id = $1', ['TOPIC-SM-1']);
      expect(topicRes.rows[0].status).toBe('MASTERED');
      expect(Number(topicRes.rows[0].mastery)).toBeGreaterThanOrEqual(85);
    });

    it('retrieves attempt history via getQuizAttempts', async () => {
      await recordQuizAttempt({ topicId: 'TOPIC-SM-1', quizId: 'QUIZ-SM-1', score: 70 });
      await recordQuizAttempt({ topicId: 'TOPIC-SM-1', quizId: 'QUIZ-SM-1', score: 90 });

      const attempts = await getQuizAttempts('QUIZ-SM-1');
      expect(attempts.length).toBe(2);
      expect(attempts[0].score).toBe(90);
      expect(attempts[1].score).toBe(70);
    });

    it('getDueTopics returns topics with DUE status or expired review dates', async () => {
      // Insert another topic with DUE status
      await query(`
        INSERT INTO topics (id, name, category, summary, mastery, status, coord_x, coord_y, coord_z)
        VALUES ('TOPIC-DUE-1', 'Binary Search', 'CS', 'Divide and conquer search.', 40.00, 'DUE', 0, 0, 0)
      `);

      const dueTopics = await getDueTopics();
      expect(dueTopics.length).toBeGreaterThan(0);
      expect(dueTopics.some((t) => t.id === 'TOPIC-DUE-1')).toBe(true);
    });
  });
});
