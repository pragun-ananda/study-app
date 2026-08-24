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

    it('enforces CHECK constraint on mastery (0 <= mastery <= 100)', () => {
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

    it('tolerates mutual/cyclic edges (e.g. GAN <-> VAE)', () => {
      db.public.none(`
        INSERT INTO topic_prerequisites (topic_id, prerequisite_id) VALUES
        ('GAN', 'VAE'),
        ('VAE', 'GAN');
      `);

      const edges = db.public.many("SELECT * FROM topic_prerequisites");
      expect(edges.length).toBe(2);
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
});
