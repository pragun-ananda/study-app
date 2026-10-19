import { Router, Request, Response } from 'express';
import { repoFetcherService } from '../services/repoFetcherService.js';
import { annotationService } from '../services/annotationService.js';
import { codeArchitectureExplainer } from '../services/codeArchitectureExplainer.js';
import { query } from '../db.js';
import { generateEntityId } from '../utils/id.js';

export const repositoriesRouter = Router();

// POST /api/repositories/import - Import GitHub or Custom repository
repositoriesRouter.post('/import', async (req: Request, res: Response) => {
  try {
    const { url, fullName, owner, name, branch, originType, description, language, customFiles } = req.body;
    if (!url && !fullName && !name) {
      return res.status(400).json({ error: 'Repository url, fullName, or name is required' });
    }

    const repo = await repoFetcherService.importRepository({
      url,
      fullName,
      owner,
      name,
      branch,
      originType,
      description,
      language,
      customFiles
    });

    res.status(201).json(repo);
  } catch (err: any) {
    console.error('[REPO_IMPORT_ROUTE_ERROR]:', err);
    res.status(400).json({ error: err.message || 'Failed to import repository' });
  }
});

// GET /api/repositories - List all imported repositories
repositoriesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const repos = await repoFetcherService.listRepositories();
    res.json(repos);
  } catch (err: any) {
    console.error('[REPO_LIST_ROUTE_ERROR]:', err);
    res.status(500).json({ error: 'Failed to list repositories' });
  }
});

// GET /api/repositories/annotations/by-topic/:topicId - List all annotations linked to a Knowledge Graph topic
repositoriesRouter.get('/annotations/by-topic/:topicId', async (req: Request, res: Response) => {
  try {
    const annotations = await annotationService.getAnnotationsByTopic(req.params.topicId);
    res.json(annotations);
  } catch (err: any) {
    console.error('[REPO_ANNOTATIONS_BY_TOPIC_ERROR]:', err);
    res.status(500).json({ error: 'Failed to retrieve topic annotations' });
  }
});

// GET /api/repositories/:id - Get repository metadata
repositoriesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const repo = await repoFetcherService.getRepositoryById(req.params.id);
    if (!repo) {
      return res.status(404).json({ error: `Repository not found: ${req.params.id}` });
    }
    res.json(repo);
  } catch (err: any) {
    console.error('[REPO_GET_ROUTE_ERROR]:', err);
    res.status(500).json({ error: 'Failed to retrieve repository' });
  }
});

// GET /api/repositories/:id/tree - Lazy tree manifest
repositoriesRouter.get('/:id/tree', async (req: Request, res: Response) => {
  try {
    const sha = typeof req.query.sha === 'string' ? req.query.sha : undefined;
    const manifest = await repoFetcherService.fetchRepoTree(req.params.id, sha);
    res.json(manifest);
  } catch (err: any) {
    console.error('[REPO_TREE_ROUTE_ERROR]:', err);
    res.status(404).json({ error: err.message || 'Failed to fetch repository tree' });
  }
});

// GET /api/repositories/:id/blob - Lazy file content with LRU caching
repositoriesRouter.get('/:id/blob', async (req: Request, res: Response) => {
  try {
    const filePath = typeof req.query.path === 'string' ? req.query.path : '';
    if (!filePath) {
      return res.status(400).json({ error: 'Query parameter "path" is required' });
    }
    const sha = typeof req.query.sha === 'string' ? req.query.sha : undefined;

    const blob = await repoFetcherService.fetchFileBlob(req.params.id, filePath, sha);
    res.json(blob);
  } catch (err: any) {
    console.error('[REPO_BLOB_ROUTE_ERROR]:', err);
    res.status(404).json({ error: err.message || 'Failed to fetch file content' });
  }
});

// GET /api/repositories/:id/annotations - List annotations for a repo or specific file
repositoriesRouter.get('/:id/annotations', async (req: Request, res: Response) => {
  try {
    const filePath = typeof req.query.path === 'string' ? req.query.path : undefined;
    const sha = typeof req.query.sha === 'string' ? req.query.sha : undefined;

    if (filePath) {
      const annotations = await annotationService.getAnnotationsByFile(req.params.id, filePath, sha);
      return res.json(annotations);
    }

    const annotations = await annotationService.getAnnotationsByRepo(req.params.id);
    res.json(annotations);
  } catch (err: any) {
    console.error('[REPO_ANNOTATIONS_GET_ERROR]:', err);
    res.status(500).json({ error: 'Failed to retrieve annotations' });
  }
});

