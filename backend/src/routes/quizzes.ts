import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { handleDatabaseError } from '../utils/errors.js';
import { recordQuizAttempt, getQuizAttempts } from '../services/spacedRepetition.js';
import { QuizRow, QuizQuestionRow, QuizDTO, QuizQuestionDTO } from '../types.js';
import { generateEntityId } from '../utils/id.js';
import { validateQuizInput } from '../utils/validation.js';
import { toQuizDTO, toQuizQuestionDTO } from '../utils/mappers.js';

const router = Router();

export async function getQuizWithQuestions(id: string): Promise<QuizDTO | null> {
  const quizRes = await query<QuizRow>('SELECT * FROM quizzes WHERE id = $1', [id]);
  if (quizRes.rows.length === 0) return null;
  const quiz = quizRes.rows[0];
  const questionsRes = await query<QuizQuestionRow>(
    'SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY id ASC',
    [id]
  );
  return toQuizDTO(quiz, questionsRes.rows.map(toQuizQuestionDTO));
}

export async function createQuiz(input: {
  id?: string;
  topicId: string;
  sourceId?: string | null;
  title: string;
  description?: string | null;
  questions?: Array<any>;
}): Promise<QuizDTO> {
  const id = input.id && typeof input.id === 'string' ? input.id : generateEntityId('QUIZ');
  const now = new Date().toISOString();

  const quizRes = await query<QuizRow>(
    `INSERT INTO quizzes (id, topic_id, source_id, title, description, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, input.topicId, input.sourceId || null, input.title.trim(), input.description || null, now, now]
  );

  const createdQuiz = quizRes.rows[0];
  const questions: QuizQuestionDTO[] = [];

  if (Array.isArray(input.questions) && input.questions.length > 0) {
    for (let i = 0; i < input.questions.length; i++) {
      const q = input.questions[i];
      const qId = q.id && typeof q.id === 'string' ? q.id : generateEntityId('QUESTION');
      const qType = q.type || 'MCQ';
      const prompt = q.prompt || q.stem || q.statement || q.term || `Question ${i + 1}`;
      const correctAnswer = q.correctAnswer !== undefined ? String(q.correctAnswer) : '';
      const explanation = q.explanation || '';
      const difficulty = q.difficulty || 'MEDIUM';

      let payload: any = q.payload || {};
      if (q.options) payload.options = q.options;
      if (q.distractorExplanations) payload.distractorExplanations = q.distractorExplanations;
      if (q.pairs) payload.pairs = q.pairs;
      if (q.sequence) {
        payload.sequence = q.sequence;
        payload.orderedSequence = q.sequence;
      }
      if (q.term) payload.term = q.term;
      if (q.definition) payload.definition = q.definition;
      if (q.memorizationReason) payload.memorizationReason = q.memorizationReason;
      if (q.statement) payload.statement = q.statement;

      const qRes = await query<QuizQuestionRow>(
        `INSERT INTO quiz_questions (id, quiz_id, note_id, type, prompt, payload, correct_answer, explanation, difficulty, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [qId, id, q.noteId || null, qType, prompt, JSON.stringify(payload), correctAnswer, explanation, difficulty, now]
      );
      questions.push(toQuizQuestionDTO(qRes.rows[0]));
    }
  }

  return toQuizDTO(createdQuiz, questions);
}

