import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { handleDatabaseError } from '../utils/errors.js';

const router = Router({ mergeParams: true });

// POST /api/topics/:id/prerequisites - Add a prerequisite edge
router.post('/:id/prerequisites', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { prerequisiteId } = req.body;

    if (!prerequisiteId || typeof prerequisiteId !== 'string') {
      return res.status(400).json({ error: 'prerequisiteId is required and must be a string' });
    }

    if (id === prerequisiteId) {
      return res.status(400).json({ error: 'Self-loop detected: A topic cannot be a prerequisite of itself' });
    }

    // Verify both topics exist
    const checkTopics = await query('SELECT id FROM topics WHERE id IN ($1, $2)', [id, prerequisiteId]);
    if (checkTopics.rows.length < 2) {
      return res.status(400).json({ error: 'One or both referenced topics do not exist' });
    }

    await query(
      `INSERT INTO topic_prerequisites (topic_id, prerequisite_id)
       VALUES ($1, $2)
       ON CONFLICT (topic_id, prerequisite_id) DO NOTHING`,
      [id, prerequisiteId]
    );

    return res.status(201).json({
      topicId: id,
      prerequisiteId,
      message: 'Prerequisite relationship registered successfully'
    });
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to add prerequisite');
  }
});

// DELETE /api/topics/:id/prerequisites/:prereqId - Remove a prerequisite edge
router.delete('/:id/prerequisites/:prereqId', async (req: Request, res: Response) => {
  try {
    const { id, prereqId } = req.params;

    const deleteRes = await query(
      'DELETE FROM topic_prerequisites WHERE topic_id = $1 AND prerequisite_id = $2 RETURNING topic_id',
      [id, prereqId]
    );

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Prerequisite relationship not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to remove prerequisite');
  }
});

export default router;
