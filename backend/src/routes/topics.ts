import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { TopicRow, NoteRow, TopicPrerequisiteRow, QuizRow, QuizQuestionRow } from '../types.js';
import { toTopicDTO, toNoteDTO, toQuizDTO, toQuizQuestionDTO } from '../utils/mappers.js';
import {
  validateTopicInput,
  validateQuizInput,
  isValidCategory,
  isValidStatus,
  isValidMastery,
  validateLastReviewed
} from '../utils/validation.js';
import { generateEntityId } from '../utils/id.js';
import { handleDatabaseError } from '../utils/errors.js';
import { getDueTopics } from '../services/spacedRepetition.js';
import { createQuiz } from './quizzes.js';

const router = Router();

// GET /api/topics - List all topics with graph relationships and attached notes
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, status } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (category && typeof category === 'string') {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (status && typeof status === 'string') {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const topicsResult = await query<TopicRow>(
      `SELECT * FROM topics ${whereClause} ORDER BY id ASC`,
      params
    );

    const topicIds = topicsResult.rows.map((t) => t.id);

    if (topicIds.length === 0) {
      return res.json([]);
    }

    const [edgesResult, notesResult, quizzesResult, questionsResult] = await Promise.all([
      query<TopicPrerequisiteRow>('SELECT topic_id, prerequisite_id FROM topic_prerequisites'),
      query<NoteRow>('SELECT * FROM notes ORDER BY updated_at DESC'),
      query<QuizRow>('SELECT * FROM quizzes ORDER BY updated_at DESC'),
      query<QuizQuestionRow>('SELECT * FROM quiz_questions ORDER BY id ASC')
    ]);

    const prereqMap = new Map<string, string[]>();
    const unlockMap = new Map<string, string[]>();

    edgesResult.rows.forEach((edge) => {
      if (!prereqMap.has(edge.topic_id)) prereqMap.set(edge.topic_id, []);
      prereqMap.get(edge.topic_id)!.push(edge.prerequisite_id);

      if (!unlockMap.has(edge.prerequisite_id)) unlockMap.set(edge.prerequisite_id, []);
      unlockMap.get(edge.prerequisite_id)!.push(edge.topic_id);
    });

    const notesMap = new Map<string, ReturnType<typeof toNoteDTO>[]>();
    notesResult.rows.forEach((note) => {
      if (!notesMap.has(note.topic_id)) notesMap.set(note.topic_id, []);
      notesMap.get(note.topic_id)!.push(toNoteDTO(note));
    });

    const questionsByQuiz = new Map<string, ReturnType<typeof toQuizQuestionDTO>[]>();
    questionsResult.rows.forEach((row) => {
      const q = toQuizQuestionDTO(row);
      if (!questionsByQuiz.has(row.quiz_id)) questionsByQuiz.set(row.quiz_id, []);
      questionsByQuiz.get(row.quiz_id)!.push(q);
    });

    const quizzesMap = new Map<string, ReturnType<typeof toQuizDTO>[]>();
    quizzesResult.rows.forEach((quiz) => {
      if (!quizzesMap.has(quiz.topic_id)) quizzesMap.set(quiz.topic_id, []);
      quizzesMap.get(quiz.topic_id)!.push(toQuizDTO(quiz, questionsByQuiz.get(quiz.id) || []));
    });

    const dtos = topicsResult.rows.map((row) => {
      const prerequisites = prereqMap.get(row.id) || [];
      const unlocks = unlockMap.get(row.id) || [];
      const notes = notesMap.get(row.id) || [];
      const quizzes = quizzesMap.get(row.id) || [];
      return toTopicDTO(row, prerequisites, unlocks, notes, quizzes);
    });

    return res.json(dtos);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to fetch topics');
  }
});

// GET /api/topics/due - Retrieve topics due for review based on SM-2 scheduling
router.get('/due', async (_req: Request, res: Response) => {
  try {
    const dueTopics = await getDueTopics();
    return res.json(dueTopics);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to retrieve due topics');
  }
});

