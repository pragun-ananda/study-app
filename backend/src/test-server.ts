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
const queuePayload1 = {
  sourceMetadata: {
    title: 'Attention Is All You Need (ArXiv:1706.03762)',
    domain: 'arxiv.org',
    contentLength: 42150,
    cleanedLength: 18450
  },
  walkthrough: {
    executiveSummary: 'Synthesized core mathematical formulations and algorithmic execution traces for reverse-mode automatic differentiation and attention projections from original ArXiv publication.',
    extractedConcepts: [
      {
        name: 'Reverse-Mode Automatic Differentiation',
        rationale: 'Foundational computation engine enabling backpropagation across arbitrary computational graphs with O(1) reverse passes per scalar loss.'
      },
      {
        name: 'Dynamic Computation Graph & Adjoints',
        rationale: 'Explains PyTorch autograd execution tape, vector-Jacobian products (VJPs), and memory checkpointing.'
      }
    ],
    omittedContent: [
      {
        contentSnippetOrTheme: 'Hardware cluster node topologies (TPU v2 pod setup)',
        reason: 'Infrastructure implementation details omitted to focus on foundational algorithms.'
      },
      {
        contentSnippetOrTheme: 'Translation BLEU score benchmark tables',
        reason: 'Empirical benchmark artifacts pruned in favor of durable algorithmic mechanics.'
      }
    ],
    quizCoverageJustification: {
      completenessRationale: 'Questions comprehensively assess both theoretical chain-rule dimensions and practical tensor-transpose gotchas during backpropagation.',
      testedFailureModes: [
        'Loss of precision in unscaled softmax gradients',
        'Intermediate activation memory explosion without gradient checkpointing'
      ],
      coverageScore: 96
    }
  },
  graphUpdates: [
    {
      id: 'UPDATE-001',
      queueId: 'QUEUE-INIT-001',
      sourceUrl: 'https://arxiv.org/abs/1706.03762',
      sourceTitle: 'Attention Is All You Need (ArXiv:1706.03762)',
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
    }
  ]
};

const queuePayload2 = {
  sourceMetadata: {
    title: 'Binary Search Trees - Complexity & Balanced Bounds',
    domain: 'en.wikipedia.org',
    contentLength: 28400,
    cleanedLength: 12200
  },
  walkthrough: {
    executiveSummary: 'Extracted rigorous worst-case bounds for self-balancing search trees and established topological prerequisite relationships in the knowledge graph.',
    extractedConcepts: [
      {
        name: 'Self-Balancing Tree Invariants',
        rationale: 'Establishes height bounds guaranteeing O(log n) operations against pathological linear degradation.'
      },
      {
        name: 'Linear Algebra Topological Precursor',
        rationale: 'Maps matrix factorization dependencies to ensure prerequisite mastery before vector space decompositions.'
      }
    ],
    omittedContent: [
      {
        contentSnippetOrTheme: 'Historical timeline of tree algorithms in 1960s literature',
        reason: 'Bibliographic history omitted to maintain tight pedagogical density.'
      }
    ],
    quizCoverageJustification: {
      completenessRationale: 'Tests understanding of tree rotation invariants and asymptotic height calculations.',
      testedFailureModes: [
        'Pathological O(n) degeneration on sorted sequential inserts'
      ],
      coverageScore: 92
    }
  },
  graphUpdates: [
    {
      id: 'UPDATE-002',
      queueId: 'QUEUE-INIT-002',
      sourceUrl: 'https://en.wikipedia.org/wiki/Binary_search_tree',
      sourceTitle: 'Binary Search Trees - Complexity & Balanced Bounds',
      title: 'Binary Search Trees Complexity Guarantees',
      description: 'Updated topic summary clarifying self-balancing AVL/Red-Black tree height bounds.',
      category: 'CS',
      type: 'TOPIC_UPDATE',
      status: 'PENDING',
      createdAt: '25 mins ago',
      targetId: 'TOPIC-002',
      targetName: 'Binary Search Trees',
      oldContent: 'Binary Search Trees (BST) maintain keys in sorted order where left child < parent < right child. Average lookup is O(log n).',
      newContent: 'Binary Search Trees (BST) maintain ordered keys ensuring left subtree elements are strictly smaller and right subtree elements are strictly greater than root. Self-balancing variants (AVL, Red-Black) guarantee worst-case $O(\\log n)$ search, insertion, and deletion by enforcing tree height bounds $h \\le 2 \\log_2(n+1)$.',
      payload: {
        topicId: 'TOPIC-002',
        patch: {
          summary: 'Binary Search Trees (BST) maintain ordered keys ensuring left subtree elements are strictly smaller and right subtree elements are strictly greater than root. Self-balancing variants (AVL, Red-Black) guarantee worst-case $O(\\log n)$ search, insertion, and deletion by enforcing tree height bounds $h \\le 2 \\log_2(n+1)$.'
        }
      }
    },
    {
      id: 'UPDATE-003',
      queueId: 'QUEUE-INIT-002',
      sourceUrl: 'https://en.wikipedia.org/wiki/Binary_search_tree',
      sourceTitle: 'Binary Search Trees - Complexity & Balanced Bounds',
      title: 'Prerequisite Edge: Linear Algebra -> SVD',
      description: 'Auto-extracted knowledge dependency linking linear algebra fundamentals before matrix factorization.',
      category: 'MATH',
      type: 'EDGE_UPDATE',
      status: 'PENDING',
      createdAt: '1 hour ago',
      targetId: 'TOPIC-003',
      targetName: 'SVD & Matrix Factorization',
      oldContent: 'No explicit prerequisite link declared for SVD & Matrix Factorization.',
      newContent: 'Declare prerequisite relationship:\n- Source Topic: Linear Algebra Foundations\n- Target Topic: SVD & Matrix Factorization',
      payload: {
        edge: {
          fromId: 'TOPIC-004',
          toId: 'TOPIC-003'
        }
      }
    }
  ]
};

db.public.none(`
  INSERT INTO ingest_review_queue (id, source_url, status, payload, audit_report, created_at)
  VALUES
    ('QUEUE-INIT-001', 'https://arxiv.org/abs/1706.03762', 'PENDING', '${JSON.stringify(queuePayload1).replace(/'/g, "''")}', '{"overallScore": 96, "noteAudits": [], "quizAudits": []}', NOW()),
    ('QUEUE-INIT-002', 'https://en.wikipedia.org/wiki/Binary_search_tree', 'PENDING', '${JSON.stringify(queuePayload2).replace(/'/g, "''")}', '{"overallScore": 92, "noteAudits": [], "quizAudits": []}', NOW());
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
