import * as fs from 'fs';
import * as path from 'path';
import { DOMAIN_DATA, INITIAL_TODOS } from '../../frontend/src/store/useStore';
import { TopicNode, NoteItem } from '../../frontend/src/types/telemetry';

// Deterministic Mulberry32 Pseudo-Random Number Generator (PRNG)
function createPrng(seed: number) {
  let a = seed;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// SQL String Escaping
function sqlString(val: string | undefined | null): string {
  if (val === undefined || val === null) return 'NULL';
  return `'${val.replace(/'/g, "''")}'`;
}

// Relative / Date String Normalizer to valid ISO-8601 TIMESTAMPTZ
function normalizeTimestamp(timeStr: string | undefined | null): string {
  if (!timeStr || timeStr === 'Never') return 'NULL';
  if (timeStr === '2 hours ago') return `'2026-08-24T08:00:00Z'`;
  if (timeStr === 'Yesterday' || timeStr === '1 day ago') return `'2026-08-23T10:00:00Z'`;
  if (timeStr === '3 days ago') return `'2026-08-21T10:00:00Z'`;
  if (timeStr === '1 week ago') return `'2026-08-17T10:00:00Z'`;
  if (timeStr === 'Aug 17, 2026') return `'2026-08-17T10:00:00Z'`;
  if (timeStr === 'Aug 14, 2026') return `'2026-08-14T10:00:00Z'`;
  if (timeStr === 'Aug 10, 2026') return `'2026-08-10T10:00:00Z'`;
  if (timeStr === 'Aug 05, 2026') return `'2026-08-05T10:00:00Z'`;
  if (timeStr === 'Aug 01, 2026') return `'2026-08-01T10:00:00Z'`;
  if (timeStr === 'Jul 28, 2026') return `'2026-07-28T10:00:00Z'`;
  if (timeStr === 'Jul 20, 2026') return `'2026-07-20T10:00:00Z'`;

  // If already ISO format or date parseable
  const parsed = new Date(timeStr);
  if (!isNaN(parsed.getTime())) {
    return `'${parsed.toISOString()}'`;
  }

  return `'2026-08-24T10:00:00Z'`;
}

interface ProcessedTopic {
  id: string;
  name: string;
  category: string;
  summary: string;
  mastery: number;
  status: 'DUE' | 'LEARNING' | 'MASTERED' | 'NEW';
  coord_x: number;
  coord_y: number;
  coord_z: number;
  last_reviewed: string;
  notes: NoteItem[];
}

export function generateSeedData() {
  const prng = createPrng(42);
  const topics: ProcessedTopic[] = [];
  const nameToIdMap = new Map<string, string>();
  let idCounter = 1;

  // Step 1: Assign initial cluster sphere positions deterministically
  DOMAIN_DATA.forEach((domainGroup, domainIdx) => {
    const clusterAngle = (domainIdx / DOMAIN_DATA.length) * Math.PI * 2;
    const clusterRadius = 18.0;
    const clusterX = Math.cos(clusterAngle) * clusterRadius;
    const clusterY = Math.sin(clusterAngle) * clusterRadius;
    const clusterZ = (domainIdx % 2 === 0 ? 1.0 : -1.0) * (3.0 + prng() * 2.5);

    domainGroup.topics.forEach((topic, topicIdx) => {
      const id = `TOPIC-${idCounter.toString().padStart(3, '0')}`;
      idCounter++;
      nameToIdMap.set(topic.name, id);

      const phi = Math.acos(1 - (2 * (topicIdx + 0.5)) / domainGroup.topics.length);
      const theta = Math.PI * (1 + Math.sqrt(5)) * topicIdx;
      const r = 5.0 + (topicIdx % 5) * 1.6;

      const x = clusterX + r * Math.sin(phi) * Math.cos(theta);
      const y = clusterY + r * Math.sin(phi) * Math.sin(theta);
      const z = clusterZ + r * Math.cos(phi);

      const mastery = Math.floor(prng() * 85) + 10;
      const status: TopicNode['status'] =
        mastery >= 80 ? 'MASTERED' : mastery >= 50 ? 'LEARNING' : mastery >= 30 ? 'DUE' : 'NEW';

      const timeAgo = ['2 hours ago', 'Yesterday', '3 days ago', '1 week ago', 'Never'][topicIdx % 5];

      topics.push({
        id,
        name: topic.name,
        category: domainGroup.category,
        summary: topic.summary,
        mastery,
        status,
        last_reviewed: timeAgo,
        coord_x: Number(x.toFixed(2)),
        coord_y: Number(y.toFixed(2)),
        coord_z: Number(z.toFixed(2)),
        notes: topic.notes || []
      });
    });
  });

  // Step 2: Multi-Pass Iterative Collision Relaxation (50 iterations)
  const MIN_DIST = 3.4;
  for (let pass = 0; pass < 50; pass++) {
    let moved = false;
    for (let i = 0; i < topics.length; i++) {
      for (let j = i + 1; j < topics.length; j++) {
        const n1 = topics[i];
        const n2 = topics[j];

        let dx = n2.coord_x - n1.coord_x;
        let dy = n2.coord_y - n1.coord_y;
        let dz = n2.coord_z - n1.coord_z;
        let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < MIN_DIST) {
          if (dist === 0) {
            dx = (prng() - 0.5) * 0.2;
            dy = (prng() - 0.5) * 0.2;
            dz = (prng() - 0.5) * 0.2;
            dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          }

          const overlap = (MIN_DIST - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          n1.coord_x -= nx * overlap;
          n1.coord_y -= ny * overlap;
          n1.coord_z -= nz * overlap;

          n2.coord_x += nx * overlap;
          n2.coord_y += ny * overlap;
          n2.coord_z += nz * overlap;

          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  topics.forEach((t) => {
    t.coord_x = Number(t.coord_x.toFixed(2));
    t.coord_y = Number(t.coord_y.toFixed(2));
    t.coord_z = Number(t.coord_z.toFixed(2));
  });

  // Step 3: Extract & Deduplicate Directed Prerequisite Edges
  // topic_id requires prerequisite_id (prerequisite_id -> topic_id)
  const edgeSet = new Set<string>();
  const edges: { topic_id: string; prerequisite_id: string }[] = [];

  const addEdge = (topicId: string, prereqId: string) => {
    if (topicId === prereqId) return; // Prevent self-loops
    const key = `${topicId}->${prereqId}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({ topic_id: topicId, prerequisite_id: prereqId });
    }
  };

  DOMAIN_DATA.forEach((domainGroup) => {
    domainGroup.topics.forEach((topic) => {
      const currentId = nameToIdMap.get(topic.name);
      if (!currentId) return;

      // prereqNames: Topics required BEFORE this topic (prereq -> current)
      if (topic.prereqNames) {
        topic.prereqNames.forEach((prereqName) => {
          const prereqId = nameToIdMap.get(prereqName);
          if (prereqId) {
            addEdge(currentId, prereqId);
          }
        });
      }

      // unlockNames: Topics UNLOCKED by this topic (current -> unlock)
      // i.e., the unlocked topic requires current as prerequisite (current -> unlock)
      if (topic.unlockNames) {
        topic.unlockNames.forEach((unlockName) => {
          const unlockId = nameToIdMap.get(unlockName);
          if (unlockId) {
            addEdge(unlockId, currentId);
          }
        });
      }
    });
  });

  // Step 4: Extract Notes
  const allNotes: {
    id: string;
    topic_id: string;
    title: string;
    filename: string | null;
    content: string;
    created_at: string;
    updated_at: string;
  }[] = [];

  topics.forEach((t) => {
    t.notes.forEach((note) => {
      allNotes.push({
        id: note.id,
        topic_id: t.id,
        title: note.title,
        filename: note.filename || null,
        content: note.content || '',
        created_at: note.createdAt || '2026-08-24T10:00:00Z',
        updated_at: note.updatedAt || '2026-08-24T10:00:00Z'
      });
    });
  });

  // Step 5: Extract Study Todos with Bug Fix for TODO-002
  const allTodos = INITIAL_TODOS.map((todo) => {
    let resolvedTopicId = todo.topicId;
    if (resolvedTopicId === 'TODO-002') {
      resolvedTopicId = 'TOPIC-002'; // Correct known typo in frontend initial state
    }
    return {
      id: todo.id,
      topic_id: resolvedTopicId || null,
      title: todo.title,
      category: todo.category,
      priority: todo.priority,
      completed: todo.completed,
      due_date: todo.dueDate
    };
  });

  return { topics, edges, notes: allNotes, todos: allTodos };
}

export function generateSeedSql(): string {
  const { topics, edges, notes, todos } = generateSeedData();

  const lines: string[] = [
    '--',
    '-- KNOWLEDGE GRAPH TEST DATABASE SEED',
    `-- Generated on: ${new Date().toISOString()}`,
    `-- Total Topics: ${topics.length} across 7 domain categories`,
    `-- Total Directed Prerequisite Edges: ${edges.length}`,
    `-- Total Markdown Notes: ${notes.length}`,
    `-- Total Study Todos: ${todos.length}`,
    '--',
    '',
    'BEGIN;',
    '',
    '-- 1. TOPICS',
    'INSERT INTO topics (id, name, category, summary, mastery, status, coord_x, coord_y, coord_z, last_reviewed) VALUES'
  ];

  topics.forEach((t, idx) => {
    const isLast = idx === topics.length - 1;
    const row = `  (${sqlString(t.id)}, ${sqlString(t.name)}, ${sqlString(t.category)}, ${sqlString(
      t.summary
    )}, ${t.mastery.toFixed(2)}, ${sqlString(t.status)}, ${t.coord_x.toFixed(2)}, ${t.coord_y.toFixed(
      2
    )}, ${t.coord_z.toFixed(2)}, ${normalizeTimestamp(t.last_reviewed)})${isLast ? ';' : ','}`;
    lines.push(row);
  });

  lines.push('');
  lines.push('-- 2. TOPIC PREREQUISITES (Directed Graph Edges)');
  lines.push('INSERT INTO topic_prerequisites (topic_id, prerequisite_id) VALUES');

  edges.forEach((e, idx) => {
    const isLast = idx === edges.length - 1;
    lines.push(`  (${sqlString(e.topic_id)}, ${sqlString(e.prerequisite_id)})${isLast ? ';' : ','}`);
  });

  lines.push('');
  lines.push('-- 3. NOTES (Markdown + KaTeX Math Payloads)');
  lines.push('INSERT INTO notes (id, topic_id, title, filename, content, created_at, updated_at) VALUES');

  notes.forEach((n, idx) => {
    const isLast = idx === notes.length - 1;
    lines.push(
      `  (${sqlString(n.id)}, ${sqlString(n.topic_id)}, ${sqlString(n.title)}, ${sqlString(
        n.filename
      )}, ${sqlString(n.content)}, ${normalizeTimestamp(n.created_at)}, ${normalizeTimestamp(
        n.updated_at
      )})${isLast ? ';' : ','}`
    );
  });

  lines.push('');
  lines.push('-- 4. STUDY TODOS (Actionable Study Goals)');
  lines.push('INSERT INTO study_todos (id, topic_id, title, category, priority, completed, due_date) VALUES');

  todos.forEach((td, idx) => {
    const isLast = idx === todos.length - 1;
    lines.push(
      `  (${sqlString(td.id)}, ${sqlString(td.topic_id)}, ${sqlString(td.title)}, ${sqlString(
        td.category
      )}, ${sqlString(td.priority)}, ${td.completed ? 'TRUE' : 'FALSE'}, ${sqlString(
        td.due_date
      )})${isLast ? ';' : ','}`
    );
  });

  lines.push('');
  lines.push('COMMIT;');
  lines.push('');

  return lines.join('\n');
}

// Direct execution via `tsx scripts/generate_seed.ts`
if (import.meta.url === `file://${process.argv[1]}`) {
  const sql = generateSeedSql();
  const outputDir = path.resolve(process.cwd(), 'seeds');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.resolve(outputDir, 'seed_test_db.sql');
  fs.writeFileSync(outputPath, sql, 'utf8');
  console.log(`Successfully generated seed file: ${outputPath} (${(sql.length / 1024).toFixed(1)} KB)`);
}
