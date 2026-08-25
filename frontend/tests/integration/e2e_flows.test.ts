import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Server } from 'http';
import { newDb } from 'pg-mem';
import { app } from '../../../backend/src/app';
import { setPool, closePool } from '../../../backend/src/db';
import { useStore } from '../../src/store/useStore';
import { setCustomFetch, setApiBaseUrl } from '../../src/api/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to create an in-memory test Postgres database loaded with schema and seeds
function setupTestDb() {
  const db = newDb();

  db.public.registerFunction({
    name: 'version',
    implementation: () => 'PostgreSQL 16.0 (pg-mem)'
  });

  db.public.registerFunction({
    name: 'current_database',
    implementation: () => 'study_app_test'
  });

  const schemaPath = path.resolve(__dirname, '../../../storage/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.public.none(schemaSql);

  const seedPath = path.resolve(__dirname, '../../../storage/seeds/seed_test_db.sql');
  const seedSql = fs.readFileSync(seedPath, 'utf8');
  db.public.none(seedSql);

  const pgAdapter = db.adapters.createPg();
  const pool = new pgAdapter.Pool();
  setPool(pool as any);

  return db;
}

describe('E2E Full Stack Integration Flows (Frontend -> Express Server -> PostgreSQL)', () => {
  let server: Server;
  let port: number;

  beforeEach(async () => {
    setupTestDb();
    useStore.setState({ topicNodes: [], todos: [], activeNote: null, isNoteEditing: false });

    // Start Express on an ephemeral local port
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        port = (server.address() as any).port;
        setApiBaseUrl(`http://127.0.0.1:${port}`);
        const realFetch = (globalThis as any).__nativeFetch__ || globalThis.fetch;
        setCustomFetch(realFetch);
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('Flow 1: Hydrates all 187 cosmos topics and 5 study todos from the PostgreSQL database', async () => {
    expect(useStore.getState().topicNodes.length).toBe(0);
    expect(useStore.getState().todos.length).toBe(0);

    // Trigger full app load
    await useStore.getState().loadInitialData();

    const state = useStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.topicNodes.length).toBe(187);
    expect(state.todos.length).toBe(5);

    // Verify backprop topic with spatial coordinates and directed edges
    const backprop = state.topicNodes.find((n) => n.id === 'TOPIC-001');
    expect(backprop).toBeDefined();
    expect(backprop?.name).toBe('Neural Network Backpropagation');
    expect(backprop?.category).toBe('AI & ML');
    expect(backprop?.coordinates.length).toBe(3);
    expect(backprop?.unlocks).toContain('TOPIC-002');
    expect(backprop?.notes?.length).toBe(1);
    expect(backprop?.notes?.[0].title).toBe('Backpropagation Derivation Notes');
    expect(backprop?.notes?.[0].content).toContain('$$ Z^{[l]} = W^{[l]} A^{[l-1]} + b^{[l]} $$');
  });

  it('Flow 2: Creates, edits, and deletes a rich KaTeX study note with full database persistence', async () => {
    await useStore.getState().loadInitialData();

    const topicId = 'TOPIC-002'; // Transformer Architecture
    const mathContent = '# Multi-Head Self Attention\n\n$$ \\text{Attention}(Q,K,V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V $$';

    // 1. Create note
    const createdNote = (await useStore.getState().addNoteToTopic(topicId, {
      title: 'Attention Derivation',
      content: mathContent,
      filename: 'attention.md'
    }))!;

    expect(createdNote).toBeDefined();
    expect(createdNote.id).toMatch(/^NOTE-/);
    expect(createdNote.title).toBe('Attention Derivation');
    expect(useStore.getState().activeNote?.id).toBe(createdNote.id);

    // Verify note exists on topic in store
    let topic = useStore.getState().topicNodes.find((n) => n.id === topicId)!;
    expect(topic.notes?.some((n) => n.id === createdNote.id)).toBe(true);

    // 2. Edit note
    const updatedMathContent = mathContent + '\n\n$$ \\text{FFN}(x) = \\max(0, xW_1 + b_1)W_2 + b_2 $$';
    await useStore.getState().updateNoteInTopic(topicId, {
      ...createdNote,
      title: 'Attention & Feed-Forward Derivations',
      content: updatedMathContent
    });

    topic = useStore.getState().topicNodes.find((n) => n.id === topicId)!;
    const noteInStore = topic.notes?.find((n) => n.id === createdNote.id);
    expect(noteInStore?.title).toBe('Attention & Feed-Forward Derivations');
    expect(noteInStore?.content).toContain('\\text{FFN}(x)');

    // 3. Delete note
    await useStore.getState().deleteNoteFromTopic(topicId, createdNote.id);

    topic = useStore.getState().topicNodes.find((n) => n.id === topicId)!;
    expect(topic.notes?.some((n) => n.id === createdNote.id)).toBe(false);
    expect(useStore.getState().activeNote).toBeNull();
  });

  it('Flow 3: Creates, toggles, and deletes a study todo with database persistence', async () => {
    await useStore.getState().loadInitialData();
    const initialTodoCount = useStore.getState().todos.length;

    // 1. Create todo
    const createdTodo = (await useStore.getState().addTodo({
      title: 'Implement Multi-Query Attention',
      category: 'AI & ML',
      priority: 'HIGH',
      dueDate: 'Tomorrow',
      completed: false,
      topicId: 'TOPIC-002'
    }))!;

    expect(createdTodo).toBeDefined();
    expect(createdTodo.id).toMatch(/^TODO-/);
    expect(createdTodo.title).toBe('Implement Multi-Query Attention');
    expect(createdTodo.completed).toBe(false);
    expect(useStore.getState().todos.length).toBe(initialTodoCount + 1);

    // 2. Toggle todo to completed
    await useStore.getState().toggleTodo(createdTodo.id);
    expect(useStore.getState().todos.find((t) => t.id === createdTodo.id)?.completed).toBe(true);

    // 3. Toggle todo back to incomplete
    await useStore.getState().toggleTodo(createdTodo.id);
    expect(useStore.getState().todos.find((t) => t.id === createdTodo.id)?.completed).toBe(false);

    // 4. Delete todo
    await useStore.getState().deleteTodo(createdTodo.id);
    expect(useStore.getState().todos.some((t) => t.id === createdTodo.id)).toBe(false);
    expect(useStore.getState().todos.length).toBe(initialTodoCount);
  });

  it('Flow 4: Updates topic mastery and mutates directed prerequisite graph edges', async () => {
    await useStore.getState().loadInitialData();

    // 1. Update topic mastery
    await useStore.getState().updateTopicMastery('TOPIC-001', 95);
    expect(useStore.getState().topicNodes.find((n) => n.id === 'TOPIC-001')?.mastery).toBe(95);

    // 2. Add directed prerequisite edge: TOPIC-003 -> TOPIC-002
    await useStore.getState().addPrerequisiteEdge('TOPIC-002', 'TOPIC-003');

    let topic2 = useStore.getState().topicNodes.find((n) => n.id === 'TOPIC-002');
    let topic3 = useStore.getState().topicNodes.find((n) => n.id === 'TOPIC-003');

    expect(topic2?.prerequisites).toContain('TOPIC-003');
    expect(topic3?.unlocks).toContain('TOPIC-002');

    // 3. Remove prerequisite edge
    await useStore.getState().removePrerequisiteEdge('TOPIC-002', 'TOPIC-003');

    topic2 = useStore.getState().topicNodes.find((n) => n.id === 'TOPIC-002');
    topic3 = useStore.getState().topicNodes.find((n) => n.id === 'TOPIC-003');

    expect(topic2?.prerequisites).not.toContain('TOPIC-003');
    expect(topic3?.unlocks).not.toContain('TOPIC-002');
  });
});
