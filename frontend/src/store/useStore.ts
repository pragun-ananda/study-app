import { create } from 'zustand';
import {
  TelemetryStore,
  TelemetryState,
  SystemStatus,
  TopicNode,
  NoteItem,
  StudyTodo
} from '../types/telemetry';
import { INITIAL_TODOS } from '../data/test';
import * as api from '../api/client';
import { generateCelestialPlanetNodes } from '../utils/celestialPlanetLayout';
import { generateSolarBeltNodes } from '../utils/solarBeltLayout';
import { generateBrainConnectomeNodes } from '../utils/brainLayout';

// Geometric Spherical Planet layout generator
export { generateCelestialPlanetNodes, generateSolarBeltNodes, generateBrainConnectomeNodes };
export const generateCosmosNodes = generateCelestialPlanetNodes;

export const INITIAL_TOPICS = generateCelestialPlanetNodes();
export { INITIAL_TODOS };

export const INITIAL_STATE: TelemetryState = {
  systemStatus: 'OPTIMAL',
  isOverloaded: false,
  bloomIntensity: 1.5,
  hudVisible: true,

  searchQuery: '',
  selectedCategory: null,

  topicNodes: INITIAL_TOPICS,
  selectedTopicId: null,
  hoveredTopicId: null,
  isInspectorOpen: false,
  activeNote: null,
  isNoteEditing: false,
  todos: INITIAL_TODOS,

  isLoading: false,
  error: null
};

