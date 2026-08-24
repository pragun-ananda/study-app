import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import topicsRouter from './routes/topics.js';
import prerequisitesRouter from './routes/prerequisites.js';
import notesRouter from './routes/notes.js';
import todosRouter from './routes/todos.js';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health Check
  const startTime = Date.now();
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      uptime: Number(((Date.now() - startTime) / 1000).toFixed(2)),
      timestamp: new Date().toISOString()
    });
  });

  // REST API Routes
  app.use('/api/topics', topicsRouter);
  app.use('/api/topics', prerequisitesRouter);
  app.use('/api', notesRouter);
  app.use('/api/todos', todosRouter);

  // 404 Handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Global Error Handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[GLOBAL_ERROR]:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred'
    });
  });

  return app;
}

export const app = createApp();
