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

export type QuizQuestionType = 'MCQ' | 'TRUE_FALSE' | 'MATCHING' | 'ORDERING' | 'FLASHCARD';
export type QuizQuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface QuizQuestionItem {
  id?: string;
  type: QuizQuestionType | string;
  stem?: string;
  prompt?: string;
  statement?: string;
  options?: Record<string, string>;
  correctAnswer?: string | boolean;
  distractorExplanations?: Record<string, string>;
  explanation?: string;
  pairs?: Array<{ term: string; definition: string }>;
  sequence?: string[];
  term?: string;
  definition?: string;
  memorizationReason?: string;
  sourceAssertion?: string;
  difficulty?: QuizQuestionDifficulty;
}

export interface QuizItem {
  id: string;
  title: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  questions: QuizQuestionItem[];
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
  quizzes?: QuizItem[];
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

export interface IngestionWalkthrough {
  executiveSummary: string;
  extractedConcepts: Array<{ name: string; rationale: string }>;
  omittedContent: Array<{ contentSnippetOrTheme: string; reason: string }>;
  quizCoverageJustification: {
    completenessRationale: string;
    testedFailureModes: string[];
    coverageScore: number;
  };
}

export interface SourceMetadata {
  title?: string;
  domain?: string;
  contentLength?: number;
  cleanedLength?: number;
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
  sourceUrl?: string;
  sourceTitle?: string;
  queueId?: string;
  comments?: LineReviewComment[];
  generalFeedback?: string;
  payload?: {
    topicId?: string;
    noteId?: string;
    quizId?: string;
    patch?: Partial<TopicNode>;
    notePatch?: Partial<NoteItem>;
    edge?: { fromId: string; toId: string };
    [key: string]: any;
  };
}

export interface ReviewQueueItemDTO {
  id: string;
  sourceUrl: string;
  status: GraphUpdateStatus;
  payload: any;
  auditReport: any;
  walkthrough?: IngestionWalkthrough;
  sourceMetadata?: SourceMetadata;
  createdAt: string;
  reviewedAt: string | null;
  updates: GraphUpdate[];
}

export interface ReviewQueueResponseDTO {
  queueItems: ReviewQueueItemDTO[];
  updates: GraphUpdate[];
  counts: {
    pending: number;
    approved: number;
    rejected: number;
    changesRequested: number;
    total: number;
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
  activeQuiz: QuizItem | null;
  activeModalTab: 'NOTE' | 'QUIZ';
  isNoteEditing: boolean;
  todos: StudyTodo[];

  // Review & Diff Updates (FRO-11)
  graphUpdates: GraphUpdate[];
  queueItems: ReviewQueueItemDTO[];
  activeDiffUpdateId: string | null;
  activeWalkthroughQueueId: string | null;
  isNotificationsOpen: boolean;

  // Ingestion State (BAC-2 / Ingest UI)
  isIngesting: boolean;
  ingestError: string | null;

  // Theme Mode
  theme: 'dark' | 'light';

  // Server Synchronization State
  isLoading: boolean;
  error: string | null;
}

export interface TelemetryActions {
  // Theme Action
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;

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
  setActiveQuiz: (quiz: QuizItem | null) => void;
  setActiveModalTab: (tab: 'NOTE' | 'QUIZ') => void;
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
  setActiveWalkthroughQueueId: (id: string | null) => void;
  fetchReviewQueue: (filters?: { status?: string }) => Promise<void>;
  ingestUrl: (url: string) => Promise<IngestPipelineResult | void>;
  approveGraphUpdate: (id: string) => Promise<void> | void;
  rejectGraphUpdate: (id: string) => Promise<void> | void;
  approveEntireQueueItem: (queueId: string) => Promise<void>;
  rejectEntireQueueItem: (queueId: string) => Promise<void>;
  requestChangesGraphUpdate: (id: string, comments: LineReviewComment[], generalFeedback?: string) => Promise<void> | void;
  addCommentToUpdate: (updateId: string, comment: Omit<LineReviewComment, 'id' | 'createdAt'>) => void;
  deleteCommentFromUpdate: (updateId: string, commentId: string) => void;
  resetGraphUpdates: () => void;

  // Reset Action
  resetState: () => void;
}


export type TelemetryStore = TelemetryState & TelemetryActions;