// POST /api/repositories/:id/annotations - Create line annotation
repositoriesRouter.post('/:id/annotations', async (req: Request, res: Response) => {
  try {
    const { filePath, startLine, endLine, title, content, anchorCodeSnippet, designCategory, topicId, commitSha } = req.body;

    if (!filePath || startLine === undefined || endLine === undefined || !title) {
      return res.status(400).json({ error: 'filePath, startLine, endLine, and title are required' });
    }

    const annotation = await annotationService.createAnnotation({
      repositoryId: req.params.id,
      commitSha,
      filePath,
      startLine: Number(startLine),
      endLine: Number(endLine),
      title,
      content: content || '',
      anchorCodeSnippet: anchorCodeSnippet || '',
      designCategory,
      topicId
    });

    res.status(201).json(annotation);
  } catch (err: any) {
    console.error('[REPO_ANNOTATION_CREATE_ERROR]:', err);
    res.status(400).json({ error: err.message || 'Failed to create annotation' });
  }
});

// PUT /api/repositories/:id/annotations/:annId - Update line annotation
repositoriesRouter.put('/:id/annotations/:annId', async (req: Request, res: Response) => {
  try {
    const { title, content, designCategory, topicId } = req.body;
    const updated = await annotationService.updateAnnotation(req.params.annId, {
      title,
      content,
      designCategory,
      topicId
    });
    res.json(updated);
  } catch (err: any) {
    console.error('[REPO_ANNOTATION_UPDATE_ERROR]:', err);
    res.status(404).json({ error: err.message || 'Failed to update annotation' });
  }
});

// DELETE /api/repositories/:id/annotations/:annId - Delete line annotation
repositoriesRouter.delete('/:id/annotations/:annId', async (req: Request, res: Response) => {
  try {
    const success = await annotationService.deleteAnnotation(req.params.annId);
    if (!success) {
      return res.status(404).json({ error: 'Annotation not found' });
    }
    res.json({ success: true, id: req.params.annId });
  } catch (err: any) {
    console.error('[REPO_ANNOTATION_DELETE_ERROR]:', err);
    res.status(500).json({ error: 'Failed to delete annotation' });
  }
});

// POST /api/repositories/:id/explain-code - Direct architectural critique of code snippet
repositoriesRouter.post('/:id/explain-code', async (req: Request, res: Response) => {
  try {
    const { filePath, startLine, endLine, codeSnippet, language, userNote, surroundingContext } = req.body;
    if (!filePath || startLine === undefined || endLine === undefined || !codeSnippet) {
      return res.status(400).json({ error: 'filePath, startLine, endLine, and codeSnippet are required' });
    }

    const repo = await repoFetcherService.getRepositoryById(req.params.id);
    const explanation = await codeArchitectureExplainer.explainCode({
      repositoryName: repo?.fullName || req.params.id,
      filePath,
      language: language || repo?.language || undefined,
      startLine: Number(startLine),
      endLine: Number(endLine),
      codeSnippet,
      surroundingContext,
      userNote
    });

    res.json(explanation);
  } catch (err: any) {
    console.error('[REPO_EXPLAIN_CODE_ERROR]:', err);
    res.status(500).json({ error: err.message || 'Failed to generate code architecture explanation' });
  }
});

// POST /api/repositories/:id/annotations/:annId/explain - Generate and attach AI explanation to annotation
repositoriesRouter.post('/:id/annotations/:annId/explain', async (req: Request, res: Response) => {
  try {
    const annotation = await annotationService.getAnnotationById(req.params.annId);
    if (!annotation) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    const repo = await repoFetcherService.getRepositoryById(req.params.id);
    const explanation = await codeArchitectureExplainer.explainCode({
      repositoryName: repo?.fullName || req.params.id,
      filePath: annotation.filePath,
      language: repo?.language || undefined,
      startLine: annotation.startLine,
      endLine: annotation.endLine,
      codeSnippet: annotation.anchorCodeSnippet,
      userNote: annotation.content
    });

    const updated = await annotationService.setAnnotationAiExplanation(annotation.id, explanation);
    res.json(updated);
  } catch (err: any) {
    console.error('[REPO_ANNOTATION_EXPLAIN_ERROR]:', err);
    res.status(500).json({ error: err.message || 'Failed to explain annotation' });
  }
});

// GET /api/repositories/:id/annotations/:annId/threads - List discussion threads
repositoriesRouter.get('/:id/annotations/:annId/threads', async (req: Request, res: Response) => {
  try {
    const threads = await annotationService.getAnnotationThreads(req.params.annId);
    res.json(threads);
  } catch (err: any) {
    console.error('[REPO_THREADS_GET_ERROR]:', err);
    res.status(500).json({ error: 'Failed to retrieve annotation threads' });
  }
});

// POST /api/repositories/:id/annotations/:annId/threads - Post message to thread
repositoriesRouter.post('/:id/annotations/:annId/threads', async (req: Request, res: Response) => {
  try {
    const { sender, message, suggestedQuizzes } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const thread = await annotationService.addThreadMessage(
      req.params.annId,
      sender || 'USER',
      message,
      suggestedQuizzes
    );
    res.status(201).json(thread);
  } catch (err: any) {
    console.error('[REPO_THREAD_POST_ERROR]:', err);
    res.status(400).json({ error: err.message || 'Failed to post thread message' });
  }
});

