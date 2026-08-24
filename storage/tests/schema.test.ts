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
});
