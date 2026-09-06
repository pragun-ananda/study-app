import { beforeEach, afterAll } from 'vitest';
import { setupTestDatabase } from './helpers.js';
import { setPool, closePool } from '../src/db.js';

// Guarantee that every single test runs with a fresh isolated in-memory pg-mem database
// so tests are 100% stateless and never touch or leave records in the persisted PostgreSQL test database.
beforeEach(() => {
  setupTestDatabase();
});

afterAll(async () => {
  await closePool();
  setPool(null);
});