export const useStore = create<TelemetryStore>((set, get) => ({
  ...INITIAL_STATE,

  // System Setters
  setSystemStatus: (systemStatus: SystemStatus) => set({ systemStatus }),
  setIsOverloaded: (isOverloaded: boolean) => set({ isOverloaded }),
  setBloomIntensity: (bloomIntensity: number) => set({ bloomIntensity }),
  setHudVisibility: (hudVisible: boolean) => set({ hudVisible }),
  toggleHudVisibility: () => set((state) => ({ hudVisible: !state.hudVisible })),

  // Search & Filter Actions
  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory: string | null) => set({ selectedCategory }),
  setHoveredTopicId: (hoveredTopicId: string | null) => set({ hoveredTopicId }),

  // Server Hydration Actions
  loadInitialData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [topics, todos] = await Promise.all([
        api.fetchTopics(),
        api.fetchTodos()
      ]);
      set({ topicNodes: topics, todos, isLoading: false, error: null });
    } catch (err: any) {
      set({
        error: err.message || 'Failed to load initial cosmos telemetry data',
        isLoading: false
      });
    }
  },

  fetchTopics: async () => {
    try {
      const topics = await api.fetchTopics();
      set({ topicNodes: topics, error: null });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch topics' });
    }
  },

  fetchTodos: async () => {
    try {
      const todos = await api.fetchTodos();
      set({ todos, error: null });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch todos' });
    }
  },

  hydrate: (topics: TopicNode[], todos: StudyTodo[]) => {
    set({ topicNodes: topics, todos, isLoading: false, error: null });
  },

  // Knowledge Graph Actions
  setSelectedTopicId: (selectedTopicId: string | null) => set({ selectedTopicId }),
  setIsInspectorOpen: (isInspectorOpen: boolean) => set({ isInspectorOpen }),
  setActiveNote: (activeNote: NoteItem | null, isNoteEditing = false) =>
    set({ activeNote, isNoteEditing }),
  setIsNoteEditing: (isNoteEditing: boolean) => set({ isNoteEditing }),

  addNoteToTopic: async (topicId: string, noteData: Omit<NoteItem, 'id'>) => {
    try {
      const createdNote = await api.createNoteForTopic(topicId, noteData);
      set((state) => {
        const updated = state.topicNodes.map((n) => {
          if (n.id === topicId) {
            return { ...n, notes: [...(n.notes || []), createdNote] };
          }
          return n;
        });
        return { topicNodes: updated, activeNote: createdNote, isNoteEditing: false, error: null };
      });
      return createdNote;
    } catch (err: any) {
      set({ error: err.message || 'Failed to add note to topic' });
    }
  },

  updateNoteInTopic: async (topicId: string, note: NoteItem) => {
    try {
      const updatedNote = await api.updateNote(note.id, note);
      set((state) => {
        const updated = state.topicNodes.map((n) => {
          if (n.id === topicId) {
            const nextNotes = (n.notes || []).map((item) =>
              item.id === updatedNote.id ? updatedNote : item
            );
            return { ...n, notes: nextNotes };
          }
          return n;
        });
        return { topicNodes: updated, activeNote: updatedNote, isNoteEditing: false, error: null };
      });
      return updatedNote;
    } catch (err: any) {
      set({ error: err.message || 'Failed to update note' });
    }
  },

  deleteNoteFromTopic: async (topicId: string, noteId: string) => {
    try {
      await api.deleteNote(noteId);
      set((state) => {
        const updated = state.topicNodes.map((n) => {
          if (n.id === topicId) {
            return { ...n, notes: (n.notes || []).filter((note) => note.id !== noteId) };
          }
          return n;
        });
        const nextActive = state.activeNote?.id === noteId ? null : state.activeNote;
        return {
          topicNodes: updated,
          activeNote: nextActive,
          isNoteEditing: state.activeNote?.id === noteId ? false : state.isNoteEditing,
          error: null
        };
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete note' });
    }
  },

  addTopicNode: async (nodeData: Omit<TopicNode, 'id'>) => {
    try {
      const createdTopic = await api.createTopic(nodeData);
      set((state) => ({
        topicNodes: [...state.topicNodes, createdTopic],
        error: null
      }));
      return createdTopic;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create topic' });
    }
  },

  updateTopicMastery: async (id: string, mastery: number) => {
    const previous = get().topicNodes.find((n) => n.id === id)?.mastery;
    const clamped = Math.max(0, Math.min(100, mastery));

    // 1. Optimistic update
    set((state) => ({
      topicNodes: state.topicNodes.map((n) =>
        n.id === id ? { ...n, mastery: clamped } : n
      ),
      error: null
    }));

    // 2. Persist with rollback on failure
    try {
      await api.updateTopic(id, { mastery: clamped });
    } catch (err: any) {
      if (previous !== undefined) {
        set((state) => ({
          topicNodes: state.topicNodes.map((n) =>
            n.id === id ? { ...n, mastery: previous } : n
          ),
          error: err.message || 'Failed to update topic mastery'
        }));
      }
    }
  },

  addPrerequisiteEdge: async (topicId: string, prerequisiteId: string) => {
    try {
      await api.addPrerequisite(topicId, prerequisiteId);
      set((state) => {
        const updated = state.topicNodes.map((n) => {
          if (n.id === topicId && !n.prerequisites.includes(prerequisiteId)) {
            return { ...n, prerequisites: [...n.prerequisites, prerequisiteId] };
          }
          if (n.id === prerequisiteId && !n.unlocks.includes(topicId)) {
            return { ...n, unlocks: [...n.unlocks, topicId] };
          }
          return n;
        });
        return { topicNodes: updated, error: null };
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to add prerequisite relationship' });
    }
  },

  removePrerequisiteEdge: async (topicId: string, prerequisiteId: string) => {
    try {
      await api.removePrerequisite(topicId, prerequisiteId);
      set((state) => {
        const updated = state.topicNodes.map((n) => {
          if (n.id === topicId) {
            return { ...n, prerequisites: n.prerequisites.filter((id) => id !== prerequisiteId) };
          }
          if (n.id === prerequisiteId) {
            return { ...n, unlocks: n.unlocks.filter((id) => id !== topicId) };
          }
          return n;
        });
        return { topicNodes: updated, error: null };
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to remove prerequisite relationship' });
    }
  },

  // To-Do Actions
  toggleTodo: async (id: string) => {
    const todo = get().todos.find((t) => t.id === id);
    if (!todo) return;
    const nextCompleted = !todo.completed;

    // 1. Optimistic toggle
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === id ? { ...t, completed: nextCompleted } : t
      ),
      error: null
    }));

    // 2. Persist with rollback on failure
    try {
      await api.updateTodo(id, { completed: nextCompleted });
    } catch (err: any) {
      set((state) => ({
        todos: state.todos.map((t) =>
          t.id === id ? { ...t, completed: todo.completed } : t
        ),
        error: err.message || 'Failed to toggle todo status'
      }));
    }
  },

  addTodo: async (todoData: Omit<StudyTodo, 'id'>) => {
    try {
      const createdTodo = await api.createTodo(todoData);
      set((state) => ({
        todos: [createdTodo, ...state.todos],
        error: null
      }));
      return createdTodo;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create todo' });
    }
  },

  deleteTodo: async (id: string) => {
    const todoToDelete = get().todos.find((t) => t.id === id);
    if (!todoToDelete) return;

    // 1. Optimistic delete
    set((state) => ({
      todos: state.todos.filter((t) => t.id !== id),
      error: null
    }));

    // 2. Persist with item-specific rollback on failure
    try {
      await api.deleteTodo(id);
    } catch (err: any) {
      set((state) => {
        // Only re-insert if it isn't already present
        if (state.todos.some((t) => t.id === id)) return state;
        return {
          todos: [...state.todos, todoToDelete],
          error: err.message || 'Failed to delete todo'
        };
      });
    }
  },

  // Reset Action
  resetState: () => set(INITIAL_STATE)
}));
