import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore, INITIAL_TOPICS, INITIAL_TODOS, generateCosmosNodes } from '../../src/store/useStore';
import * as api from '../../src/api/client';

describe('Zustand State Store (useStore)', () => {
  beforeEach(() => {
    useStore.getState().resetState();
    useStore.getState().hydrate(INITIAL_TOPICS, INITIAL_TODOS);
  });

  describe('Topic Selection, Creation & Mastery', () => {
    it('selects and deselects topics', () => {
      expect(useStore.getState().selectedTopicId).toBeNull();
      useStore.getState().setSelectedTopicId('TOPIC-001');
      expect(useStore.getState().selectedTopicId).toBe('TOPIC-001');

      useStore.getState().setSelectedTopicId(null);
      expect(useStore.getState().selectedTopicId).toBeNull();
    });

    it('updates topic mastery clamped between 0 and 100 with optimistic update', async () => {
      const topicId = useStore.getState().topicNodes[0].id;
      await useStore.getState().updateTopicMastery(topicId, 85);

      const topic = useStore.getState().topicNodes.find((n) => n.id === topicId);
      expect(topic?.mastery).toBe(85);

      // Clamping high
      await useStore.getState().updateTopicMastery(topicId, 150);
      expect(useStore.getState().topicNodes.find((n) => n.id === topicId)?.mastery).toBe(100);

      // Clamping low
      await useStore.getState().updateTopicMastery(topicId, -20);
      expect(useStore.getState().topicNodes.find((n) => n.id === topicId)?.mastery).toBe(0);
    });

    it('rolls back mastery on API error', async () => {
      const topicId = useStore.getState().topicNodes[0].id;
      const initialMastery = useStore.getState().topicNodes[0].mastery;

      const spy = vi.spyOn(api, 'updateTopic').mockRejectedValueOnce(new Error('Network failure'));
      await useStore.getState().updateTopicMastery(topicId, 99);

      // Rollback to original value
      expect(useStore.getState().topicNodes.find((n) => n.id === topicId)?.mastery).toBe(initialMastery);
      expect(useStore.getState().error).toBe('Network failure');
      spy.mockRestore();
    });

    it('adds a new topic node to the graph', async () => {
      const initialCount = useStore.getState().topicNodes.length;
      await useStore.getState().addTopicNode({
        name: 'Quantum Teleportation & Entanglement',
        category: 'PHYSICS',
        mastery: 0,
        status: 'LEARNING',
        lastReviewed: '2026-08-23',
        coordinates: [10, 10, 10],
        prerequisites: [],
        unlocks: [],
        summary: 'Quantum entanglement state transfer protocols.'
      });

      expect(useStore.getState().topicNodes.length).toBe(initialCount + 1);
      const added = useStore.getState().topicNodes.find((n) => n.name === 'Quantum Teleportation & Entanglement');
      expect(added?.id).toBeDefined();
    });

    it('sets hovered topic and inspector open state', () => {
      useStore.getState().setHoveredTopicId('TOPIC-002');
      expect(useStore.getState().hoveredTopicId).toBe('TOPIC-002');

      useStore.getState().setIsInspectorOpen(true);
      expect(useStore.getState().isInspectorOpen).toBe(true);
    });
  });

  describe('Note CRUD Operations', () => {
    it('adds a new note to a topic and sets it as activeNote', async () => {
      const topic = useStore.getState().topicNodes[0];
      const initialCount = topic.notes?.length ?? 0;

      await useStore.getState().addNoteToTopic(topic.id, {
        title: 'New Graph Proof',
        content: '# Derivation\n$E=mc^2$'
      });

      const updatedTopic = useStore.getState().topicNodes.find((n) => n.id === topic.id);
      expect(updatedTopic?.notes?.length).toBe(initialCount + 1);

      const newNote = updatedTopic?.notes?.find((n) => n.title === 'New Graph Proof');
      expect(newNote).toBeDefined();
      expect(newNote?.id).toBeDefined();
      expect(useStore.getState().activeNote?.id).toBe(newNote?.id);
    });

    it('updates an existing note in a topic', async () => {
      const topic = useStore.getState().topicNodes[0];
      const note = topic.notes?.[0];
      expect(note).toBeDefined();

      if (note) {
        await useStore.getState().updateNoteInTopic(topic.id, {
          ...note,
          title: 'Updated Note Title',
          content: 'Updated content body'
        });

        const updatedTopic = useStore.getState().topicNodes.find((n) => n.id === topic.id);
        const updatedNote = updatedTopic?.notes?.find((n) => n.title === 'Updated Note Title');
        expect(updatedNote?.title).toBe('Updated Note Title');
        expect(updatedNote?.content).toBe('Updated content body');
      }
    });

    it('deletes a note and clears activeNote and isNoteEditing if it matches', async () => {
      const topic = useStore.getState().topicNodes[0];
      const note = topic.notes?.[0];
      expect(note).toBeDefined();

      if (note) {
        useStore.getState().setActiveNote(note, true);
        expect(useStore.getState().activeNote?.id).toBe(note.id);
        expect(useStore.getState().isNoteEditing).toBe(true);

        await useStore.getState().deleteNoteFromTopic(topic.id, note.id);

        const updatedTopic = useStore.getState().topicNodes.find((n) => n.id === topic.id);
        expect(updatedTopic?.notes?.some((n) => n.id === note.id)).toBe(false);
        expect(useStore.getState().activeNote).toBeNull();
        expect(useStore.getState().isNoteEditing).toBe(false);
      }
    });

    it('deletes a note while preserving activeNote when activeNote ID is different', async () => {
      const topic = useStore.getState().topicNodes[0];
      const firstNote = (await useStore.getState().addNoteToTopic(topic.id, { title: 'First Note', content: 'C1' }))!;
      const secondNote = (await useStore.getState().addNoteToTopic(topic.id, { title: 'Second Note', content: 'C2' }))!;

      useStore.getState().setActiveNote(secondNote, false);

      // Delete firstNote while secondNote is active
      await useStore.getState().deleteNoteFromTopic(topic.id, firstNote.id);

      expect(useStore.getState().activeNote?.id).toBe(secondNote.id);
    });
  });

  describe('Todo CRUD Operations', () => {
    it('toggles a todo completion status with optimistic update', async () => {
      const initialTodo = useStore.getState().todos[0];
      const initialStatus = initialTodo.completed;

      await useStore.getState().toggleTodo(initialTodo.id);
      expect(useStore.getState().todos.find((t) => t.id === initialTodo.id)?.completed).toBe(!initialStatus);
    });

    it('rolls back todo toggle on API error', async () => {
      const initialTodo = useStore.getState().todos[0];
      const initialStatus = initialTodo.completed;

      const spy = vi.spyOn(api, 'updateTodo').mockRejectedValueOnce(new Error('Server error'));
      await useStore.getState().toggleTodo(initialTodo.id);

      expect(useStore.getState().todos.find((t) => t.id === initialTodo.id)?.completed).toBe(initialStatus);
      expect(useStore.getState().error).toBe('Server error');
      spy.mockRestore();
    });

    it('adds a new todo item to the list', async () => {
      const initialLength = useStore.getState().todos.length;

      await useStore.getState().addTodo({
        title: 'Complete Graph Neural Network Module',
        category: 'AI & ML',
        priority: 'HIGH',
        dueDate: 'Today',
        completed: false
      });

      const todos = useStore.getState().todos;
      expect(todos.length).toBe(initialLength + 1);
      expect(todos[0].title).toBe('Complete Graph Neural Network Module');
      expect(todos[0].id).toBeDefined();
    });

    it('deletes a todo item', async () => {
      const todoToDelete = useStore.getState().todos[0];
      await useStore.getState().deleteTodo(todoToDelete.id);

      expect(useStore.getState().todos.some((t) => t.id === todoToDelete.id)).toBe(false);
    });

    it('rolls back only the affected todo item when deleteTodo fails', async () => {
      const todos = useStore.getState().todos;
      const firstTodo = todos[0];
      const secondTodo = todos[1];

      // Mock delete failure for firstTodo
      const deleteSpy = vi.spyOn(api, 'deleteTodo').mockRejectedValueOnce(new Error('Network error on delete'));

      await useStore.getState().deleteTodo(firstTodo.id);

      // firstTodo should be restored without wiping out secondTodo
      const currentTodos = useStore.getState().todos;
      expect(currentTodos.some((t) => t.id === firstTodo.id)).toBe(true);
      expect(currentTodos.some((t) => t.id === secondTodo.id)).toBe(true);
      expect(useStore.getState().error).toBe('Network error on delete');

      deleteSpy.mockRestore();
    });
  });

  describe('Fallback Graph Reciprocal Consistency (generateCosmosNodes)', () => {
    it('verifies all prerequisite relationships are reciprocally mirrored in unlocks', () => {
      const nodes = generateCosmosNodes();

      nodes.forEach((node) => {
        // Every prerequisite must list this node in its unlocks array
        node.prerequisites.forEach((prereqId) => {
          const prereqNode = nodes.find((n) => n.id === prereqId);
          expect(prereqNode).toBeDefined();
          expect(prereqNode?.unlocks).toContain(node.id);
        });

        // Every unlock must list this node in its prerequisites array
        node.unlocks.forEach((unlockId) => {
          const unlockedNode = nodes.find((n) => n.id === unlockId);
          expect(unlockedNode).toBeDefined();
          expect(unlockedNode?.prerequisites).toContain(node.id);
        });
      });
    });
  });

  describe('Prerequisites Graph Actions', () => {
    it('adds and removes prerequisite edges between topics', async () => {
      const topic1 = useStore.getState().topicNodes[0];
      const topic2 = useStore.getState().topicNodes[1];

      await useStore.getState().addPrerequisiteEdge(topic1.id, topic2.id);
      const updated1 = useStore.getState().topicNodes.find((n) => n.id === topic1.id);
      const updated2 = useStore.getState().topicNodes.find((n) => n.id === topic2.id);

      expect(updated1?.prerequisites).toContain(topic2.id);
      expect(updated2?.unlocks).toContain(topic1.id);

      await useStore.getState().removePrerequisiteEdge(topic1.id, topic2.id);
      const reverted1 = useStore.getState().topicNodes.find((n) => n.id === topic1.id);
      const reverted2 = useStore.getState().topicNodes.find((n) => n.id === topic2.id);

      expect(reverted1?.prerequisites).not.toContain(topic2.id);
      expect(reverted2?.unlocks).not.toContain(topic1.id);
    });
  });

  describe('Server Hydration (loadInitialData)', () => {
    it('loads initial data and updates loading state', async () => {
      const fetchTopicsSpy = vi.spyOn(api, 'fetchTopics').mockResolvedValueOnce(INITIAL_TOPICS.slice(0, 10));
      const fetchTodosSpy = vi.spyOn(api, 'fetchTodos').mockResolvedValueOnce(INITIAL_TODOS.slice(0, 2));

      await useStore.getState().loadInitialData();

      expect(useStore.getState().isLoading).toBe(false);
      expect(useStore.getState().error).toBeNull();
      expect(useStore.getState().topicNodes.length).toBe(10);
      expect(useStore.getState().todos.length).toBe(2);

      fetchTopicsSpy.mockRestore();
      fetchTodosSpy.mockRestore();
    });

    it('sets error when loadInitialData fails', async () => {
      const fetchTopicsSpy = vi.spyOn(api, 'fetchTopics').mockRejectedValueOnce(new Error('Connection refused'));
      const fetchTodosSpy = vi.spyOn(api, 'fetchTodos').mockResolvedValueOnce([]);

      await useStore.getState().loadInitialData();

      expect(useStore.getState().isLoading).toBe(false);
      expect(useStore.getState().error).toBe('Connection refused');

      fetchTopicsSpy.mockRestore();
      fetchTodosSpy.mockRestore();
    });
  });

  describe('Filtering and Viewport Controls', () => {
    it('sets search query and selected category', () => {
      useStore.getState().setSearchQuery('Transformer');
      expect(useStore.getState().searchQuery).toBe('Transformer');

      useStore.getState().setSelectedCategory('AI & ML');
      expect(useStore.getState().selectedCategory).toBe('AI & ML');

      useStore.getState().setSelectedCategory(null);
      expect(useStore.getState().selectedCategory).toBeNull();
    });

    it('toggles HUD visibility and sets explicit HUD visibility', () => {
      const initialVisibility = useStore.getState().hudVisible;
      useStore.getState().toggleHudVisibility();
      expect(useStore.getState().hudVisible).toBe(!initialVisibility);

      useStore.getState().setHudVisibility(false);
      expect(useStore.getState().hudVisible).toBe(false);
    });

    it('manages bloom intensity setter', () => {
      useStore.getState().setBloomIntensity(2.4);
      expect(useStore.getState().bloomIntensity).toBe(2.4);
    });

    it('toggles overload mode and system status', () => {
      useStore.getState().setIsOverloaded(true);
      useStore.getState().setSystemStatus('OVERLOADED');
      expect(useStore.getState().isOverloaded).toBe(true);
      expect(useStore.getState().systemStatus).toBe('OVERLOADED');
    });

    it('resets entire state back to initial values', () => {
      useStore.getState().setSearchQuery('temp query');
      useStore.getState().setSelectedCategory('CS');
      useStore.getState().setIsOverloaded(true);

      useStore.getState().resetState();

      expect(useStore.getState().searchQuery).toBe('');
      expect(useStore.getState().selectedCategory).toBeNull();
      expect(useStore.getState().isOverloaded).toBe(false);
      expect(useStore.getState().systemStatus).toBe('OPTIMAL');
    });
  });

  describe('Initial Test Data & Note Loading Integrity', () => {
    it('hydrates all 187 topics and 5 initial todos seamlessly from data/test', () => {
      const state = useStore.getState();
      expect(state.topicNodes.length).toBe(187);
      expect(state.todos.length).toBe(5);
    });

    it('attaches rich markdown and KaTeX note contents to topic nodes', () => {
      const state = useStore.getState();
      const backprop = state.topicNodes.find((n) => n.id === 'TOPIC-001');
      expect(backprop).toBeDefined();
      expect(backprop?.notes).toBeDefined();
      expect(backprop?.notes?.length).toBe(1);

      const note = backprop?.notes?.[0];
      expect(note?.title).toBe('Backpropagation Derivation Notes');
      expect(note?.content).toContain('$$ Z^{[l]} = W^{[l]} A^{[l-1]} + b^{[l]} $$');
      expect(note?.content).toContain('\\nabla_A \\mathcal{L}');
      expect(note?.content).toContain('def backward_propagation(dAL, caches):');
    });
  });
});
