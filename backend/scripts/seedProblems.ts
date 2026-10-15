import { query } from '../src/db.js';
import { SEED_INTERVIEW_PROBLEMS } from '../src/data/seedProblems.js';
import { createProblem, updateProblem } from '../src/services/problemService.js';

async function seed() {
  console.log('Seeding interview problem bank into PostgreSQL...');
  for (const p of SEED_INTERVIEW_PROBLEMS) {
    const existing = await query('SELECT id FROM problems WHERE id = $1', [p.id]);
    if (!existing.rows || existing.rows.length === 0) {
      await createProblem(p);
      console.log('✅ Seeded problem:', p.id, '-', p.title);
    } else {
      await updateProblem(p.id, p);
      console.log('🔄 Updated problem:', p.id);
    }
  }
  console.log('Seeding completed successfully.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
