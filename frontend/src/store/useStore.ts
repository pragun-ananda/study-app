import { create } from 'zustand';
import {
  TelemetryStore,
  TelemetryState,
  SystemStatus,
  TopicNode,
  NoteItem,
  StudyTodo
} from '../types/telemetry';
import { DOMAIN_DATA, INITIAL_TODOS } from '../data/test';
import * as api from '../api/client';

// Deterministic 3D spatial layout generator for initial fallback / offline testing
export function generateCosmosNodes(): TopicNode[] {
  const nodes: TopicNode[] = [];
  const nameToIdMap = new Map<string, string>();
  let idCounter = 1;

  DOMAIN_DATA.forEach((domainGroup, domainIdx) => {
    const clusterAngle = (domainIdx / DOMAIN_DATA.length) * Math.PI * 2;
    const clusterRadius = 18.0;
    const clusterX = Math.cos(clusterAngle) * clusterRadius;
    const clusterY = Math.sin(clusterAngle) * clusterRadius;
    const clusterZ = (domainIdx % 2 === 0 ? 1.0 : -1.0) * (3.0 + Math.random() * 2.5);

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

      const mastery = Math.floor(Math.random() * 85) + 10;
      const status: TopicNode['status'] =
        mastery >= 80 ? 'MASTERED' : mastery >= 50 ? 'LEARNING' : mastery >= 30 ? 'DUE' : 'NEW';

      const timeAgo = ['2 hours ago', 'Yesterday', '3 days ago', '1 week ago', 'Never'][topicIdx % 5];

      nodes.push({
        id,
        name: topic.name,
        category: domainGroup.category,
        mastery,
        status,
        lastReviewed: timeAgo,
        coordinates: [Number(x.toFixed(2)), Number(y.toFixed(2)), Number(z.toFixed(2))],
        prerequisites: [],
        unlocks: [],
        summary: topic.summary,
        notes: topic.notes || []
      });
    });
  });

  const MIN_DIST = 3.4;
  for (let pass = 0; pass < 50; pass++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];

        let dx = n2.coordinates[0] - n1.coordinates[0];
        let dy = n2.coordinates[1] - n1.coordinates[1];
        let dz = n2.coordinates[2] - n1.coordinates[2];
        let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < MIN_DIST) {
          if (dist === 0) {
            dx = (Math.random() - 0.5) * 0.2;
            dy = (Math.random() - 0.5) * 0.2;
            dz = (Math.random() - 0.5) * 0.2;
            dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          }

          const overlap = (MIN_DIST - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          n1.coordinates[0] -= nx * overlap;
          n1.coordinates[1] -= ny * overlap;
          n1.coordinates[2] -= nz * overlap;

          n2.coordinates[0] += nx * overlap;
          n2.coordinates[1] += ny * overlap;
          n2.coordinates[2] += nz * overlap;
        }
      }
    }
  }

  DOMAIN_DATA.forEach((domainGroup) => {
    domainGroup.topics.forEach((rawTopic) => {
      const currentId = nameToIdMap.get(rawTopic.name);
      if (!currentId) return;
      const node = nodes.find((n) => n.id === currentId);
      if (!node) return;

      if (rawTopic.prereqNames) {
        rawTopic.prereqNames.forEach((prereqName) => {
          const prereqId = nameToIdMap.get(prereqName);
          if (prereqId) {
            if (!node.prerequisites.includes(prereqId)) {
              node.prerequisites.push(prereqId);
            }
            const prereqNode = nodes.find((n) => n.id === prereqId);
            if (prereqNode && !prereqNode.unlocks.includes(currentId)) {
              prereqNode.unlocks.push(currentId);
            }
          }
        });
      }

      if (rawTopic.unlockNames) {
        rawTopic.unlockNames.forEach((unlockName) => {
          const unlockId = nameToIdMap.get(unlockName);
          if (unlockId) {
            if (!node.unlocks.includes(unlockId)) {
              node.unlocks.push(unlockId);
            }
            const unlockedNode = nodes.find((n) => n.id === unlockId);
            if (unlockedNode && !unlockedNode.prerequisites.includes(currentId)) {
              unlockedNode.prerequisites.push(currentId);
            }
          }
        });
      }
    });
  });

  return nodes;
}

export const INITIAL_TOPICS = generateCosmosNodes();
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