// GET /api/topics/:id - Retrieve a single topic with its prerequisites, unlocks, notes, and quizzes
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const topicResult = await query<TopicRow>('SELECT * FROM topics WHERE id = $1', [id]);
    if (topicResult.rows.length === 0) {
      return res.status(404).json({ error: `Topic with id '${id}' not found` });
    }

    const [edgesResult, notesResult, quizzesResult, questionsResult] = await Promise.all([
      query<TopicPrerequisiteRow>(
        'SELECT topic_id, prerequisite_id FROM topic_prerequisites WHERE topic_id = $1 OR prerequisite_id = $1',
        [id]
      ),
      query<NoteRow>('SELECT * FROM notes WHERE topic_id = $1 ORDER BY updated_at DESC', [id]),
      query<QuizRow>('SELECT * FROM quizzes WHERE topic_id = $1 ORDER BY updated_at DESC', [id]),
      query<QuizQuestionRow>(
        'SELECT qq.* FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.topic_id = $1 ORDER BY qq.id ASC',
        [id]
      )
    ]);

    const prerequisites: string[] = [];
    const unlocks: string[] = [];

    edgesResult.rows.forEach((e) => {
      if (e.topic_id === id) prerequisites.push(e.prerequisite_id);
      if (e.prerequisite_id === id) unlocks.push(e.topic_id);
    });

    const notes = notesResult.rows.map(toNoteDTO);

    const questionsByQuiz = new Map<string, ReturnType<typeof toQuizQuestionDTO>[]>();
    questionsResult.rows.forEach((row) => {
      const q = toQuizQuestionDTO(row);
      if (!questionsByQuiz.has(row.quiz_id)) questionsByQuiz.set(row.quiz_id, []);
      questionsByQuiz.get(row.quiz_id)!.push(q);
    });

    const quizzes = quizzesResult.rows.map((q) => toQuizDTO(q, questionsByQuiz.get(q.id) || []));
    const dto = toTopicDTO(topicResult.rows[0], prerequisites, unlocks, notes, quizzes);

    return res.json(dto);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to retrieve topic');
  }
});

// GET /api/topics/:id/quizzes - List quizzes for a topic
router.get('/:id/quizzes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const topicRes = await query('SELECT id FROM topics WHERE id = $1', [id]);
    if (topicRes.rows.length === 0) {
      return res.status(404).json({ error: `Topic with id '${id}' not found` });
    }

    const [quizzesRes, questionsRes] = await Promise.all([
      query<QuizRow>('SELECT * FROM quizzes WHERE topic_id = $1 ORDER BY updated_at DESC', [id]),
      query<QuizQuestionRow>(
        'SELECT qq.* FROM quiz_questions qq JOIN quizzes q ON qq.quiz_id = q.id WHERE q.topic_id = $1 ORDER BY qq.id ASC',
        [id]
      )
    ]);

    const questionsByQuiz = new Map<string, ReturnType<typeof toQuizQuestionDTO>[]>();
    questionsRes.rows.forEach((row) => {
      const q = toQuizQuestionDTO(row);
      if (!questionsByQuiz.has(row.quiz_id)) questionsByQuiz.set(row.quiz_id, []);
      questionsByQuiz.get(row.quiz_id)!.push(q);
    });

    const dtos = quizzesRes.rows.map((q) => toQuizDTO(q, questionsByQuiz.get(q.id) || []));
    return res.json(dtos);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to retrieve quizzes for topic');
  }
});

// POST /api/topics/:id/quizzes - Create a quiz attached directly to a topic
router.post('/:id/quizzes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const topicRes = await query('SELECT id FROM topics WHERE id = $1', [id]);
    if (topicRes.rows.length === 0) {
      return res.status(404).json({ error: `Topic with id '${id}' not found` });
    }

    const validation = validateQuizInput(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    const quiz = await createQuiz({
      ...req.body,
      topicId: id
    });

    return res.status(201).json(quiz);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to create quiz for topic');
  }
});

