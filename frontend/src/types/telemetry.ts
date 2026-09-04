export type SystemStatus = 'OPTIMAL' | 'DEGRADED' | 'OVERLOADED' | 'OFFLINE' | 'STANDBY';

export const DEFAULT_DOMAINS = ['CS', 'AI & ML', 'MATH', 'PHYSICS', 'SYSTEMS', 'CYBERSECURITY', 'ARCH'] as const;
export type DefaultDomainCategory = (typeof DEFAULT_DOMAINS)[number];
export type DomainCategory = DefaultDomainCategory | (string & {});

export type TopicStatus = 'DUE' | 'LEARNING' | 'MASTERED' | 'NEW';

export type TodoPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface NoteItem {
  id: string;
  title: string;
  filename?: string;
  createdAt?: string;
  updatedAt?: string;
  content?: string;
}

export interface TopicNode {
  id: string;
  name: string;
  category: DomainCategory;
  mastery: number; // 0 - 100%
  status: TopicStatus;
  lastReviewed: string;
  coordinates: [number, number, number];
  prerequisites: string[]; // Node IDs required BEFORE learning this topic (A -> X)
  unlocks: string[]; // Node IDs unlocked AFTER learning this topic (X -> B)
  summary: string;
  notes?: NoteItem[];
}

export interface StudyTodo {
  id: string;
  title: string;
  completed: boolean;
  category: DomainCategory;
  priority: TodoPriority;
  dueDate: string;
  topicId?: string;
}

export type IngestPipelineStep =
  | 'fetch_url'
  | 'clean_content'
  | 'extract_topics'
  | 'generate_content'
  | 'review_content'
  | 'add_to_review_queue';

export interface IngestRequestOptions {
  timeoutMs?: number;
}

export interface IngestRequestPayload {
  url: string;
  options?: IngestRequestOptions;
}

export interface IngestPipelineResult {
  status: 'success' | 'error';
  url: string;
  executedSteps: IngestPipelineStep[];
  message: string;
  details?: {
    finalUrl?: string;
    fetchStatus?: number;
    contentLength?: number;
    cleanedLength?: number;
    cleanedTitle?: string;
    extractedTopicsCount?: number;
    generatedNotesCount?: number;
    reviewPassed?: boolean;
    queueId?: string | null;
  };
}

export type GraphUpdateType = 'TOPIC_UPDATE' | 'NOTE_UPDATE' | 'EDGE_UPDATE' | 'QUIZ_UPDATE';

export type GraphUpdateStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export interface LineReviewComment {
  id: string;
  lineNumber: number;
  selectedText?: string;
  comment: string;
  createdAt: string;
}

export interface GraphUpdate {
  id: string;
  title: string;
  description: string;
  category: DomainCategory;
  type: GraphUpdateType;
  status: GraphUpdateStatus;
  createdAt: string;
  targetId: string;
  targetName: string;
  oldContent: string;
  newContent: string;
  comments?: LineReviewComment[];
  generalFeedback?: string;
  payload?: {
    topicId?: string;
    noteId?: string;
    patch?: Partial<TopicNode>;
    notePatch?: Partial<NoteItem>;
    edge?: { fromId: string; toId: string };
  };
}

export interface TelemetryState {
  // System State & Shaders
  systemStatus: SystemStatus;
  isOverloaded: boolean;
  bloomIntensity: number;
  hudVisible: boolean;

  // Navigation & Filtering
  searchQuery: string;
  isSearchOpen: boolean;
  isSidebarOpen: boolean;
  selectedCategory: string | null;

  // Knowledge Graph & Study Data
  topicNodes: TopicNode[];
  selectedTopicId: string | null;
  hoveredTopicId: string | null;
  isInspectorOpen: boolean;
  activeNote: NoteItem | null;
  isNoteEditing: boolean;
  todos: StudyTodo[];

  // Review & Diff Updates (FRO-11)
  graphUpdates: GraphUpdate[];
  activeDiffUpdateId: string | null;
  isNotificationsOpen: boolean;

  // Server Synchronization State
  isLoading: boolean;
  error: string | null;
}

export interface TelemetryActions {
  // System Setters
  setSystemStatus: (status: SystemStatus) => void;
  setIsOverloaded: (overloaded: boolean) => void;
  setBloomIntensity: (intensity: number) => void;
  setHudVisibility: (visible: boolean) => void;
  toggleHudVisibility: () => void;

  // Search & Navigation Setters
  setSearchQuery: (query: string) => void;
  setIsSearchOpen: (open: boolean) => void;
  setIsSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSelectedCategory: (category: string | null) => void;
  setHoveredTopicId: (id: string | null) => void;

  // Server Hydration & Direct State Injection
  loadInitialData: () => Promise<void>;
  fetchTopics: () => Promise<void>;
  fetchTodos: () => Promise<void>;
  hydrate: (topics: TopicNode[], todos: StudyTodo[]) => void;

  // Knowledge Graph Actions
  setSelectedTopicId: (id: string | null) => void;
  setIsInspectorOpen: (open: boolean) => void;
  setActiveNote: (note: NoteItem | null, isEditing?: boolean) => void;
  setIsNoteEditing: (isEditing: boolean) => void;
  addNoteToTopic: (topicId: string, note: Omit<NoteItem, 'id'>) => Promise<NoteItem | void>;
  updateNoteInTopic: (topicId: string, note: NoteItem) => Promise<NoteItem | void>;
  deleteNoteFromTopic: (topicId: string, noteId: string) => Promise<void>;
  addTopicNode: (node: Omit<TopicNode, 'id'>) => Promise<TopicNode | void>;
  updateTopicMastery: (id: string, mastery: number) => Promise<void>;
  addPrerequisiteEdge: (topicId: string, prerequisiteId: string) => Promise<void>;
  removePrerequisiteEdge: (topicId: string, prerequisiteId: string) => Promise<void>;

  // To-Do List Actions
  toggleTodo: (id: string) => Promise<void>;
  addTodo: (todo: Omit<StudyTodo, 'id'>) => Promise<StudyTodo | void>;
  deleteTodo: (id: string) => Promise<void>;

  // Diff Review Actions (FRO-11)
  setIsNotificationsOpen: (open: boolean) => void;
  setActiveDiffUpdateId: (id: string | null) => void;
  approveGraphUpdate: (id: string) => void;
  rejectGraphUpdate: (id: string) => void;
  requestChangesGraphUpdate: (id: string, comments: LineReviewComment[], generalFeedback?: string) => void;
  addCommentToUpdate: (updateId: string, comment: Omit<LineReviewComment, 'id' | 'createdAt'>) => void;
  deleteCommentFromUpdate: (updateId: string, commentId: string) => void;
  resetGraphUpdates: () => void;

  // Reset Action
  resetState: () => void;
}


export type TelemetryStore = TelemetryState & TelemetryActions;


