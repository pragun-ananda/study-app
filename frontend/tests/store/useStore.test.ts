import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../src/store/useStore';

describe('Zustand State Store (useStore)', () => {
  beforeEach(() => {
    useStore.getState().resetState();
  });

  describe('Topic Selection, Creation & Mastery', () => {
    it('selects and deselects topics', () => {
      expect(useStore.getState().selectedTopicId).toBeNull();
      useStore.getState().setSelectedTopicId('TOPIC-001');
      expect(useStore.getState().selectedTopicId).toBe('TOPIC-001');

      useStore.getState().setSelectedTopicId(null);
      expect(useStore.getState().selectedTopicId).toBeNull();
    });

    it('updates topic mastery clamped between 0 and 100', () => {
      const topicId = useStore.getState().topicNodes[0].id;
      useStore.getState().updateTopicMastery(topicId, 85);

      const topic = useStore.getState().topicNodes.find((n) => n.id === topicId);
      expect(topic?.mastery).toBe(85);

      // Clamping high
      useStore.getState().updateTopicMastery(topicId, 150);
      expect(useStore.getState().topicNodes.find((n) => n.id === topicId)?.mastery).toBe(100);

      // Clamping low
      useStore.getState().updateTopicMastery(topicId, -20);
      expect(useStore.getState().topicNodes.find((n) => n.id === topicId)?.mastery).toBe(0);
    });

    it('adds a new topic node to the graph', () => {
      const initialCount = useStore.getState().topicNodes.length;
      useStore.getState().addTopicNode({
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
      expect(added?.id).toMatch(/^TOPIC-/);
    });

    it('sets hovered topic and inspector open state', () => {
      useStore.getState().setHoveredTopicId('TOPIC-002');
      expect(useStore.getState().hoveredTopicId).toBe('TOPIC-002');

      useStore.getState().setIsInspectorOpen(true);
      expect(useStore.getState().isInspectorOpen).toBe(true);
    });
  });

  describe('Note CRUD Operations', () => {
    it('adds a new note to a topic and sets it as activeNote', () => {
      const topic = useStore.getState().topicNodes[0];
      const initialCount = topic.notes?.length ?? 0;

      useStore.getState().addNoteToTopic(topic.id, {
        title: 'New Graph Proof',
        content: '# Derivation\n$E=mc^2$'
      });

      const updatedTopic = useStore.getState().topicNodes.find((n) => n.id === topic.id);
      expect(updatedTopic?.notes?.length).toBe(initialCount + 1);

      const newNote = updatedTopic?.notes?.find((n) => n.title === 'New Graph Proof');
      expect(newNote).toBeDefined();
      expect(newNote?.id).toMatch(/^NOTE-/);
      expect(useStore.getState().activeNote?.id).toBe(newNote?.id);
    });

    it('updates an existing note in a topic', () => {
      const topic = useStore.getState().topicNodes[0];
      const note = topic.notes?.[0];
      expect(note).toBeDefined();

      if (note) {
        useStore.getState().updateNoteInTopic(topic.id, {
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

    it('deletes a note and clears activeNote and isNoteEditing if it matches', () => {
      const topic = useStore.getState().topicNodes[0];
      const note = topic.notes?.[0];
      expect(note).toBeDefined();

      if (note) {
        useStore.getState().setActiveNote(note, true);
        expect(useStore.getState().activeNote?.id).toBe(note.id);
        expect(useStore.getState().isNoteEditing).toBe(true);

        useStore.getState().deleteNoteFromTopic(topic.id, note.id);

        const updatedTopic = useStore.getState().topicNodes.find((n) => n.id === topic.id);
        expect(updatedTopic?.notes?.some((n) => n.id === note.id)).toBe(false);
        expect(useStore.getState().activeNote).toBeNull();
        expect(useStore.getState().isNoteEditing).toBe(false);
      }
    });

    it('deletes a note while preserving activeNote when activeNote ID is different', () => {
      const topic = useStore.getState().topicNodes[0];
      useStore.getState().addNoteToTopic(topic.id, { title: 'First Note', content: 'C1' });
      useStore.getState().addNoteToTopic(topic.id, { title: 'Second Note', content: 'C2' });

      const updatedTopic = useStore.getState().topicNodes.find((n) => n.id === topic.id)!;
      const firstNote = updatedTopic.notes?.find((n) => n.title === 'First Note')!;
      const secondNote = updatedTopic.notes?.find((n) => n.title === 'Second Note')!;

      useStore.getState().setActiveNote(secondNote, false);

      // Delete firstNote while secondNote is active
      useStore.getState().deleteNoteFromTopic(topic.id, firstNote.id);

      expect(useStore.getState().activeNote?.id).toBe(secondNote.id);
    });
  });

  describe('Todo CRUD Operations', () => {
    it('toggles a todo completion status', () => {
      const initialTodo = useStore.getState().todos[0];
      const initialStatus = initialTodo.completed;

      useStore.getState().toggleTodo(initialTodo.id);
      expect(useStore.getState().todos.find((t) => t.id === initialTodo.id)?.completed).toBe(!initialStatus);
    });

    it('adds a new todo item to the list', () => {
      const initialLength = useStore.getState().todos.length;

      useStore.getState().addTodo({
        title: 'Complete Graph Neural Network Module',
        category: 'AI & ML',
        priority: 'HIGH',
        dueDate: 'Today',
        completed: false
      });

      const todos = useStore.getState().todos;
      expect(todos.length).toBe(initialLength + 1);
      expect(todos[0].title).toBe('Complete Graph Neural Network Module');
      expect(todos[0].id).toMatch(/^TODO-/);
    });

    it('deletes a todo item', () => {
      const todoToDelete = useStore.getState().todos[0];
      useStore.getState().deleteTodo(todoToDelete.id);

      expect(useStore.getState().todos.some((t) => t.id === todoToDelete.id)).toBe(false);
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
});