// POST /api/topics - Create a new topic
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = validateTopicInput(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    const id = req.body.id && typeof req.body.id === 'string' ? req.body.id : generateEntityId('TOPIC');

    const {
      name,
      category,
      summary = '',
      mastery = 0,
      status = 'NEW',
      coordinates = [0, 0, 0],
      lastReviewed = null
    } = req.body;

    const coordX = Number(coordinates[0] ?? 0);
    const coordY = Number(coordinates[1] ?? 0);
    const coordZ = Number(coordinates[2] ?? 0);
    const parsedLastReviewed = validateLastReviewed(lastReviewed).value;

    const insertResult = await query<TopicRow>(
      `INSERT INTO topics (id, name, category, summary, mastery, status, coord_x, coord_y, coord_z, last_reviewed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [id, name.trim(), category, summary, mastery, status, coordX, coordY, coordZ, parsedLastReviewed]
    );

    const dto = toTopicDTO(insertResult.rows[0], [], [], []);
    return res.status(201).json(dto);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to create topic');
  }
});

// PATCH /api/topics/:id - Update topic fields
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const updates: string[] = [];
    const params: any[] = [id];

    if (req.body.name !== undefined) {
      if (typeof req.body.name !== 'string' || !req.body.name.trim()) {
        return res.status(400).json({ error: 'Name must be a non-empty string' });
      }
      params.push(req.body.name.trim());
      updates.push(`name = $${params.length}`);
    }

    if (req.body.category !== undefined) {
      if (!isValidCategory(req.body.category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      params.push(req.body.category);
      updates.push(`category = $${params.length}`);
    }

    if (req.body.summary !== undefined) {
      params.push(String(req.body.summary));
      updates.push(`summary = $${params.length}`);
    }

    if (req.body.mastery !== undefined) {
      if (!isValidMastery(req.body.mastery)) {
        return res.status(400).json({ error: 'Mastery must be a number between 0 and 100' });
      }
      params.push(req.body.mastery);
      updates.push(`mastery = $${params.length}`);
    }

    if (req.body.status !== undefined) {
      if (!isValidStatus(req.body.status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      params.push(req.body.status);
      updates.push(`status = $${params.length}`);
    }

    if (req.body.coordinates !== undefined) {
      if (
        !Array.isArray(req.body.coordinates) ||
        req.body.coordinates.length !== 3 ||
        req.body.coordinates.some((c: any) => typeof c !== 'number' || isNaN(c))
      ) {
        return res.status(400).json({ error: 'Coordinates must be an array of three numbers [x, y, z]' });
      }
      params.push(req.body.coordinates[0]);
      updates.push(`coord_x = $${params.length}`);
      params.push(req.body.coordinates[1]);
      updates.push(`coord_y = $${params.length}`);
      params.push(req.body.coordinates[2]);
      updates.push(`coord_z = $${params.length}`);
    }

    if (req.body.lastReviewed !== undefined) {
      const reviewCheck = validateLastReviewed(req.body.lastReviewed);
      if (!reviewCheck.isValid) {
        return res.status(400).json({ error: reviewCheck.error });
      }
      params.push(reviewCheck.value);
      updates.push(`last_reviewed = $${params.length}`);
    }

    let updatedTopicRow: TopicRow;

    if (updates.length === 0) {
      const existingRes = await query<TopicRow>('SELECT * FROM topics WHERE id = $1', [id]);
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ error: `Topic with id '${id}' not found` });
      }
      updatedTopicRow = existingRes.rows[0];
    } else {
      const updateQuery = `
        UPDATE topics
        SET ${updates.join(', ')}
        WHERE id = $1
        RETURNING *
      `;
      const updatedRes = await query<TopicRow>(updateQuery, params);
      if (updatedRes.rows.length === 0) {
        return res.status(404).json({ error: `Topic with id '${id}' not found` });
      }
      updatedTopicRow = updatedRes.rows[0];
    }

    const [edgesResult, notesResult] = await Promise.all([
      query<TopicPrerequisiteRow>(
        'SELECT topic_id, prerequisite_id FROM topic_prerequisites WHERE topic_id = $1 OR prerequisite_id = $1',
        [id]
      ),
      query<NoteRow>('SELECT * FROM notes WHERE topic_id = $1 ORDER BY updated_at DESC', [id])
    ]);

    const prerequisites = edgesResult.rows.filter((e) => e.topic_id === id).map((e) => e.prerequisite_id);
    const unlocks = edgesResult.rows.filter((e) => e.prerequisite_id === id).map((e) => e.topic_id);
    const notes = notesResult.rows.map(toNoteDTO);

    return res.json(toTopicDTO(updatedTopicRow, prerequisites, unlocks, notes));
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to update topic');
  }
});

// DELETE /api/topics/:id - Delete topic
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleteRes = await query('DELETE FROM topics WHERE id = $1 RETURNING id', [id]);
    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ error: `Topic with id '${id}' not found` });
    }
    return res.status(204).send();
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to delete topic');
  }
});

export default router;