// POST /api/quizzes - Create a new quiz manually or attached to a topic
router.post('/', async (req: Request, res: Response) => {
  try {
    const { topicId } = req.body || {};
    if (!topicId || typeof topicId !== 'string' || !topicId.trim()) {
      return res.status(400).json({ error: 'Topic ID is required' });
    }

    const topicRes = await query('SELECT id FROM topics WHERE id = $1', [topicId]);
    if (topicRes.rows.length === 0) {
      return res.status(404).json({ error: `Topic with id '${topicId}' not found` });
    }

    const validation = validateQuizInput(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    const quiz = await createQuiz({
      id: req.body.id,
      topicId,
      sourceId: req.body.sourceId,
      title: req.body.title,
      description: req.body.description,
      questions: req.body.questions
    });

    return res.status(201).json(quiz);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to create quiz');
  }
});

// GET /api/quizzes/topics/:topicId - Retrieve all quizzes for a specific topic
router.get('/topics/:topicId', async (req: Request, res: Response) => {
  try {
    const { topicId } = req.params;
    const quizRes = await query<QuizRow>(
      'SELECT * FROM quizzes WHERE topic_id = $1 ORDER BY updated_at DESC',
      [topicId]
    );

    const questionsRes = await query<QuizQuestionRow>(
      `SELECT qq.* FROM quiz_questions qq
       JOIN quizzes q ON qq.quiz_id = q.id
       WHERE q.topic_id = $1
       ORDER BY qq.id ASC`,
      [topicId]
    );

    const questionsByQuiz = new Map<string, QuizQuestionDTO[]>();
    questionsRes.rows.forEach((row) => {
      const q = toQuizQuestionDTO(row);
      if (!questionsByQuiz.has(row.quiz_id)) questionsByQuiz.set(row.quiz_id, []);
      questionsByQuiz.get(row.quiz_id)!.push(q);
    });

    const dtos: QuizDTO[] = quizRes.rows.map((row) =>
      toQuizDTO(row, questionsByQuiz.get(row.id) || [])
    );

    return res.json(dtos);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to retrieve quizzes for topic');
  }
});

// GET /api/quizzes/:id - Retrieve quiz with attached questions
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dto = await getQuizWithQuestions(id);
    if (!dto) {
      return res.status(404).json({ error: `Quiz with id '${id}' not found` });
    }
    return res.json(dto);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to retrieve quiz');
  }
});

// PATCH /api/quizzes/:id - Update quiz metadata or replace questions
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, questions } = req.body || {};

    const existingRes = await query<QuizRow>('SELECT * FROM quizzes WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: `Quiz with id '${id}' not found` });
    }

    const updates: string[] = ['updated_at = NOW()'];
    const params: any[] = [id];

    if (title !== undefined) {
      if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'Quiz title must be a non-empty string' });
      }
      params.push(title.trim());
      updates.push(`title = $${params.length}`);
    }

    if (description !== undefined) {
      params.push(description);
      updates.push(`description = $${params.length}`);
    }

    await query(`UPDATE quizzes SET ${updates.join(', ')} WHERE id = $1`, params);

    if (Array.isArray(questions)) {
      await query('DELETE FROM quiz_questions WHERE quiz_id = $1', [id]);
      const now = new Date().toISOString();
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const qId = q.id && typeof q.id === 'string' ? q.id : generateEntityId('QUESTION');
        const qType = q.type || 'MCQ';
        const prompt = q.prompt || q.stem || q.statement || q.term || `Question ${i + 1}`;
        const correctAnswer = q.correctAnswer !== undefined ? String(q.correctAnswer) : '';
        const explanation = q.explanation || '';
        const difficulty = q.difficulty || 'MEDIUM';

        let payload: any = q.payload || {};
        if (q.options) payload.options = q.options;
        if (q.distractorExplanations) payload.distractorExplanations = q.distractorExplanations;
        if (q.pairs) payload.pairs = q.pairs;
        if (q.sequence) {
          payload.sequence = q.sequence;
          payload.orderedSequence = q.sequence;
        }
        if (q.term) payload.term = q.term;
        if (q.definition) payload.definition = q.definition;
        if (q.memorizationReason) payload.memorizationReason = q.memorizationReason;
        if (q.statement) payload.statement = q.statement;

        await query(
          `INSERT INTO quiz_questions (id, quiz_id, note_id, type, prompt, payload, correct_answer, explanation, difficulty, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [qId, id, q.noteId || null, qType, prompt, JSON.stringify(payload), correctAnswer, explanation, difficulty, now]
        );
      }
    }

    const updated = await getQuizWithQuestions(id);
    return res.json(updated);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to update quiz');
  }
});

// DELETE /api/quizzes/:id - Delete quiz
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleteRes = await query('DELETE FROM quizzes WHERE id = $1 RETURNING id', [id]);
    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ error: `Quiz with id '${id}' not found` });
    }
    return res.status(204).send();
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to delete quiz');
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
