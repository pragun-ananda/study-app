import { create } from 'zustand';
import {
  TelemetryStore,
  TelemetryState,
  SystemStatus,
  StudyMode,
  TopicNode,
  NoteItem,
  StudyTodo,
  PomodoroState,
  AudioFrequencyData,
  SystemDiagnostics,
  MousePosition
} from '../types/telemetry';

import { RawTopic, DOMAIN_DATA, INITIAL_TODOS } from '../data/test';

// Robust 3D spatial layout generator with multi-pass iterative force-directed relaxation
function generateCosmosNodes(): TopicNode[] {
  const nodes: TopicNode[] = [];
  const nameToIdMap = new Map<string, string>();
  let idCounter = 1;

  // Step 1: Assign initial cluster sphere positions
  DOMAIN_DATA.forEach((domainGroup, domainIdx) => {
    const clusterAngle = (domainIdx / DOMAIN_DATA.length) * Math.PI * 2;
    const clusterRadius = 18.0; // Expanded domain cluster separation radius
    const clusterX = Math.cos(clusterAngle) * clusterRadius;
    const clusterY = Math.sin(clusterAngle) * clusterRadius;
    const clusterZ = (domainIdx % 2 === 0 ? 1.0 : -1.0) * (3.0 + Math.random() * 2.5);

    domainGroup.topics.forEach((topic, topicIdx) => {
      const id = `TOPIC-${idCounter.toString().padStart(3, '0')}`;
      idCounter++;
      nameToIdMap.set(topic.name, id);

      const phi = Math.acos(1 - 2 * (topicIdx + 0.5) / domainGroup.topics.length);
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

  // Step 2: Multi-Pass Iterative Collision Relaxation (50 iterations)
  // Guarantees MIN_DIST >= 3.4 units between EVERY pair of nodes in 3D space
  const MIN_DIST = 3.4;
  for (let pass = 0; pass < 50; pass++) {
    let moved = false;
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

          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  // Format final coordinates to 2 decimal places
  nodes.forEach((node) => {
    node.coordinates = [
      Number(node.coordinates[0].toFixed(2)),
      Number(node.coordinates[1].toFixed(2)),
      Number(node.coordinates[2].toFixed(2))
    ];
  });

  // Step 3: Register bi-directional prerequisite relationships
  DOMAIN_DATA.forEach((domainGroup) => {
    domainGroup.topics.forEach((topic) => {
      const currentId = nameToIdMap.get(topic.name);
      if (!currentId) return;

      const currentNode = nodes.find((n) => n.id === currentId);
      if (!currentNode) return;

      if (topic.prereqNames) {
        topic.prereqNames.forEach((prereqName) => {
          const prereqId = nameToIdMap.get(prereqName);
          if (prereqId) {
            if (!currentNode.prerequisites.includes(prereqId)) {
              currentNode.prerequisites.push(prereqId);
            }
            const prereqNode = nodes.find((n) => n.id === prereqId);
            if (prereqNode && !prereqNode.unlocks.includes(currentId)) {
              prereqNode.unlocks.push(currentId);
            }
          }
        });
      }

      if (topic.unlockNames) {
        topic.unlockNames.forEach((unlockName) => {
          const unlockId = nameToIdMap.get(unlockName);
          if (unlockId) {
            if (!currentNode.unlocks.includes(unlockId)) {
              currentNode.unlocks.push(unlockId);
            }
            const unlockNode = nodes.find((n) => n.id === unlockId);
            if (unlockNode && !unlockNode.prerequisites.includes(currentId)) {
              unlockNode.prerequisites.push(currentId);
            }
          }
        });
      }
    });
  });

  return nodes;
}

const INITIAL_TOPICS = generateCosmosNodes();

const INITIAL_POMODORO: PomodoroState = {
  mode: 'FOCUS',
  timeLeft: 25 * 60,
  isRunning: false,
  completedSessions: 3
};

const INITIAL_DIAGNOSTICS: SystemDiagnostics = {
  cpuUsage: 14.2,
  ramUsage: 3.8,
  ramTotal: 16.0,
  systemUptime: 7200,
  gridFrequency: 60.0,
  fps: 60,
  masteryScore: 58.4,
  streakDays: 14
};

const INITIAL_AUDIO: AudioFrequencyData = {
  isPlaying: false,
  volume: 0.75,
  bass: 0.0,
  mid: 0.0,
  treble: 0.0,
  bpm: 124,
  rawFftData: new Uint8Array(64)
};

const INITIAL_STATE: TelemetryState = {
  systemStatus: 'OPTIMAL',
  activeMode: 'EXPLORE',
  isOverloaded: false,
  gridPowerLevel: 94.6,
  particleDensity: 16000,
  
  mousePosition: { x: 0, y: 0, normalizedX: 0, normalizedY: 0 },
  cameraFocus: false,
  hudVisible: true,
  bloomIntensity: 1.5,
  zoomLevel: 0.4,

  searchQuery: '',
  selectedCategory: null,

  topicNodes: INITIAL_TOPICS,
  selectedTopicId: null,
  hoveredTopicId: null,
  isInspectorOpen: false,
  activeNote: null,
  isNoteEditing: false,
  todos: INITIAL_TODOS,
  pomodoro: INITIAL_POMODORO,

  diagnostics: INITIAL_DIAGNOSTICS,
  audioData: INITIAL_AUDIO
};

export const useStore = create<TelemetryStore>((set) => ({
  ...INITIAL_STATE,

  // Mode & System Setters
  setActiveMode: (activeMode: StudyMode) => set({ activeMode }),
  setSystemStatus: (systemStatus: SystemStatus) => set({ systemStatus }),
  setParticleDensity: (particleDensity: number) =>
    set({ particleDensity: Math.max(2000, Math.min(50000, particleDensity)) }),
  setIsOverloaded: (isOverloaded: boolean) => set({ isOverloaded }),

  // Viewport & Zoom Setters
  setMousePosition: (mousePosition: MousePosition) => set({ mousePosition }),
  toggleCameraFocus: () => set((state) => ({ cameraFocus: !state.cameraFocus })),
  setCameraFocus: (cameraFocus: boolean) => set({ cameraFocus }),
  toggleHudVisibility: () => set((state) => ({ hudVisible: !state.hudVisible })),
  setHudVisibility: (hudVisible: boolean) => set({ hudVisible }),
  setBloomIntensity: (bloomIntensity: number) => set({ bloomIntensity }),
  
  setZoomLevel: (zoomLevel: number) =>
    set({ zoomLevel: Math.max(0.2, Math.min(3.5, zoomLevel)) }),
  zoomIn: () =>
    set((state) => ({ zoomLevel: Math.min(3.5, state.zoomLevel + 0.3) })),
  zoomOut: () =>
    set((state) => ({ zoomLevel: Math.max(0.2, state.zoomLevel - 0.3) })),

  // Search & Filter Actions
  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory: string | null) => set({ selectedCategory }),
  setHoveredTopicId: (hoveredTopicId: string | null) => set({ hoveredTopicId }),

  // Knowledge Graph Actions
  setIsInspectorOpen: (isInspectorOpen: boolean) => set({ isInspectorOpen }),
  setActiveNote: (activeNote: NoteItem | null, isNoteEditing = false) =>
    set({ activeNote, isNoteEditing }),
  setIsNoteEditing: (isNoteEditing: boolean) => set({ isNoteEditing }),
  addNoteToTopic: (topicId: string, note: Omit<NoteItem, 'id'>) =>
    set((state) => {
      const newId = `NOTE-${Date.now().toString().slice(-4)}`;
      const today = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const newNote: NoteItem = {
        ...note,
        id: newId,
        createdAt: note.createdAt || today,
        updatedAt: note.updatedAt || 'Just now'
      };
      const updated = state.topicNodes.map((n) => {
        if (n.id === topicId) {
          return { ...n, notes: [...(n.notes || []), newNote] };
        }
        return n;
      });
      return { topicNodes: updated, activeNote: newNote, isNoteEditing: false };
    }),
  updateNoteInTopic: (topicId: string, updatedNote: NoteItem) =>
    set((state) => {
      const updated = state.topicNodes.map((n) => {
        if (n.id === topicId) {
          const nextNotes = (n.notes || []).map((note) =>
            note.id === updatedNote.id ? updatedNote : note
          );
          return { ...n, notes: nextNotes };
        }
        return n;
      });
      return { topicNodes: updated, activeNote: updatedNote, isNoteEditing: false };
    }),
  deleteNoteFromTopic: (topicId: string, noteId: string) =>
    set((state) => {
      const updated = state.topicNodes.map((n) => {
        if (n.id === topicId) {
          return { ...n, notes: (n.notes || []).filter((note) => note.id !== noteId) };
        }
        return n;
      });
      const nextActive = state.activeNote?.id === noteId ? null : state.activeNote;
      return { topicNodes: updated, activeNote: nextActive };
    }),
  setSelectedTopicId: (selectedTopicId: string | null) => set({ selectedTopicId }),
  addTopicNode: (node: Omit<TopicNode, 'id'>) =>
    set((state) => {
      const newId = `TOPIC-${(state.topicNodes.length + 1).toString().padStart(3, '0')}`;
      return { topicNodes: [...state.topicNodes, { ...node, id: newId }] };
    }),
  updateTopicMastery: (id: string, mastery: number) =>
    set((state) => {
      const updated = state.topicNodes.map((n) =>
        n.id === id ? { ...n, mastery: Math.max(0, Math.min(100, mastery)) } : n
      );
      const avgMastery = Number(
        (updated.reduce((acc, curr) => acc + curr.mastery, 0) / updated.length).toFixed(1)
      );
      return {
        topicNodes: updated,
        diagnostics: { ...state.diagnostics, masteryScore: avgMastery }
      };
    }),

  // To-Do Actions
  toggleTodo: (id: string) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    })),
  addTodo: (todo: Omit<StudyTodo, 'id'>) =>
    set((state) => {
      const newId = `TODO-${(state.todos.length + 1).toString().padStart(3, '0')}`;
      return { todos: [{ ...todo, id: newId }, ...state.todos] };
    }),
  deleteTodo: (id: string) =>
    set((state) => ({
      todos: state.todos.filter((todo) => todo.id !== id)
    })),

  // Pomodoro Actions
  togglePomodoro: () =>
    set((state) => ({
      pomodoro: { ...state.pomodoro, isRunning: !state.pomodoro.isRunning }
    })),
  resetPomodoro: (mode = 'FOCUS') =>
    set((state) => ({
      pomodoro: {
        ...state.pomodoro,
        mode,
        timeLeft: mode === 'FOCUS' ? 25 * 60 : mode === 'SHORT_BREAK' ? 5 * 60 : 15 * 60,
        isRunning: false
      }
    })),
  tickPomodoro: () =>
    set((state) => {
      const { timeLeft, isRunning, completedSessions, mode } = state.pomodoro;
      if (!isRunning) return state;

      if (timeLeft <= 1) {
        const nextMode = mode === 'FOCUS' ? 'SHORT_BREAK' : 'FOCUS';
        const nextSessions = mode === 'FOCUS' ? completedSessions + 1 : completedSessions;
        return {
          pomodoro: {
            mode: nextMode,
            timeLeft: nextMode === 'FOCUS' ? 25 * 60 : 5 * 60,
            isRunning: false,
            completedSessions: nextSessions
          }
        };
      }

      return {
        pomodoro: { ...state.pomodoro, timeLeft: timeLeft - 1 }
      };
    }),

  // System Diagnostics Setters
  updateDiagnostics: (metrics: Partial<SystemDiagnostics>) =>
    set((state) => ({
      diagnostics: { ...state.diagnostics, ...metrics }
    })),

  // Audio Actions
  setAudioData: (data: Partial<AudioFrequencyData>) =>
    set((state) => ({
      audioData: { ...state.audioData, ...data }
    })),

  // Reset Action
  resetState: () => set(INITIAL_STATE)
}));
