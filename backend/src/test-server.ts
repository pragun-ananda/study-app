import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { newDb } from 'pg-mem';
import { app } from './app.js';
import { setPool, closePool } from './db.js';

dotenv.config();

// Initialize in-memory postgres with schema & seeds
const db = newDb();
db.public.registerFunction({
  name: 'version',
  implementation: () => 'PostgreSQL 16.0 (pg-mem)'
});
db.public.registerFunction({
  name: 'current_database',
  implementation: () => 'study_app_test'
});

const storageDir = fs.existsSync(path.resolve(process.cwd(), 'storage'))
  ? path.resolve(process.cwd(), 'storage')
  : path.resolve(process.cwd(), '../storage');

const schemaPath = path.resolve(storageDir, 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');
db.public.none(schemaSql);

const seedPath = path.resolve(storageDir, 'seeds/seed_test_db.sql');
const seedSql = fs.readFileSync(seedPath, 'utf8');
db.public.none(seedSql);

const pgAdapter = db.adapters.createPg();
const pool = new pgAdapter.Pool();
setPool(pool as any);

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Study App In-Memory Test Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check available at http://localhost:${PORT}/health`);
  console.log(`🧠 REST API endpoints mounted at http://localhost:${PORT}/api/topics, /api/notes, /api/todos`);
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Gracefully shutting down test server...`);
  server.close(async () => {
    try {
      await closePool();
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
