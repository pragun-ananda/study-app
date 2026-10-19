import { Router, Request, Response } from 'express';
import { repoFetcherService } from '../services/repoFetcherService.js';
import { annotationService } from '../services/annotationService.js';

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
