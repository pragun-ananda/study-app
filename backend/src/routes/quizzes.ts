import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { handleDatabaseError } from '../utils/errors.js';
import { recordQuizAttempt, getQuizAttempts } from '../services/spacedRepetition.js';
import { QuizRow, QuizQuestionRow, QuizDTO, QuizQuestionDTO } from '../types.js';

const router = Router();

// GET /api/quizzes/:id - Retrieve quiz with attached questions
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const quizRes = await query<QuizRow>('SELECT * FROM quizzes WHERE id = $1', [id]);
    if (quizRes.rows.length === 0) {
      return res.status(404).json({ error: `Quiz with id '${id}' not found` });
    }

    const quiz = quizRes.rows[0];
    const questionsRes = await query<QuizQuestionRow>(
      'SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY id ASC',
      [id]
    );

    const questions: QuizQuestionDTO[] = questionsRes.rows.map((q) => ({
      id: q.id,
      quizId: q.quiz_id,
      noteId: q.note_id || undefined,
      type: q.type,
      prompt: q.prompt,
      payload: q.payload,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      createdAt: q.created_at instanceof Date ? q.created_at.toISOString() : String(q.created_at)
    }));

    const dto: QuizDTO = {
      id: quiz.id,
      topicId: quiz.topic_id,
      sourceId: quiz.source_id || undefined,
      title: quiz.title,
      description: quiz.description || undefined,
      questions,
      createdAt: quiz.created_at instanceof Date ? quiz.created_at.toISOString() : String(quiz.created_at),
      updatedAt: quiz.updated_at instanceof Date ? quiz.updated_at.toISOString() : String(quiz.updated_at)
    };

    return res.json(dto);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to retrieve quiz');
  }
});

// GET /api/quizzes/:id/attempts - Retrieve attempt history for a quiz
router.get('/:id/attempts', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const attempts = await getQuizAttempts(id);
    return res.json(attempts);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to retrieve quiz attempts');
  }
});

// POST /api/quizzes/:id/attempt - Record a quiz attempt and update spaced repetition mastery
router.post('/:id/attempt', async (req: Request, res: Response) => {
  try {
    const { id: quizId } = req.params;
    const { score, topicId: providedTopicId } = req.body || {};

    if (score === undefined || score === null || isNaN(Number(score))) {
      return res.status(400).json({ error: 'Score is required and must be a number between 0 and 100' });
    }

    const numericScore = Number(score);
    if (numericScore < 0 || numericScore > 100) {
      return res.status(400).json({ error: 'Score must be between 0 and 100' });
    }

    let topicId = providedTopicId;
    if (!topicId) {
      const quizRes = await query<QuizRow>('SELECT topic_id FROM quizzes WHERE id = $1', [quizId]);
      if (quizRes.rows.length === 0) {
        return res.status(404).json({ error: `Quiz with id '${quizId}' not found` });
      }
      topicId = quizRes.rows[0].topic_id;
    }

    const result = await recordQuizAttempt({
      topicId,
      quizId,
      score: numericScore
    });

    return res.status(201).json({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    if (error?.message?.includes('Topic not found') || error?.message?.includes('Quiz not found')) {
      return res.status(404).json({ error: error.message });
    }
    return handleDatabaseError(res, error, 'Failed to record quiz attempt');
  }
});

export default router;
