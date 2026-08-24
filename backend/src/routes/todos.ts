import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { StudyTodoRow } from '../types.js';
import { toTodoDTO } from '../utils/mappers.js';
import { validateTodoInput, isValidCategory, isValidPriority } from '../utils/validation.js';
import { generateEntityId } from '../utils/id.js';
import { handleDatabaseError } from '../utils/errors.js';

const router = Router();

// GET /api/todos - List all study todos with optional filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const { completed, category, priority } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (completed !== undefined) {
      const isCompleted = completed === 'true' || completed === '1';
      params.push(isCompleted);
      conditions.push(`completed = $${params.length}`);
    }

    if (category && typeof category === 'string') {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (priority && typeof priority === 'string') {
      params.push(priority);
      conditions.push(`priority = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const todosResult = await query<StudyTodoRow>(
      `SELECT * FROM study_todos ${whereClause} ORDER BY created_at ASC, id ASC`,
      params
    );

    return res.json(todosResult.rows.map(toTodoDTO));
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to fetch todos');
  }
});

// GET /api/todos/:id - Retrieve a single todo
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const todoResult = await query<StudyTodoRow>('SELECT * FROM study_todos WHERE id = $1', [id]);
    if (todoResult.rows.length === 0) {
      return res.status(404).json({ error: `Todo with id '${id}' not found` });
    }
    return res.json(toTodoDTO(todoResult.rows[0]));
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to retrieve todo');
  }
});

// POST /api/todos - Create a new study todo
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = validateTodoInput(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    const id = req.body.id && typeof req.body.id === 'string' ? req.body.id : generateEntityId('TODO');

    const {
      title,
      category,
      priority = 'HIGH',
      completed = false,
      dueDate = 'Today',
      topicId = null
    } = req.body;

    const insertResult = await query<StudyTodoRow>(
      `INSERT INTO study_todos (id, topic_id, title, category, priority, completed, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, topicId || null, title.trim(), category, priority, Boolean(completed), dueDate]
    );

    return res.status(201).json(toTodoDTO(insertResult.rows[0]));
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to create todo');
  }
});

// PATCH /api/todos/:id - Update todo completion, priority, title, category, dueDate, topicId
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const updates: string[] = [];
    const params: any[] = [id];

    if (req.body.title !== undefined) {
      if (typeof req.body.title !== 'string' || !req.body.title.trim()) {
        return res.status(400).json({ error: 'Title must be a non-empty string' });
      }
      params.push(req.body.title.trim());
      updates.push(`title = $${params.length}`);
    }

    if (req.body.category !== undefined) {
      if (!isValidCategory(req.body.category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      params.push(req.body.category);
      updates.push(`category = $${params.length}`);
    }

    if (req.body.priority !== undefined) {
      if (!isValidPriority(req.body.priority)) {
        return res.status(400).json({ error: 'Invalid priority' });
      }
      params.push(req.body.priority);
      updates.push(`priority = $${params.length}`);
    }

    if (req.body.completed !== undefined) {
      if (typeof req.body.completed !== 'boolean') {
        return res.status(400).json({ error: 'Completed must be a boolean value' });
      }
      params.push(req.body.completed);
      updates.push(`completed = $${params.length}`);
    }

    if (req.body.dueDate !== undefined) {
      params.push(String(req.body.dueDate));
      updates.push(`due_date = $${params.length}`);
    }

    if (req.body.topicId !== undefined) {
      const targetTopicId = req.body.topicId ? String(req.body.topicId) : null;
      params.push(targetTopicId);
      updates.push(`topic_id = $${params.length}`);
    }

    if (updates.length === 0) {
      const existing = await query<StudyTodoRow>('SELECT * FROM study_todos WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: `Todo with id '${id}' not found` });
      }
      return res.json(toTodoDTO(existing.rows[0]));
    }

    const updateQuery = `
      UPDATE study_todos
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const updatedResult = await query<StudyTodoRow>(updateQuery, params);
    if (updatedResult.rows.length === 0) {
      return res.status(404).json({ error: `Todo with id '${id}' not found` });
    }

    return res.json(toTodoDTO(updatedResult.rows[0]));
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to update todo');
  }
});

// DELETE /api/todos/:id - Delete a study todo
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleteRes = await query('DELETE FROM study_todos WHERE id = $1 RETURNING id', [id]);
    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ error: `Todo with id '${id}' not found` });
    }
    return res.status(204).send();
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to delete todo');
  }
});

export default router;
