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
import { gradeSystemDesignArchitecture } from '../services/systemDesignGrader.js';
import {
  getInterviewLearningAttempts,
  getInterviewLearningPath,
  recordLearningAttemptEvent,
  seedCuratedLearningPaths,
  startInterviewLearningAttempt
} from '../services/interviewLearningService.js';

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
    await seedCuratedLearningPaths();
    return res.json({ status: 'success', seededCount: seeded.length, seededIds: seeded });
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to seed interview problems');
  }
});

// GET /api/problems/:id/learning-path - Retrieve the latest validated pilot/published path
router.get('/:id/learning-path', async (req: Request, res: Response) => {
  try {
    const problem = await getProblemById(req.params.id);
    if (!problem) return res.status(404).json({ error: `Problem with id '${req.params.id}' not found` });
    const learningPath = await getInterviewLearningPath(req.params.id);
    if (!learningPath) return res.status(404).json({ error: 'No validated learning path is available for this problem' });
    return res.json(learningPath);
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to retrieve interview learning path');
  }
});

// POST /api/problems/:id/learning-attempts - Start a version-bound practice attempt
router.post('/:id/learning-attempts', async (req: Request, res: Response) => {
  try {
    const problem = await getProblemById(req.params.id);
    if (!problem) return res.status(404).json({ error: `Problem with id '${req.params.id}' not found` });
    const attempt = await startInterviewLearningAttempt(req.params.id);
    return res.status(201).json(attempt);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start learning attempt';
    return res.status(message.includes('No validated') ? 409 : 500).json({ error: message });
  }
});

// POST /api/problems/:id/learning-attempts/:attemptId/events - Append a validated attempt event
router.post('/:id/learning-attempts/:attemptId/events', async (req: Request, res: Response) => {
  try {
    const problem = await getProblemById(req.params.id);
    if (!problem) return res.status(404).json({ error: `Problem with id '${req.params.id}' not found` });
    const event = await recordLearningAttemptEvent(req.params.attemptId, req.body || {}, req.params.id);
    return res.status(201).json(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record learning event';
    const status = message.includes('not found') ? 404 : message.includes('does not belong') ? 404 : 400;
    return res.status(status).json({ error: message });
  }
});

// GET /api/problems/:id/learning-attempts - Retrieve persisted practice attempt summaries
router.get('/:id/learning-attempts', async (req: Request, res: Response) => {
  try {
    const problem = await getProblemById(req.params.id);
    if (!problem) return res.status(404).json({ error: `Problem with id '${req.params.id}' not found` });
    return res.json(await getInterviewLearningAttempts(req.params.id));
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to retrieve interview learning attempts');
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

// POST /api/problems/grade-system-design - Direct System Design Architecture Grading
router.post('/grade-system-design', async (req: Request, res: Response) => {
  try {
    const { problemId, followUpId, prompt, rubric, responseText, diagramData } = req.body || {};

    let problemPrompt = prompt;
    let problemRubric = rubric;
    let problemTitle = 'System Design Challenge';

    if (problemId) {
      const problem = await getProblemById(problemId);
      if (problem) {
        problemTitle = problem.title;
        if (followUpId && problem.followUps) {
          const fu = problem.followUps.find((f) => f.id === followUpId);
          if (fu) {
            problemPrompt = problemPrompt || fu.prompt;
            problemRubric = problemRubric || fu.rubric;
          }
        }
      }
    }

    const evaluation = await gradeSystemDesignArchitecture({
      problemTitle,
      prompt: problemPrompt || 'Distributed Architecture System Design',
      rubric: problemRubric,
      responseText: responseText || '',
      diagramData
    });

    let savedResponse = null;
    if (problemId && followUpId) {
      savedResponse = await saveFollowUpResponse(problemId, followUpId, {
        responseText: responseText || '',
        diagramData,
        score: evaluation.score,
        feedback: JSON.stringify(evaluation)
      });
    }

    return res.status(200).json({ evaluation, savedResponse });
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to grade system design architecture');
  }
});

// POST /api/problems/:id/follow-ups/:followUpId/grade - Grade candidate architecture response
router.post('/:id/follow-ups/:followUpId/grade', async (req: Request, res: Response) => {
  try {
    const { id, followUpId } = req.params;
    const { responseText, diagramData } = req.body || {};

    const problem = await getProblemById(id);
    if (!problem) {
      return res.status(404).json({ error: `Problem with id '${id}' not found` });
    }

    const followUp = (problem.followUps || []).find((f) => f.id === followUpId);
    if (!followUp) {
      return res.status(404).json({ error: `Follow-up '${followUpId}' not found for problem '${id}'` });
    }

    const evaluation = await gradeSystemDesignArchitecture({
      problemTitle: problem.title,
      prompt: followUp.prompt,
      rubric: followUp.rubric,
      responseText: responseText || '',
      diagramData
    });

    const savedResponse = await saveFollowUpResponse(id, followUpId, {
      responseText: responseText || '',
      diagramData,
      score: evaluation.score,
      feedback: JSON.stringify(evaluation)
    });

    return res.status(200).json({ evaluation, savedResponse });
  } catch (error) {
    return handleDatabaseError(res, error, 'Failed to grade follow-up architecture response');
  }
});

export default router;