// POST /api/repositories/:id/annotations/:annId/export-quiz - Convert annotation into spaced repetition quiz question
repositoriesRouter.post('/:id/annotations/:annId/export-quiz', async (req: Request, res: Response) => {
  try {
    const { id: repoId, annId } = req.params;
    const annotation = await annotationService.getAnnotationById(annId);
    if (!annotation) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    const topicId = req.body?.topicId || annotation.topicId;
    if (!topicId) {
      return res.status(400).json({
        error: 'Topic association required to export to quiz review queue. Please link this annotation to a Knowledge Graph topic first.'
      });
    }

    const repo = await repoFetcherService.getRepositoryById(repoId);
    const repoName = repo?.name || repoId;

    // Check if topic exists and get topic name
    const topicRes = await query<{ id: string; name: string }>('SELECT id, name FROM topics WHERE id = $1', [topicId]);
    const topicName = topicRes.rows[0]?.name || 'Architecture & Code Design';

    // Find or create quiz for this topic
    let quizId: string;
    const existingQuizRes = await query<{ id: string }>('SELECT id FROM quizzes WHERE topic_id = $1 LIMIT 1', [topicId]);
    if (existingQuizRes.rows.length > 0) {
      quizId = existingQuizRes.rows[0].id;
    } else {
      quizId = generateEntityId('QUIZ');
      await query(
        `INSERT INTO quizzes (id, topic_id, source_id, title, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [
          quizId,
          topicId,
          null,
          `${topicName} - Code Architecture Review`,
          `Spaced repetition review quiz generated from repository code annotations.`
        ]
      );
    }

    // Build question prompt, options, answer, explanation
    const questionId = generateEntityId('QUESTION');
    const ai = annotation.aiExplanation;

    let prompt = `In repository "${repoName}" (${annotation.filePath}, lines ${annotation.startLine}-${annotation.endLine}): What is the key design consideration for "${annotation.title}"?`;
    let explanation = annotation.content;
    const correctAnswer = 'A';
    let options: Array<{ id: string; text: string }> = [];

    if (ai && ai.architecturalRationale) {
      prompt = `In ${repoName} (${annotation.filePath}, lines ${annotation.startLine}-${annotation.endLine}), what is the primary architectural rationale behind this design?\n\nCode snippet:\n\`\`\`\n${annotation.anchorCodeSnippet.slice(0, 300)}\n\`\`\``;
      explanation = `${ai.summary || ''}\n\nArchitectural Rationale: ${ai.architecturalRationale}`;

      const correctText = ai.architecturalRationale.length > 140
        ? ai.architecturalRationale.slice(0, 137) + '...'
        : ai.architecturalRationale;

      const altPattern = ai.designPatterns && ai.designPatterns.length > 0
        ? `Rely on strict synchronous coupling rather than ${ai.designPatterns[0]}`
        : 'Synchronous blocking execution without buffering or concurrency safety';

      const tradeOffText = ai.tradeoffs && ai.tradeoffs.bottlenecks && ai.tradeoffs.bottlenecks[0]
        ? `Prioritizes simplicity at the cost of ${ai.tradeoffs.bottlenecks[0]}`
        : 'Sacrifices consistency to maximize unconstrained throughput';

      options = [
        { id: 'A', text: correctText },
        { id: 'B', text: altPattern },
        { id: 'C', text: tradeOffText },
        { id: 'D', text: 'Arbitrary syntactic preference with no memory or latency implications' }
      ];
    } else {
      options = [
        { id: 'A', text: annotation.content.slice(0, 120) || 'Architectural invariant documented in study notes' },
        { id: 'B', text: 'Temporary debug code intended to be stripped in production builds' },
        { id: 'C', text: 'Deprecated legacy pattern kept solely for backward protocol compatibility' },
        { id: 'D', text: 'Unbounded memory allocation with no lifecycle disposal' }
      ];
    }

    const payload = {
      options
    };

    await query(
      `INSERT INTO quiz_questions (id, quiz_id, note_id, type, prompt, payload, correct_answer, explanation, difficulty, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        questionId,
        quizId,
        null,
        'MCQ',
        prompt,
        JSON.stringify(payload),
        correctAnswer,
        explanation,
        'MEDIUM'
      ]
    );

    // Also record into annotation discussion thread so user sees the export history
    await annotationService.addThreadMessage(
      annId,
      'SYSTEM',
      `Exported to Spaced Repetition Quiz for topic "${topicName}": "${annotation.title}"`,
      { quizId, questionId, type: 'MCQ' }
    );

    res.status(201).json({
      success: true,
      quizId,
      questionId,
      topicId,
      prompt,
      correctAnswer,
      options
    });
  } catch (err: any) {
    console.error('[REPO_EXPORT_QUIZ_ERROR]:', err);
    res.status(500).json({ error: err.message || 'Failed to export quiz question' });
  }
});
