import { describe, it, expect, beforeEach } from 'vitest';
import { newDb, IMemoryDb } from 'pg-mem';
import * as fs from 'fs';
import * as path from 'path';

describe('PostgreSQL Storage Schema (storage/schema.sql)', () => {
  let db: IMemoryDb;
  let schemaSql: string;

  beforeEach(() => {
    db = newDb();
    const schemaPath = path.resolve(__dirname, '../schema.sql');
    schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.public.none(schemaSql);
  });

  describe('Table Creation & Schema Initialization', () => {
    it('successfully initializes all 4 core tables without syntax errors', () => {
      const tables = db.public.many(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      const tableNames = tables.map((t: any) => t.table_name);

      expect(tableNames).toContain('topics');
      expect(tableNames).toContain('topic_prerequisites');
      expect(tableNames).toContain('notes');
      expect(tableNames).toContain('study_todos');
    });
  });

  describe('Topics Table: CRUD & Constraints', () => {
    it('inserts a valid topic record', () => {
      db.public.none(`
        INSERT INTO topics (id, name, category, summary, mastery, status, coord_x, coord_y, coord_z)
        VALUES ('TOPIC-001', 'Backpropagation & Autograd', 'AI & ML', 'Reverse-mode auto-differentiation.', 75.50, 'LEARNING', 12.5, -4.2, 8.0);
      `);

      const topic = db.public.one("SELECT * FROM topics WHERE id = 'TOPIC-001'");
      expect(topic.name).toBe('Backpropagation & Autograd');
      expect(topic.category).toBe('AI & ML');
      expect(Number(topic.mastery)).toBe(75.5);
      expect(topic.coord_x).toBe(12.5);
    });

    it('enforces primary key uniqueness on topics', () => {
      db.public.none(`
        INSERT INTO topics (id, name, category, summary, mastery)
        VALUES ('TOPIC-001', 'Topic 1', 'CS', 'Summary 1', 50.0);
      `);

      expect(() => {
        db.public.none(`
          INSERT INTO topics (id, name, category, summary, mastery)
          VALUES ('TOPIC-001', 'Topic Duplicate', 'CS', 'Summary 2', 60.0);
        `);
      }).toThrow();
    });

    it('accepts exact boundary values for mastery (0.00 and 100.00)', () => {
      db.public.none(`
        INSERT INTO topics (id, name, category, summary, mastery) VALUES
        ('TOPIC-MIN', 'Zero Mastery', 'CS', 'Summary', 0.00),
        ('TOPIC-MAX', 'Full Mastery', 'CS', 'Summary', 100.00);
      `);

      const minTopic = db.public.one("SELECT mastery FROM topics WHERE id = 'TOPIC-MIN'");
      const maxTopic = db.public.one("SELECT mastery FROM topics WHERE id = 'TOPIC-MAX'");

      expect(Number(minTopic.mastery)).toBe(0);
      expect(Number(maxTopic.mastery)).toBe(100);
    });

    it('enforces CHECK constraint on mastery bounds (0 <= mastery <= 100)', () => {
      // Mastery > 100
      expect(() => {
        db.public.none(`
          INSERT INTO topics (id, name, category, summary, mastery)
          VALUES ('TOPIC-ERR-1', 'Over 100', 'CS', 'Summary', 105.00);
        `);
      }).toThrow();

      // Mastery < 0
      expect(() => {
        db.public.none(`
          INSERT INTO topics (id, name, category, summary, mastery)
          VALUES ('TOPIC-ERR-2', 'Under 0', 'CS', 'Summary', -10.00);
        `);
      }).toThrow();
    });

    it('enforces CHECK constraint on topic status enum values', () => {
      expect(() => {
        db.public.none(`
          INSERT INTO topics (id, name, category, summary, status)
          VALUES ('TOPIC-INVALID-STATUS', 'Invalid Status', 'CS', 'Summary', 'INVALID_STATUS_VALUE');
        `);
      }).toThrow();
    });
  });

  describe('Topic Prerequisites: Edge Constraints & Cycle Tolerance', () => {
    beforeEach(() => {
      db.public.none(`
        INSERT INTO topics (id, name, category, summary) VALUES
        ('GAN', 'Generative Adversarial Networks', 'AI & ML', 'Adversarial training.'),
        ('VAE', 'Variational Autoencoders', 'AI & ML', 'Probabilistic latent generative models.'),
        ('DIFF', 'Diffusion Models', 'AI & ML', 'Iterative denoising score matching.');
      `);
    });

    it('inserts directed prerequisite edges', () => {
      db.public.none(`
        INSERT INTO topic_prerequisites (topic_id, prerequisite_id)
        VALUES ('DIFF', 'VAE');
      `);

      const edge = db.public.one("SELECT * FROM topic_prerequisites WHERE topic_id = 'DIFF'");
      expect(edge.topic_id).toBe('DIFF');
      expect(edge.prerequisite_id).toBe('VAE');
    });

    it('tolerates mutual/cyclic edges between distinct topics (e.g. GAN <-> VAE)', () => {
      db.public.none(`
        INSERT INTO topic_prerequisites (topic_id, prerequisite_id) VALUES
        ('GAN', 'VAE'),
        ('VAE', 'GAN');
      `);

      const edges = db.public.many("SELECT * FROM topic_prerequisites");
      expect(edges.length).toBe(2);
    });

    it('rejects self-referential prerequisite loops (topic_id <> prerequisite_id)', () => {
      expect(() => {
        db.public.none(`
          INSERT INTO topic_prerequisites (topic_id, prerequisite_id)
          VALUES ('GAN', 'GAN');
        `);
      }).toThrow();
    });

    it('rejects duplicate edges between same pair (Composite PK)', () => {
      db.public.none(`
        INSERT INTO topic_prerequisites (topic_id, prerequisite_id)
        VALUES ('GAN', 'VAE');
      `);

      expect(() => {
        db.public.none(`
          INSERT INTO topic_prerequisites (topic_id, prerequisite_id)
          VALUES ('GAN', 'VAE');
        `);
      }).toThrow();
    });

    it('rejects prerequisite referencing non-existent topic (Foreign Key constraint)', () => {
      expect(() => {
        db.public.none(`
          INSERT INTO topic_prerequisites (topic_id, prerequisite_id)
          VALUES ('GAN', 'NON_EXISTENT_TOPIC');
        `);
      }).toThrow();
    });

    it('cascades deletion of edges when a topic is deleted', () => {
      db.public.none(`
        INSERT INTO topic_prerequisites (topic_id, prerequisite_id) VALUES
        ('GAN', 'VAE'),
        ('DIFF', 'GAN');
      `);

      // Delete GAN
      db.public.none("DELETE FROM topics WHERE id = 'GAN'");

      const remainingEdges = db.public.many("SELECT * FROM topic_prerequisites");
      expect(remainingEdges.length).toBe(0);
    });
  });

  describe('Notes Table: Relationships & Cascades', () => {
    beforeEach(() => {
      db.public.none(`
        INSERT INTO topics (id, name, category, summary)
        VALUES ('TOPIC-MATH', 'Linear Algebra & SVD', 'MATH', 'Vector spaces and matrix factorizations.');
      `);
    });

    it('inserts markdown note attached to topic', () => {
      db.public.none(`
        INSERT INTO notes (id, topic_id, title, filename, content)
        VALUES ('NOTE-001', 'TOPIC-MATH', 'SVD Derivation', 'svd_proof.md', '# SVD Theorem\n\n$A = U \\Sigma V^T$');
      `);

      const note = db.public.one("SELECT * FROM notes WHERE id = 'NOTE-001'");
      expect(note.title).toBe('SVD Derivation');
      expect(note.topic_id).toBe('TOPIC-MATH');
      expect(note.content).toContain('U \\Sigma V^T');
    });

    it('rejects note referencing non-existent topic', () => {
      expect(() => {
        db.public.none(`
          INSERT INTO notes (id, topic_id, title, content)
          VALUES ('NOTE-ERR', 'NON_EXISTENT', 'Title', 'Content');
        `);
      }).toThrow();
    });

    it('cascades deletion of notes when parent topic is deleted', () => {
      db.public.none(`
        INSERT INTO notes (id, topic_id, title, content) VALUES
        ('NOTE-1', 'TOPIC-MATH', 'Note 1', 'Content 1'),
        ('NOTE-2', 'TOPIC-MATH', 'Note 2', 'Content 2');
      `);

      db.public.none("DELETE FROM topics WHERE id = 'TOPIC-MATH'");

      const notes = db.public.many("SELECT * FROM notes");
      expect(notes.length).toBe(0);
    });
  });

  describe('Study Todos Table: Relationships & Loose Coupling', () => {
    beforeEach(() => {
      db.public.none(`
        INSERT INTO topics (id, name, category, summary)
        VALUES ('TOPIC-SYS', 'Kernel Memory & Paging', 'SYSTEMS', 'Virtual address translation.');
      `);
    });

    it('inserts a todo linked to a topic', () => {
      db.public.none(`
        INSERT INTO study_todos (id, topic_id, title, category, priority, completed, due_date)
        VALUES ('TODO-001', 'TOPIC-SYS', 'Read TLB shootdown RFC', 'SYSTEMS', 'HIGH', false, 'Today');
      `);

      const todo = db.public.one("SELECT * FROM study_todos WHERE id = 'TODO-001'");
      expect(todo.title).toBe('Read TLB shootdown RFC');
      expect(todo.topic_id).toBe('TOPIC-SYS');
      expect(todo.completed).toBe(false);
    });

    it('inserts an unlinked general todo (topic_id is NULL)', () => {
      db.public.none(`
        INSERT INTO study_todos (id, topic_id, title, category, priority, completed, due_date)
        VALUES ('TODO-002', NULL, 'Review 20 Spaced Repetition cards', 'GENERAL', 'MEDIUM', false, 'Tomorrow');
      `);

      const todo = db.public.one("SELECT * FROM study_todos WHERE id = 'TODO-002'");
      expect(todo.topic_id).toBeNull();
    });

    it('enforces CHECK constraint on todo priority enum values', () => {
      expect(() => {
        db.public.none(`
          INSERT INTO study_todos (id, topic_id, title, category, priority)
          VALUES ('TODO-ERR-PRIO', 'TOPIC-SYS', 'Title', 'SYSTEMS', 'URGENT');
        `);
      }).toThrow();
    });

    it('sets topic_id to NULL when linked topic is deleted (ON DELETE SET NULL)', () => {
      db.public.none(`
        INSERT INTO study_todos (id, topic_id, title, category, priority)
        VALUES ('TODO-003', 'TOPIC-SYS', 'Linked Task', 'SYSTEMS', 'HIGH');
      `);

      db.public.none("DELETE FROM topics WHERE id = 'TOPIC-SYS'");

      const todo = db.public.one("SELECT * FROM study_todos WHERE id = 'TODO-003'");
      expect(todo).toBeDefined();
      expect(todo.topic_id).toBeNull();
      expect(todo.title).toBe('Linked Task');
    });
  });

  describe('Frontend Data Model Compatibility & Hydration Roundtrip', () => {
    it('stores and reconstructs frontend TopicNode entities with exact field parity', () => {
      // 1. Ingest sample frontend knowledge entities
      db.public.none(`
        INSERT INTO topics (id, name, category, summary, mastery, status, coord_x, coord_y, coord_z, last_reviewed)
        VALUES
          ('T-NN', 'Neural Networks', 'AI & ML', 'Foundational deep learning.', 80.0, 'MASTERED', 10.5, 20.0, -5.2, '2026-08-20T10:00:00Z'),
          ('T-BACKPROP', 'Backpropagation', 'AI & ML', 'Gradient computation.', 60.0, 'LEARNING', 15.0, 25.0, -3.0, '2026-08-22T14:30:00Z'),
          ('T-AUTOENC', 'Autoencoders', 'AI & ML', 'Latent compression.', 45.0, 'LEARNING', 18.0, 30.0, -1.0, '2026-08-23T09:15:00Z');

        -- T-BACKPROP requires T-NN (T-NN unlocks T-BACKPROP)
        -- T-AUTOENC requires T-NN (T-NN unlocks T-AUTOENC)
        -- T-AUTOENC and T-BACKPROP have mutual complementary association (cycle)
        INSERT INTO topic_prerequisites (topic_id, prerequisite_id) VALUES
          ('T-BACKPROP', 'T-NN'),
          ('T-AUTOENC', 'T-NN'),
          ('T-BACKPROP', 'T-AUTOENC'),
          ('T-AUTOENC', 'T-BACKPROP');

        INSERT INTO notes (id, topic_id, title, filename, content, created_at, updated_at)
        VALUES
          ('N-01', 'T-NN', 'Perceptron Notes', 'perceptron.md', '# Perceptron\n$f(x) = \\sigma(w^T x + b)$', '2026-08-20T10:00:00Z', '2026-08-21T11:00:00Z');

        INSERT INTO study_todos (id, topic_id, title, category, priority, completed, due_date)
        VALUES
          ('TODO-01', 'T-BACKPROP', 'Derive matrix calculus rules', 'AI & ML', 'HIGH', false, 'Today');
      `);

      // 2. Query and hydrate TopicNode entities (as frontend API service does)
      const rawTopics = db.public.many("SELECT * FROM topics ORDER BY id ASC");
      const rawEdges = db.public.many("SELECT topic_id, prerequisite_id FROM topic_prerequisites");
      const rawNotes = db.public.many("SELECT * FROM notes");

      const hydratedTopicNodes = rawTopics.map((t: any) => {
        // Prerequisites: nodes required BEFORE this topic (prerequisite_id where topic_id = this.id)
        const prerequisites = rawEdges
          .filter((e: any) => e.topic_id === t.id)
          .map((e: any) => e.prerequisite_id);

        // Unlocks: nodes unlocked AFTER this topic (topic_id where prerequisite_id = this.id)
        const unlocks = rawEdges
          .filter((e: any) => e.prerequisite_id === t.id)
          .map((e: any) => e.topic_id);

        const notes = rawNotes
          .filter((n: any) => n.topic_id === t.id)
          .map((n: any) => ({
            id: n.id,
            title: n.title,
            filename: n.filename,
            content: n.content,
            createdAt: n.created_at,
            updatedAt: n.updated_at
          }));

        return {
          id: t.id,
          name: t.name,
          category: t.category,
          mastery: Number(t.mastery),
          status: t.status,
          summary: t.summary,
          coordinates: [t.coord_x, t.coord_y, t.coord_z],
          lastReviewed: t.last_reviewed,
          prerequisites,
          unlocks,
          notes: notes.length > 0 ? notes : undefined
        };
      });

      // 3. Verify exact compatibility with frontend TopicNode interface
      const backprop = hydratedTopicNodes.find((n) => n.id === 'T-BACKPROP')!;
      expect(backprop).toBeDefined();
      expect(backprop.name).toBe('Backpropagation');
      expect(backprop.category).toBe('AI & ML');
      expect(backprop.mastery).toBe(60);
      expect(backprop.coordinates).toEqual([15.0, 25.0, -3.0]);
      expect(backprop.prerequisites).toEqual(expect.arrayContaining(['T-NN', 'T-AUTOENC']));
      expect(backprop.unlocks).toEqual(expect.arrayContaining(['T-AUTOENC']));

      const nn = hydratedTopicNodes.find((n) => n.id === 'T-NN')!;
      expect(nn.unlocks).toEqual(expect.arrayContaining(['T-BACKPROP', 'T-AUTOENC']));
      expect(nn.notes?.length).toBe(1);
      expect(nn.notes?.[0].title).toBe('Perceptron Notes');
      expect(nn.notes?.[0].content).toContain('\\sigma(w^T x + b)');

      // Verify study todo roundtrip
      const rawTodo = db.public.one("SELECT * FROM study_todos WHERE id = 'TODO-01'");
      const hydratedTodo = {
        id: rawTodo.id,
        topicId: rawTodo.topic_id,
        title: rawTodo.title,
        category: rawTodo.category,
        priority: rawTodo.priority,
        completed: rawTodo.completed,
        dueDate: rawTodo.due_date
      };
      expect(hydratedTodo.title).toBe('Derive matrix calculus rules');
      expect(hydratedTodo.topicId).toBe('T-BACKPROP');
      expect(hydratedTodo.priority).toBe('HIGH');
    });
  });

  describe('Sources Table: Provenance & Foreign Key Relations (BAC-31)', () => {
    beforeEach(() => {
      db.public.none(`
        INSERT INTO topics (id, name, category, summary)
        VALUES ('TOPIC-AI', 'Deep Learning Architectures', 'AI & ML', 'Deep neural net concepts.');
      `);
    });

    it('inserts a valid source record with raw markdown and metadata', () => {
      db.public.none(`
        INSERT INTO sources (id, url, title, author_or_org, raw_markdown, cleaned_markdown, content_hash, metadata)
        VALUES (
          'SRC-001',
          'https://arxiv.org/html/1706.03762',
          'Attention Is All You Need',
          'Vaswani et al. (Google Brain)',
          '# Attention Is All You Need\nRaw latex and math.',
          '# Attention Is All You Need\nClean markdown.',
          'sha256-hash-value',
          '{"domain": "AI & ML", "readTime": 12}'
        );
      `);

      const source = db.public.one("SELECT * FROM sources WHERE id = 'SRC-001'");
      expect(source.title).toBe('Attention Is All You Need');
      expect(source.author_or_org).toBe('Vaswani et al. (Google Brain)');
      expect(source.cleaned_markdown).toContain('Clean markdown.');
      expect(source.content_hash).toBe('sha256-hash-value');
    });

    it('enforces unique URL constraint on sources', () => {
      db.public.none(`
        INSERT INTO sources (id, url, title, raw_markdown, cleaned_markdown, content_hash)
        VALUES ('SRC-001', 'https://example.com/article', 'Title 1', 'Raw', 'Clean', 'hash1');
      `);

      expect(() => {
        db.public.none(`
          INSERT INTO sources (id, url, title, raw_markdown, cleaned_markdown, content_hash)
          VALUES ('SRC-002', 'https://example.com/article', 'Duplicate URL', 'Raw 2', 'Clean 2', 'hash2');
        `);
      }).toThrow();
    });

    it('links notes and quizzes to source_id and sets source_id to NULL on source deletion (ON DELETE SET NULL)', () => {
      db.public.none(`
        INSERT INTO sources (id, url, title, raw_markdown, cleaned_markdown, content_hash)
        VALUES ('SRC-PAPER', 'https://arxiv.org/abs/attention', 'Attention Paper', 'Raw', 'Clean', 'hash');

        INSERT INTO notes (id, topic_id, source_id, title, content)
        VALUES ('NOTE-ATTN', 'TOPIC-AI', 'SRC-PAPER', 'Attention Derivations', 'Softmax QK^T');

        INSERT INTO quizzes (id, topic_id, source_id, title)
        VALUES ('QUIZ-ATTN', 'TOPIC-AI', 'SRC-PAPER', 'Transformer Assessment');
      `);

      const linkedNote = db.public.one("SELECT * FROM notes WHERE id = 'NOTE-ATTN'");
      const linkedQuiz = db.public.one("SELECT * FROM quizzes WHERE id = 'QUIZ-ATTN'");
      expect(linkedNote.source_id).toBe('SRC-PAPER');
      expect(linkedQuiz.source_id).toBe('SRC-PAPER');

      // Delete the source
      db.public.none("DELETE FROM sources WHERE id = 'SRC-PAPER'");

      // Note and quiz should remain intact with source_id set to NULL
      const noteAfterDelete = db.public.one("SELECT * FROM notes WHERE id = 'NOTE-ATTN'");
      const quizAfterDelete = db.public.one("SELECT * FROM quizzes WHERE id = 'QUIZ-ATTN'");
      expect(noteAfterDelete).toBeDefined();
      expect(noteAfterDelete.source_id).toBeNull();
      expect(quizAfterDelete).toBeDefined();
      expect(quizAfterDelete.source_id).toBeNull();
    });
  });

  describe('Quiz Attempts & Spaced Repetition (BAC-33)', () => {
    it('records quiz attempts with score, ease factor, interval, and next due date', () => {
      db.public.none(`
        INSERT INTO topics (id, name, category, summary)
        VALUES ('TOPIC-AI', 'Deep Learning', 'AI & ML', 'Deep learning summary');

        INSERT INTO quizzes (id, topic_id, title)
        VALUES ('QUIZ-01', 'TOPIC-AI', 'AI Quiz');

        INSERT INTO quiz_attempts (id, topic_id, quiz_id, score, ease_factor, interval_days, repetition_count, next_due_at)
        VALUES ('ATTEMPT-01', 'TOPIC-AI', 'QUIZ-01', 95.50, 2.60, 6, 2, '2026-10-20T00:00:00Z');
      `);

      const attempt = db.public.one("SELECT * FROM quiz_attempts WHERE id = 'ATTEMPT-01'");
      expect(attempt.id).toBe('ATTEMPT-01');
      expect(attempt.topic_id).toBe('TOPIC-AI');
      expect(attempt.quiz_id).toBe('QUIZ-01');
      expect(Number(attempt.score)).toBe(95.5);
      expect(Number(attempt.ease_factor)).toBe(2.6);
      expect(attempt.interval_days).toBe(6);
      expect(attempt.repetition_count).toBe(2);
      expect(attempt.next_due_at).toBeDefined();
    });

    it('cascades deletion when parent topic or quiz is removed', () => {
      db.public.none(`
        INSERT INTO topics (id, name, category, summary)
        VALUES ('TOPIC-AI', 'Deep Learning', 'AI & ML', 'Deep learning summary');

        INSERT INTO quizzes (id, topic_id, title)
        VALUES ('QUIZ-CASCADE', 'TOPIC-AI', 'Cascade Quiz');

        INSERT INTO quiz_attempts (id, topic_id, quiz_id, score, ease_factor, interval_days, next_due_at)
        VALUES ('ATTEMPT-CAS', 'TOPIC-AI', 'QUIZ-CASCADE', 80.0, 2.50, 1, '2026-10-15T00:00:00Z');
      `);

      db.public.none("DELETE FROM quizzes WHERE id = 'QUIZ-CASCADE'");
      const attempt = db.public.many("SELECT * FROM quiz_attempts WHERE id = 'ATTEMPT-CAS'");
      expect(attempt.length).toBe(0);
    });

    it('enforces score check constraint (0 to 100)', () => {
      db.public.none(`
        INSERT INTO topics (id, name, category, summary)
        VALUES ('TOPIC-AI', 'Deep Learning', 'AI & ML', 'Deep learning summary');

        INSERT INTO quizzes (id, topic_id, title)
        VALUES ('QUIZ-01', 'TOPIC-AI', 'AI Quiz');
      `);

      expect(() => {
        db.public.none(`
          INSERT INTO quiz_attempts (id, topic_id, quiz_id, score, ease_factor, interval_days, next_due_at)
          VALUES ('ATTEMPT-BAD', 'TOPIC-AI', 'QUIZ-01', 105.0, 2.50, 1, '2026-10-15T00:00:00Z');
        `);
      }).toThrow();
    });
  });

  describe('Interview Problem Bank Schema (BAC-38)', () => {
    it('inserts a valid problem with companies array, starter code, and hints', () => {
      db.public.none(`
        INSERT INTO problems (
          id, title, type, difficulty, domain, summary, prompt, solution,
          hints, starter_code, test_cases, rubric, target_companies, time_limit_minutes
        ) VALUES (
          'PROB-RATE-LIMITER',
          'Design a High-Throughput Distributed Rate Limiter',
          'SYSTEM_DESIGN',
          'HARD',
          'SYSTEMS',
          'Scalable sliding window rate limiter using Redis cluster.',
          '### Requirements\nDesign a distributed rate limiter that handles 500k RPS.',
          '### Canonical Solution\nUse Redis sliding window log with Lua scripts.',
          '["Consider Token Bucket vs Leaking Bucket", "Use Redis Cluster for partition tolerance"]'::jsonb,
          '{"python": "class RateLimiter:\\n    pass"}'::jsonb,
          '[{"input": "client_1", "expected": true}]'::jsonb,
          '{"accuracy": 30, "architecture": 40, "tradeoffs": 30}'::jsonb,
          ARRAY['Stripe', 'Netflix', 'Amazon'],
          45
        );
      `);

      const prob = db.public.one("SELECT * FROM problems WHERE id = 'PROB-RATE-LIMITER'");
      expect(prob.id).toBe('PROB-RATE-LIMITER');
      expect(prob.title).toContain('Distributed Rate Limiter');
      expect(prob.type).toBe('SYSTEM_DESIGN');
      expect(prob.difficulty).toBe('HARD');
      expect(prob.domain).toBe('SYSTEMS');
      expect(prob.target_companies).toEqual(['Stripe', 'Netflix', 'Amazon']);
      expect(prob.time_limit_minutes).toBe(45);
    });

    it('enforces CHECK constraints on problem type and difficulty', () => {
      expect(() => {
        db.public.none(`
          INSERT INTO problems (id, title, type, difficulty, domain, summary, prompt, solution)
          VALUES ('PROB-BAD-TYPE', 'Test', 'INVALID_TYPE', 'MEDIUM', 'CS', 'Summary', 'Prompt', 'Sol');
        `);
      }).toThrow();

      expect(() => {
        db.public.none(`
          INSERT INTO problems (id, title, type, difficulty, domain, summary, prompt, solution)
          VALUES ('PROB-BAD-DIFF', 'Test', 'CODING', 'SUPER_HARD', 'CS', 'Summary', 'Prompt', 'Sol');
        `);
      }).toThrow();
    });

    it('links problems to topic prerequisites and cascades on problem/topic deletion', () => {
      db.public.none(`
        INSERT INTO topics (id, name, category, summary)
        VALUES ('TOPIC-REDIS', 'Redis Concurrency', 'SYSTEMS', 'Redis keys and data structures.');

        INSERT INTO problems (id, title, type, difficulty, domain, summary, prompt, solution)
        VALUES ('PROB-PREREQ-TEST', 'Distributed Rate Limiter', 'SYSTEM_DESIGN', 'HARD', 'SYSTEMS', 'Rate limiting', 'Prompt', 'Sol');

        INSERT INTO problem_prerequisites (problem_id, topic_id)
        VALUES ('PROB-PREREQ-TEST', 'TOPIC-REDIS');
      `);

      const prereq = db.public.one("SELECT * FROM problem_prerequisites WHERE problem_id = 'PROB-PREREQ-TEST'");
      expect(prereq.topic_id).toBe('TOPIC-REDIS');

      // Delete problem -> cascades to problem_prerequisites
      db.public.none("DELETE FROM problems WHERE id = 'PROB-PREREQ-TEST'");
      const remaining = db.public.many("SELECT * FROM problem_prerequisites WHERE problem_id = 'PROB-PREREQ-TEST'");
      expect(remaining.length).toBe(0);
    });

    it('links problems to problem quizzes and cascades on deletion', () => {
      db.public.none(`
        INSERT INTO topics (id, name, category, summary)
        VALUES ('TOPIC-ALGO', 'Algorithms', 'CS', 'Algorithms overview');

        INSERT INTO quizzes (id, topic_id, title)
        VALUES ('QUIZ-ALGO-1', 'TOPIC-ALGO', 'Algorithm Basics');

        INSERT INTO problems (id, title, type, difficulty, domain, summary, prompt, solution)
        VALUES ('PROB-QUIZ-TEST', 'Trapping Rain Water', 'CODING', 'HARD', 'CS', 'Monotonic stack problem', 'Prompt', 'Sol');

        INSERT INTO problem_quizzes (problem_id, quiz_id)
        VALUES ('PROB-QUIZ-TEST', 'QUIZ-ALGO-1');
      `);

      const link = db.public.one("SELECT * FROM problem_quizzes WHERE problem_id = 'PROB-QUIZ-TEST'");
      expect(link.quiz_id).toBe('QUIZ-ALGO-1');

      db.public.none("DELETE FROM problems WHERE id = 'PROB-QUIZ-TEST'");
      const remaining = db.public.many("SELECT * FROM problem_quizzes WHERE problem_id = 'PROB-QUIZ-TEST'");
      expect(remaining.length).toBe(0);
    });

    it('inserts problem submission records, enforces status check, and cascades on problem deletion', () => {
      db.public.none(`
        INSERT INTO problems (id, title, type, difficulty, domain, summary, prompt, solution)
        VALUES ('PROB-SUB-TEST', 'Trapping Rain Water', 'CODING', 'HARD', 'CS', 'Summary', 'Prompt', 'Sol');

        INSERT INTO problem_submissions (
          id, problem_id, language, code, status, passed_count, total_count, runtime_ms, memory_kb, stdout
        ) VALUES (
          'SUB-001', 'PROB-SUB-TEST', 'typescript', 'export function trap() { return 6; }',
          'ACCEPTED', 2, 2, 0.45, 36240, 'Computed trapped water: 6 units.'
        );
      `);

      const sub = db.public.one("SELECT * FROM problem_submissions WHERE id = 'SUB-001'");
      expect(sub.problem_id).toBe('PROB-SUB-TEST');
      expect(sub.language).toBe('typescript');
      expect(sub.status).toBe('ACCEPTED');
      expect(sub.passed_count).toBe(2);
      expect(Number(sub.runtime_ms)).toBe(0.45);

      // Verify status constraint rejects invalid status
      expect(() => {
        db.public.none(`
          INSERT INTO problem_submissions (id, problem_id, language, code, status)
          VALUES ('SUB-002', 'PROB-SUB-TEST', 'python', 'code', 'INVALID_STATUS');
        `);
      }).toThrow();

      // Verify cascade delete
      db.public.none("DELETE FROM problems WHERE id = 'PROB-SUB-TEST'");
      const remaining = db.public.many("SELECT * FROM problem_submissions WHERE problem_id = 'PROB-SUB-TEST'");
      expect(remaining.length).toBe(0);
    });
  });
});



