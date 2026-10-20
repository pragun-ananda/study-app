import { query } from '../db.js';
import { generateEntityId } from '../utils/id.js';
import { toTopicDTO } from '../utils/mappers.js';
import {
  SM2Input,
  SM2Result,
  QuizAttemptRow,
  QuizAttemptDTO,
  TopicRow,
  TopicDTO,
  TopicStatus
} from '../types.js';

export const MIN_EASE_FACTOR = 1.30;
export const DEFAULT_EASE_FACTOR = 2.50;

/**
 * SuperMemo-2 (SM-2) Spaced Repetition Scheduling Algorithm
 * Computes interval progression, ease factor updates, and content mastery score.
 */
export function calculateSM2(input: SM2Input): SM2Result {
  const score = Math.max(0, Math.min(100, Number(input.score) || 0));
  const prevEF = Number(input.previousEaseFactor) || DEFAULT_EASE_FACTOR;
  const prevInterval = Math.max(1, Number(input.previousIntervalDays) || 1);
  const prevReps = Math.max(0, Number(input.previousRepetitionCount) || 0);
  const prevMastery = Math.max(0, Math.min(100, Number(input.previousMastery) || 0));

  // 1. Map score (0-100) to SM-2 quality grade q (0-5)
  let q = 0;
  if (score >= 90) q = 5;
  else if (score >= 80) q = 4;
  else if (score >= 70) q = 3;
  else if (score >= 60) q = 2;
  else if (score >= 40) q = 1;
  else q = 0;

  // 2. Calculate Ease Factor update: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const deltaEF = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  const newEF = Math.max(MIN_EASE_FACTOR, Number((prevEF + deltaEF).toFixed(2)));

  // 3. Interval calculation
  let repetitionCount: number;
  let intervalDays: number;

  if (q < 3) {
    // Failed recall: reset repetition chain
    repetitionCount = 1;
    intervalDays = 1;
  } else {
    // Successful recall
    repetitionCount = prevReps + 1;
    if (repetitionCount === 1) {
      intervalDays = 1;
    } else if (repetitionCount === 2) {
      intervalDays = 6;
    } else {
      intervalDays = Math.max(1, Math.round(prevInterval * newEF));
    }
  }

  // 4. Next due timestamp
  const now = Date.now();
  const nextDueAt = new Date(now + intervalDays * 24 * 60 * 60 * 1000);

  // 5. Mastery score (0-100) combining exponential smoothing and repetition depth
  let mastery: number;
  if (q >= 3) {
    const smoothed = prevMastery * 0.35 + score * 0.65;
    const streakBonus = Math.min(10, repetitionCount * 2);
    mastery = Math.min(100, smoothed + streakBonus);
  } else {
    // Recall failure penalty
    mastery = Math.max(0, (prevMastery * 0.5 + score * 0.5) * 0.8);
  }
  mastery = Number(mastery.toFixed(2));

  // 6. Topic Status
  let status: TopicStatus;
  if (mastery >= 85) {
    status = 'MASTERED';
  } else {
    status = 'LEARNING';
  }

  return {
    easeFactor: newEF,
    intervalDays,
    repetitionCount,
    nextDueAt,
    mastery,
    status
  };
}

export function toQuizAttemptDTO(row: QuizAttemptRow): QuizAttemptDTO {
  return {
    id: row.id,
    topicId: row.topic_id,
    quizId: row.quiz_id,
    score: Number(Number(row.score).toFixed(2)),
    easeFactor: Number(Number(row.ease_factor).toFixed(2)),
    intervalDays: Number(row.interval_days),
    repetitionCount: Number(row.repetition_count),
    reviewedAt: row.reviewed_at instanceof Date ? row.reviewed_at.toISOString() : String(row.reviewed_at),
    nextDueAt: row.next_due_at instanceof Date ? row.next_due_at.toISOString() : String(row.next_due_at)
  };
}

/**
 * Record a quiz attempt for a topic, update mastery, and schedule next review.
 */
export async function recordQuizAttempt(params: {
  topicId: string;
  quizId: string;
  score: number;
}): Promise<{ attempt: QuizAttemptDTO; sm2: SM2Result }> {
  const { topicId, quizId, score } = params;

  // 1. Fetch topic current mastery & status
  const topicRes = await query<TopicRow>('SELECT * FROM topics WHERE id = $1', [topicId]);
  if (!topicRes.rows || topicRes.rows.length === 0) {
    throw new Error(`Topic not found: ${topicId}`);
  }
  const currentTopic = topicRes.rows[0];

  // 2. Fetch latest previous attempt for this topic & quiz
  const prevRes = await query<QuizAttemptRow>(
    `SELECT * FROM quiz_attempts
     WHERE topic_id = $1 AND quiz_id = $2
     ORDER BY reviewed_at DESC
     LIMIT 1`,
    [topicId, quizId]
  );

  const prevAttempt = prevRes.rows && prevRes.rows.length > 0 ? prevRes.rows[0] : null;

  // 3. Compute SM-2 progression
  const sm2 = calculateSM2({
    score,
    previousEaseFactor: prevAttempt ? Number(prevAttempt.ease_factor) : DEFAULT_EASE_FACTOR,
    previousIntervalDays: prevAttempt ? Number(prevAttempt.interval_days) : 1,
    previousRepetitionCount: prevAttempt ? Number(prevAttempt.repetition_count) : 0,
    previousMastery: Number(currentTopic.mastery) || 0
  });

  // 4. Insert quiz attempt
  const attemptId = generateEntityId('ATTEMPT');
  const insertRes = await query<QuizAttemptRow>(
    `INSERT INTO quiz_attempts (id, topic_id, quiz_id, score, ease_factor, interval_days, repetition_count, reviewed_at, next_due_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
     RETURNING *`,
    [
      attemptId,
      topicId,
      quizId,
      score,
      sm2.easeFactor,
      sm2.intervalDays,
      sm2.repetitionCount,
      sm2.nextDueAt.toISOString()
    ]
  );

  // 5. Update topic mastery, status, and last_reviewed
  await query(
    `UPDATE topics
     SET mastery = $1,
         status = $2,
         last_reviewed = NOW()
     WHERE id = $3`,
    [sm2.mastery, sm2.status, topicId]
  );

  const row = insertRes.rows[0];
  return {
    attempt: toQuizAttemptDTO(row),
    sm2
  };
}

/**
 * Retrieve all topics due for review based on SM-2 scheduling or DUE status.
 */
export async function getDueTopics(): Promise<TopicDTO[]> {
  const res = await query<TopicRow>(
    `SELECT DISTINCT t.*
     FROM topics t
     LEFT JOIN (
       SELECT topic_id, MAX(next_due_at) AS latest_due
       FROM quiz_attempts
       GROUP BY topic_id
     ) qa ON qa.topic_id = t.id
     WHERE t.status = 'DUE'
        OR (qa.latest_due IS NOT NULL AND qa.latest_due <= NOW())
     ORDER BY t.mastery ASC`
  );

  const rows = res.rows || [];
  return rows.map((r) => toTopicDTO(r));
}

/**
 * Get all attempts for a given quiz.
 */
export async function getQuizAttempts(quizId: string): Promise<QuizAttemptDTO[]> {
  const res = await query<QuizAttemptRow>(
    `SELECT * FROM quiz_attempts
     WHERE quiz_id = $1
     ORDER BY reviewed_at DESC`,
    [quizId]
  );

  const rows = res.rows || [];
  return rows.map(toQuizAttemptDTO);
}
