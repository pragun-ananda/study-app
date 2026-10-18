import { Router, Request, Response } from 'express';
import { handleDatabaseError } from '../utils/errors.js';
import {
  getProblems,
  getProblemById,
  createProblem,
  updateProblem,
  deleteProblem,
  createSubmission,
  getSubmissionsByProblemId,
  getFollowUpResponses,
  getFollowUpResponse,
  saveFollowUpResponse
} from '../services/problemService.js';
import { SEED_INTERVIEW_PROBLEMS } from '../data/seedProblems.js';
import { query } from '../db.js';
import { ProblemRow } from '../types.js';

const router = Router();

// GET /api/problems - List problems with optional filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, difficulty, domain, company, topicId, search } = req.query;

    const problems = await getProblems({
      type: typeof type === 'string' ? type : undefined,
      difficulty: typeof difficulty === 'string' ? difficulty : undefined,
      domain: typeof domain === 'string' ? domain : undefined,
      company: typeof company === 'string' ? company : undefined,
      topicId: typeof topicId === 'string' ? topicId : undefined,
      search: typeof search === 'string' ? search : undefined
    });

    return res.json(problems);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to retrieve interview problems');
  }
});

// POST /api/problems/seed - Seed curated problem bank if empty or on demand
router.post('/seed', async (_req: Request, res: Response) => {
  try {
    const seeded = [];
    for (const p of SEED_INTERVIEW_PROBLEMS) {
      const existing = await query<ProblemRow>('SELECT id FROM problems WHERE id = $1', [p.id]);
      if (!existing.rows || existing.rows.length === 0) {
        const created = await createProblem(p);
        seeded.push(created.id);
      }
    }
    return res.json({ status: 'success', seededCount: seeded.length, seededIds: seeded });
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to seed interview problems');
  }
});

// GET /api/problems/:id - Retrieve single problem with full details, prerequisite graph nodes & quizzes
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const problem = await getProblemById(id);
    if (!problem) {
      return res.status(404).json({ error: `Problem with id '${id}' not found` });
    }
    return res.json(problem);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to retrieve interview problem');
  }
});

// POST /api/problems - Create an interview problem
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, type, difficulty, domain, summary, prompt, solution } = req.body || {};

    if (!title || !type || !difficulty || !domain || !prompt || !solution) {
      return res.status(400).json({
        error: 'Missing required fields: title, type, difficulty, domain, prompt, and solution are mandatory'
      });
    }

    const created = await createProblem(req.body);
    return res.status(201).json(created);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to create interview problem');
  }
});

// PUT /api/problems/:id - Update an interview problem
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await updateProblem(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: `Problem with id '${id}' not found` });
    }
    return res.json(updated);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to update interview problem');
  }
});

// DELETE /api/problems/:id - Delete an interview problem
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await deleteProblem(id);
    if (!deleted) {
      return res.status(404).json({ error: `Problem with id '${id}' not found` });
    }
    return res.json({ status: 'success', message: `Problem ${id} deleted successfully` });
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to delete interview problem');
  }
});

// POST /api/problems/:id/submit - Submit solution against full test suite
router.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { language, code } = req.body || {};

    if (!language || !code) {
      return res.status(400).json({ error: 'Language and code are required for solution submission' });
    }

    const problem = await getProblemById(id);
    if (!problem) {
      return res.status(404).json({ error: `Problem with id '${id}' not found` });
    }

    const submission = await createSubmission(id, req.body);
    return res.status(201).json(submission);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to submit problem solution');
  }
});

// GET /api/problems/:id/submissions - Retrieve submission history for problem
router.get('/:id/submissions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const problem = await getProblemById(id);
    if (!problem) {
      return res.status(404).json({ error: `Problem with id '${id}' not found` });
    }

    const submissions = await getSubmissionsByProblemId(id);
    return res.json(submissions);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to retrieve problem submissions');
  }
});

// GET /api/problems/:id/follow-ups - Retrieve system design follow-up challenges for problem
router.get('/:id/follow-ups', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const problem = await getProblemById(id);
    if (!problem) {
      return res.status(404).json({ error: `Problem with id '${id}' not found` });
    }
    return res.json(problem.followUps || []);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to retrieve problem follow-ups');
  }
});

// GET /api/problems/:id/follow-ups/responses - Retrieve candidate responses for follow-ups
router.get('/:id/follow-ups/responses', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const problem = await getProblemById(id);
    if (!problem) {
      return res.status(404).json({ error: `Problem with id '${id}' not found` });
    }
    const responses = await getFollowUpResponses(id);
    return res.json(responses);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to retrieve follow-up responses');
  }
});

// POST /api/problems/:id/follow-ups/:followUpId/response - Save candidate architecture response
router.post('/:id/follow-ups/:followUpId/response', async (req: Request, res: Response) => {
  try {
    const { id, followUpId } = req.params;
    const { responseText } = req.body || {};

    if (responseText === undefined || responseText === null) {
      return res.status(400).json({ error: 'responseText is required' });
    }

    const problem = await getProblemById(id);
    if (!problem) {
      return res.status(404).json({ error: `Problem with id '${id}' not found` });
    }

    const saved = await saveFollowUpResponse(id, followUpId, req.body);
    return res.status(200).json(saved);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to save follow-up response');
  }
});

export default router;
