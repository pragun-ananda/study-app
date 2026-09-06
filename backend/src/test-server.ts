import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { newDb } from 'pg-mem';
import { app } from './app.js';
import { setPool, closePool } from './db.js';

dotenv.config();

// Ensure test server operates in test mode so getLLMClient() uses fast deterministic MockLLMClient
process.env.NODE_ENV = 'test';

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

// Seed initial review queue updates so E2E tests interact with consistent DB records
const initialQueuePayload = {
  graphUpdates: [
    {
      id: 'UPDATE-001',
      title: 'Backpropagation & Autograd Refinement',
      description: 'Ingested ArXiv paper updates gradient equations, cross-entropy formulation, and PyTorch computation graph snippet.',
      category: 'AI & ML',
      type: 'NOTE_UPDATE',
      status: 'PENDING',
      createdAt: '10 mins ago',
      targetId: 'NOTE-001',
      targetName: 'Backpropagation',
      oldContent: '# Backpropagation Algorithm\n\nBackpropagation calculates the gradient of the loss function with respect to the weights of the network.',
      newContent: '# Backpropagation & Automatic Differentiation (Autograd)\n\nBackpropagation efficiently calculates the gradient of the loss function.',
      comments: [
        {
          id: 'COMM-001',
          lineNumber: 11,
          selectedText: 'W^{(l)} at layer l',
          comment: 'Verify matrix multiplication transpose dimensions match standard tensor notation.',
          createdAt: '5 mins ago'
        }
      ],
      payload: { topicId: 'TOPIC-001', noteId: 'NOTE-001' }
    },
    {
      id: 'UPDATE-002',
      title: 'Binary Search Trees Complexity Guarantees',
      description: 'Updated topic summary clarifying self-balancing AVL/Red-Black tree height bounds.',
      category: 'CS',
      type: 'TOPIC_UPDATE',
      status: 'PENDING',
      createdAt: '25 mins ago',
      targetId: 'TOPIC-034',
      targetName: 'Binary Search Trees',
      oldContent: 'Binary Search Trees (BST) maintain keys in sorted order where left child < parent < right child. Average lookup is O(log n).',
      newContent: 'Binary Search Trees (BST) maintain ordered keys ensuring left subtree elements are strictly smaller and right subtree elements are strictly greater than root. Self-balancing variants (AVL, Red-Black) guarantee worst-case $O(\\log n)$ search, insertion, and deletion by enforcing tree height bounds $h \\le 2 \\log_2(n+1)$.',
      payload: {
        topicId: 'TOPIC-034',
        patch: {
          summary: 'Binary Search Trees (BST) maintain ordered keys ensuring left subtree elements are strictly smaller and right subtree elements are strictly greater than root. Self-balancing variants (AVL, Red-Black) guarantee worst-case $O(\\log n)$ search, insertion, and deletion by enforcing tree height bounds $h \\le 2 \\log_2(n+1)$.'
        }
      }
    },
    {
      id: 'UPDATE-003',
      title: 'Prerequisite Edge: Linear Algebra -> SVD',
      description: 'Auto-extracted knowledge dependency linking linear algebra fundamentals before matrix factorization.',
      category: 'MATH',
      type: 'EDGE_UPDATE',
      status: 'PENDING',
      createdAt: '1 hour ago',
      targetId: 'TOPIC-098',
      targetName: 'SVD & Matrix Factorization',
      oldContent: 'No explicit prerequisite link declared for SVD & Matrix Factorization.',
      newContent: 'Declare prerequisite relationship:\n- Source Topic: Linear Algebra Foundations\n- Target Topic: SVD & Matrix Factorization',
      payload: {
        edge: {
          fromId: 'TOPIC-001',
          toId: 'TOPIC-098'
        }
      }
    }
  ]
};

db.public.none(`
  INSERT INTO ingest_review_queue (id, source_url, status, payload, audit_report, created_at)
  VALUES ('QUEUE-INIT-001', 'https://arxiv.org/abs/2301.00001', 'PENDING', '${JSON.stringify(initialQueuePayload).replace(/'/g, "''")}', '{"overallScore": 95, "noteAudits": [], "quizAudits": []}', NOW());
`);

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
