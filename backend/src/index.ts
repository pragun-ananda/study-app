import dotenv from 'dotenv';
import { app } from './app.js';
import { getPool } from './db.js';

dotenv.config();

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Study App Backend Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check available at http://localhost:${PORT}/health`);
  console.log(`🧠 REST API endpoints mounted at http://localhost:${PORT}/api/topics, /api/notes, /api/todos`);
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    try {
      const pool = getPool();
      await pool.end();
      console.log('Database connection pool closed. Exiting process.');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
