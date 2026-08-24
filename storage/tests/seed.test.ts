import { describe, it, expect, beforeEach } from 'vitest';
import { newDb, IMemoryDb } from 'pg-mem';
import * as fs from 'fs';
import * as path from 'path';
import { generateSeedSql } from '../scripts/generate_seed';

describe('Seed Test Database (storage/seeds/seed_test_db.sql)', () => {
  let db: IMemoryDb;

  beforeEach(() => {
    db = newDb();
    const schemaPath = path.resolve(__dirname, '../schema.sql');
    const seedPath = path.resolve(__dirname, '../seeds/seed_test_db.sql');

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    // 1. Initialize schema
    db.public.none(schemaSql);

    // 2. Execute seed script
    db.public.none(seedSql);
  });

  describe('Deterministic Regeneration & Idempotency', () => {
    it('produces byte-for-byte identical output across consecutive generation runs', () => {
      const run1 = generateSeedSql();
      const run2 = generateSeedSql();
      expect(run1).toBe(run2);

      const checkedInSql = fs.readFileSync(
        path.resolve(__dirname, '../seeds/seed_test_db.sql'),
        'utf8'
      );
      expect(run1).toBe(checkedInSql);
    });
  });

  describe('Entity Ingestion & Row Counts', () => {
    it('seeds all 187 domain topics across 7 categories without error', () => {
      const topicCount = db.public.one('SELECT COUNT(*) as count FROM topics');
      expect(Number(topicCount.count)).toBe(187);

      const categoryCounts = db.public.many(
        'SELECT category, COUNT(*) as count FROM topics GROUP BY category ORDER BY category ASC'
      );
      const categoryMap = new Map(categoryCounts.map((c: any) => [c.category, Number(c.count)]));

      expect(categoryMap.get('AI & ML')).toBe(33);
      expect(categoryMap.get('CS')).toBe(33);
      expect(categoryMap.get('SYSTEMS')).toBe(31);
      expect(categoryMap.get('MATH')).toBe(31);
      expect(categoryMap.get('PHYSICS')).toBe(29);
      expect(categoryMap.get('CYBERSECURITY')).toBe(18);
      expect(categoryMap.get('ARCH')).toBe(12);
    });

    it('seeds all deduplicated directed prerequisite edges', () => {
      const edgeCount = db.public.one('SELECT COUNT(*) as count FROM topic_prerequisites');
      expect(Number(edgeCount.count)).toBe(229);
    });

    it('seeds all rich study notes and actionable todos', () => {
      const noteCount = db.public.one('SELECT COUNT(*) as count FROM notes');
      expect(Number(noteCount.count)).toBe(4);

      const todoCount = db.public.one('SELECT COUNT(*) as count FROM study_todos');
      expect(Number(todoCount.count)).toBe(5);
    });
  });

  describe('Foreign Key Integrity & Relationship Constraints', () => {
    it('verifies that every prerequisite edge points to valid existing topics', () => {
      const danglingEdges = db.public.many(`
        SELECT tp.topic_id, tp.prerequisite_id
        FROM topic_prerequisites tp
        LEFT JOIN topics t1 ON tp.topic_id = t1.id
        LEFT JOIN topics t2 ON tp.prerequisite_id = t2.id
        WHERE t1.id IS NULL OR t2.id IS NULL
      `);
      expect(danglingEdges.length).toBe(0);
    });

    it('verifies that every note references an existing topic', () => {
      const danglingNotes = db.public.many(`
        SELECT n.id, n.topic_id
        FROM notes n
        LEFT JOIN topics t ON n.topic_id = t.id
        WHERE t.id IS NULL
      `);
      expect(danglingNotes.length).toBe(0);
    });

    it('verifies that every study todo references an existing topic or is null', () => {
      const danglingTodos = db.public.many(`
        SELECT st.id, st.topic_id
        FROM study_todos st
        LEFT JOIN topics t ON st.topic_id = t.id
        WHERE st.topic_id IS NOT NULL AND t.id IS NULL
      `);
      expect(danglingTodos.length).toBe(0);
    });

    it('confirms zero self-loop edges exist in the seed dataset', () => {
      const selfLoops = db.public.many(`
        SELECT topic_id, prerequisite_id
        FROM topic_prerequisites
        WHERE topic_id = prerequisite_id
      `);
      expect(selfLoops.length).toBe(0);
    });

    it('confirms mutual complementary cycle edges (e.g. GAN <-> VAE) coexist', () => {
      // GAN is TOPIC-003, VAE is TOPIC-004
      const ganToVae = db.public.one(`
        SELECT * FROM topic_prerequisites
        WHERE topic_id = 'TOPIC-003' AND prerequisite_id = 'TOPIC-004'
      `);
      const vaeToGan = db.public.one(`
        SELECT * FROM topic_prerequisites
        WHERE topic_id = 'TOPIC-004' AND prerequisite_id = 'TOPIC-003'
      `);

      expect(ganToVae).toBeDefined();
      expect(vaeToGan).toBeDefined();
    });
  });

  describe('Markdown & LaTeX Content Fidelity', () => {
    it('preserves KaTeX mathematical formulas and syntax without delimiter corruption', () => {
      const backpropNote = db.public.one("SELECT * FROM notes WHERE id = 'NOTE-001'");
      expect(backpropNote.content).toContain('$$ Z^{[l]} = W^{[l]} A^{[l-1]} + b^{[l]} $$');
      expect(backpropNote.content).toContain('\\nabla_A \\mathcal{L}');
      expect(backpropNote.content).toContain("g'(Z^{[L]})");
      expect(backpropNote.content).toContain('def backward_propagation(dAL, caches):');

      const svdNote = db.public.one("SELECT * FROM notes WHERE id = 'NOTE-004'");
      expect(svdNote.content).toContain('$$ A = U \\Sigma V^T $$');
      expect(svdNote.content).toContain('Eckart-Young-Mirsky Theorem');
    });
  });

  describe('Frontend Graph Model Hydration Roundtrip', () => {
    it('hydrates complete frontend graph nodes and verifies connectivity', () => {
      const rawTopics = db.public.many('SELECT * FROM topics ORDER BY id ASC');
      const rawEdges = db.public.many('SELECT topic_id, prerequisite_id FROM topic_prerequisites');
      const rawNotes = db.public.many('SELECT * FROM notes');

      const hydratedNodes = rawTopics.map((t: any) => {
        const prerequisites = rawEdges
          .filter((e: any) => e.topic_id === t.id)
          .map((e: any) => e.prerequisite_id);

        const unlocks = rawEdges
          .filter((e: any) => e.prerequisite_id === t.id)
          .map((e: any) => e.topic_id);

        const notes = rawNotes
          .filter((n: any) => n.topic_id === t.id)
          .map((n: any) => ({
            id: n.id,
            title: n.title,
            content: n.content
          }));

        return {
          id: t.id,
          name: t.name,
          category: t.category,
          mastery: Number(t.mastery),
          status: t.status,
          summary: t.summary,
          coordinates: [t.coord_x, t.coord_y, t.coord_z],
          prerequisites,
          unlocks,
          notes: notes.length > 0 ? notes : undefined
        };
      });

      expect(hydratedNodes.length).toBe(187);

      // Backpropagation node check
      const backprop = hydratedNodes.find((n) => n.id === 'TOPIC-001')!;
      expect(backprop.name).toBe('Neural Network Backpropagation');
      expect(backprop.unlocks.length).toBeGreaterThan(0);
      expect(backprop.notes?.length).toBe(1);
      expect(backprop.notes?.[0].title).toBe('Backpropagation Derivation Notes');

      // Transformer node check
      const transformer = hydratedNodes.find((n) => n.id === 'TOPIC-002')!;
      expect(transformer.name).toBe('Transformer Self-Attention');
      expect(transformer.prerequisites).toContain('TOPIC-001');
    });
  });
});
