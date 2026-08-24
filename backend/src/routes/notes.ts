import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { NoteRow } from '../types.js';
import { toNoteDTO } from '../utils/mappers.js';
import { validateNoteInput } from '../utils/validation.js';
import { handleDatabaseError } from '../utils/errors.js';

const router = Router();

// GET /api/topics/:topicId/notes - List notes for a specific topic
router.get('/topics/:topicId/notes', async (req: Request, res: Response) => {
  try {
    const { topicId } = req.params;
    const notesResult = await query<NoteRow>(
      'SELECT * FROM notes WHERE topic_id = $1 ORDER BY updated_at DESC',
      [topicId]
    );
    return res.json(notesResult.rows.map(toNoteDTO));
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to fetch notes for topic');
  }
});

// POST /api/topics/:topicId/notes - Create a new note for a topic
router.post('/topics/:topicId/notes', async (req: Request, res: Response) => {
  try {
    const { topicId } = req.params;

    const validation = validateNoteInput(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    let id = req.body.id;
    if (!id || typeof id !== 'string') {
      const noteRows = await query<{ id: string }>("SELECT id FROM notes WHERE id LIKE 'NOTE-%'");
      let maxNum = 0;
      for (const r of noteRows.rows) {
        const match = r.id.match(/^NOTE-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      id = `NOTE-${(maxNum + 1).toString().padStart(3, '0')}`;
    }

    const { title, content = '', filename = null } = req.body;
    const now = new Date().toISOString();

    const insertResult = await query<NoteRow>(
      `INSERT INTO notes (id, topic_id, title, filename, content, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, topicId, title.trim(), filename, content, now, now]
    );

    return res.status(201).json(toNoteDTO(insertResult.rows[0]));
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to create note');
  }
});

// GET /api/notes/:id - Get a specific note by ID
router.get('/notes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const noteResult = await query<NoteRow>('SELECT * FROM notes WHERE id = $1', [id]);
    if (noteResult.rows.length === 0) {
      return res.status(404).json({ error: `Note with id '${id}' not found` });
    }
    return res.json(toNoteDTO(noteResult.rows[0]));
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to fetch note');
  }
});

// PATCH /api/notes/:id - Update note title, content, or filename
router.patch('/notes/:id', async (req: Request, res: Response) => {
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

    if (req.body.content !== undefined) {
      params.push(String(req.body.content));
      updates.push(`content = $${params.length}`);
    }

    if (req.body.filename !== undefined) {
      params.push(req.body.filename ? String(req.body.filename) : null);
      updates.push(`filename = $${params.length}`);
    }

    if (updates.length === 0) {
      const existing = await query<NoteRow>('SELECT * FROM notes WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: `Note with id '${id}' not found` });
      }
      return res.json(toNoteDTO(existing.rows[0]));
    }

    // Always bump updated_at on modification
    params.push(new Date().toISOString());
    updates.push(`updated_at = $${params.length}`);

    const updateQuery = `
      UPDATE notes
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const updatedResult = await query<NoteRow>(updateQuery, params);
    if (updatedResult.rows.length === 0) {
      return res.status(404).json({ error: `Note with id '${id}' not found` });
    }

    return res.json(toNoteDTO(updatedResult.rows[0]));
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to update note');
  }
});

// DELETE /api/notes/:id - Delete a note
router.delete('/notes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleteRes = await query('DELETE FROM notes WHERE id = $1 RETURNING id', [id]);
    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ error: `Note with id '${id}' not found` });
    }
    return res.status(204).send();
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to delete note');
  }
});

export default router;
