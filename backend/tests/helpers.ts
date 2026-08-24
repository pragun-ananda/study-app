import { newDb, IMemoryDb } from 'pg-mem';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { setPool } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupTestDatabase(): IMemoryDb {
  const db = newDb();

  // Register schema
  const schemaPath = path.resolve(__dirname, '../../storage/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.public.none(schemaSql);

  // Bind mock pg pool to backend db module
  const adapter = db.adapters.createPg();
  const mockPool = new adapter.Pool();
  setPool(mockPool as any);

  return db;
}

export function seedBasicTestData(db: IMemoryDb) {
  db.public.none(`
    INSERT INTO topics (id, name, category, summary, mastery, status, coord_x, coord_y, coord_z, last_reviewed) VALUES
      ('TOPIC-001', 'Neural Network Backpropagation', 'AI & ML', 'Reverse-mode autograd', 80.00, 'MASTERED', 10.0, 5.0, 2.0, '2026-08-24T08:00:00Z'),
      ('TOPIC-002', 'Transformer Self-Attention', 'AI & ML', 'Scaled dot-product attention', 45.00, 'LEARNING', 15.0, 8.0, 3.0, '2026-08-24T07:00:00Z'),
      ('TOPIC-003', 'Binary Search Trees', 'CS', 'Logarithmic search tree', 60.00, 'LEARNING', -10.0, 4.0, 1.0, '2026-08-23T10:00:00Z');

    INSERT INTO topic_prerequisites (topic_id, prerequisite_id) VALUES
      ('TOPIC-002', 'TOPIC-001');

    INSERT INTO notes (id, topic_id, title, filename, content, created_at, updated_at) VALUES
      ('NOTE-001', 'TOPIC-001', 'Backprop Notes', 'backprop.md', '# Backprop Math $$ E = mc^2 $$', '2026-08-17T10:00:00Z', '2026-08-24T08:00:00Z');

    INSERT INTO study_todos (id, topic_id, title, category, priority, completed, due_date) VALUES
      ('TODO-001', 'TOPIC-001', 'Implement Autograd', 'AI & ML', 'HIGH', false, 'Today'),
      ('TODO-002', NULL, 'Review Math Notes', 'MATH', 'MEDIUM', true, 'Tomorrow');
  `);
}
