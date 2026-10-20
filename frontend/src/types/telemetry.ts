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

export type ApplicationType =
  | 'OPEN_SOURCE_PROJECT'
  | 'PAPER'
  | 'BLOG'
  | 'CASE_STUDY'
  | 'INTERVIEW_PROBLEM'
  | 'PROJECT_BLUEPRINT';

export type ApplicationDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface ApplicationItem {
  id: string;
  title: string;
  type: ApplicationType;
  domain: DomainCategory;
  difficulty: ApplicationDifficulty;
  organization?: string;
  readTimeMinutes: number;
  summary: string;
  content: string;
  topicIds: string[];
  topicNames?: string[];
  externalUrl?: string;
  quizzes?: QuizItem[];
  // Repository integration
  repositoryId?: string;
  repoFullName?: string;
  starsCount?: number;
  forksCount?: number;
  language?: string;
  activeCommitSha?: string;
}

export type ProblemType = 'CODING' | 'SYSTEM_DESIGN' | 'ML_SYSTEM_DESIGN' | 'OBJECT_ORIENTED_DESIGN';
export type ProblemDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface SystemDesignFollowUp {
  id: string;
  title: string;
  prompt: string;
  rubric: Record<string, number>;
  hints?: string[];
  sampleArchitecture?: string;
}

export interface ProblemFollowUpResponseDTO {
  id: string;
  problemId: string;
  followUpId: string;
  responseText: string;
  diagramData?: any;
  score?: number | null;
  feedback?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RubricCriterionScore {
  score: number;
  maxWeight: number;
  feedback: string;
}

export interface SystemDesignGradingResult {
  score: number;
  rubricScores: Record<string, RubricCriterionScore>;
  scalabilityAssessment: string;
  singlePointsOfFailure: string[];
  tradeOffCritique: string;
  actionableImprovements: string[];
}

export interface GradeFollowUpResponseResult {
  evaluation: SystemDesignGradingResult;
  savedResponse: ProblemFollowUpResponseDTO;
}

export interface GradeSystemDesignPayload {
  problemId?: string;
  followUpId?: string;
  prompt?: string;
  rubric?: Record<string, number>;
  responseText: string;
  diagramData?: any;
}

export interface ProblemItem {
  id: string;
  title: string;
  type: ProblemType;
  difficulty: ProblemDifficulty;
  domain: DomainCategory;
  summary: string;
  prompt: string;
  solution: string;
  hints: string[];
  starterCode?: Record<string, string>;
  testCases?: Array<{ input: any; expected: any; explanation?: string }>;
  rubric?: Record<string, any>;
  followUps?: SystemDesignFollowUp[];
  targetCompanies: string[];
  timeLimitMinutes: number;
  prerequisiteTopicIds?: string[];
  prerequisiteTopics?: TopicNode[];
  quizzes?: QuizItem[];
  createdAt?: string;
  updatedAt?: string;
  guidedLearningPathAvailable?: boolean;
}

export interface InterviewLearningPath {
  problemId: string;
  version: number;
  publicationStatus: 'PILOT' | 'PUBLISHED' | 'RETIRED';
  initialAttemptPrompt?: string;
  problemBreakdown?: {
    framing: { userGoal: string; assumptions: string[]; outOfScope: string[]; clarifications: Array<{ question: string; decision: string; whyItMatters: string }> };
    contract: Array<{ operation: string; behavior: string; complexity: string }>;
    states: Array<{ id: string; meaning: string; terminal: boolean }>;
    transitions: Array<{ from: string; to: string; event: string; guard: string; effect: string }>;
    invariants: Array<{ id: string; statement: string }>;
    failureScenarios: Array<{ id: string; situation: string; queueBehavior: string; sourceTestNames: string[]; additionalTestRecommendation?: string }>;
    complexity: Array<{ operation: string; time: string; space: string; qualification: string }>;
    deliverySemantics: { guarantee: string; duplicatesPossible: boolean; exactlyOnceEffectRequires: string };
    sourceReview: { status: 'PILOT_REVIEWED' | 'NEEDS_REVIEW'; notes: string[] };
  };
  interpretation: { goal: string; constraints: string[]; observations: string[] };
  concepts: Array<{
    id: string;
    name: string;
    intuition: string;
    relevance: string;
    diagnosticQuestion: string;
    diagnosticSuccessCriteria: string;
    topicId?: string;
  }>;
  reasoningStages: Array<{
    id: string;
    title: string;
    purpose: string;
    learnerPrompt: string;
    hint: string;
    expectedOutcome: string;
    verificationCriteria: string[];
  }>;
  misconceptions: string[];
  implementationPlan: Array<{ id: string; task: string; verification: string }>;
  edgeCases: Array<{ input: number[]; expected: number; why: string }>;
  alternatives: Array<{ name: string; time: string; space: string; tradeoff: string }>;
  transferExercise: { prompt: string; changedConstraint: string; assessmentCriteria: string[] };
  assessmentRubric: Array<{ criterion: string; evidence: string }>;
  resources: Array<{ title: string; url: string; conceptId: string; verified: boolean }>;
  qualityReview: { status: 'PILOT_REVIEWED' | 'NEEDS_REVIEW'; notes: string[] };
}

export interface InterviewLearningAttempt {
  id: string;
  problemId: string;
  pathVersion: number;
  startedAt: string;
  completedAt?: string | null;
  durationSeconds?: number | null;
  selfConfidence?: number | null;
  reviewDueAt?: string | null;
}

export type SubmissionStatus = 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'RUNTIME_ERROR' | 'PENDING';

export interface ProblemSubmission {
  id: string;
  problemId: string;
  language: string;
  code: string;
  status: SubmissionStatus;
  passedCount: number;
  totalCount: number;
  runtimeMs: number;
  memoryKb: number;
  failedTestCase?: {
    input: any;
    expected: any;
    actual?: any;
    stdout?: string;
    error?: string;
    explanation?: string;
    testCaseIndex?: number;
  } | null;
  stdout?: string | null;
  createdAt: string;
}

export interface SubmitProblemPayload {
  language: string;
  code: string;
  status?: SubmissionStatus;
  passedCount?: number;
  totalCount?: number;
  runtimeMs?: number;
  memoryKb?: number;
  failedTestCase?: any;
  stdout?: string;
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
  isCreateNodeOpen: boolean;
  isCreateQuizOpen: boolean;
  createQuizTargetTopicId: string | null;

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

  // Applied Content (Case Studies, Engineering Teardowns)
  applications: ApplicationItem[];
  activeApplication: ApplicationItem | null;

  // Interview Problem Bank (Coding & System Design - BAC-38)
  problems: ProblemItem[];
  activeProblem: ProblemItem | null;
  problemSubmissions: Record<string, ProblemSubmission[]>;
  isSubmittingCode: boolean;
  followUpResponses: Record<string, ProblemFollowUpResponseDTO[]>;
  isSavingFollowUp: boolean;
  isGradingFollowUp: boolean;

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
  isManualThemeOverride: boolean;

  // Server Synchronization State
  isLoading: boolean;
  error: string | null;
}

export interface TelemetryActions {
  // Theme Action
  setTheme: (theme: 'dark' | 'light', isManual?: boolean) => void;
  toggleTheme: () => void;
  syncThemeWithTimeOfDay: (date?: Date) => void;

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
  setIsCreateNodeOpen: (open: boolean) => void;
  setIsCreateQuizOpen: (open: boolean) => void;
  setCreateQuizTargetTopicId: (topicId: string | null) => void;

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
  addQuizToTopic: (topicId: string, quiz: Omit<QuizItem, 'id'> & { id?: string }) => Promise<QuizItem | void>;
  updateQuizInTopic: (topicId: string, quiz: QuizItem) => Promise<QuizItem | void>;
  deleteQuizFromTopic: (topicId: string, quizId: string) => Promise<void>;
  addTopicNode: (node: Omit<TopicNode, 'id'>) => Promise<TopicNode | void>;
  updateTopicNode: (id: string, updates: Partial<TopicNode>) => Promise<TopicNode | void>;
  deleteTopicNode: (id: string) => Promise<void>;
  updateTopicMastery: (id: string, mastery: number) => Promise<void>;
  addPrerequisiteEdge: (topicId: string, prerequisiteId: string) => Promise<void>;
  removePrerequisiteEdge: (topicId: string, prerequisiteId: string) => Promise<void>;

  // To-Do List Actions
  toggleTodo: (id: string) => Promise<void>;
  addTodo: (todo: Omit<StudyTodo, 'id'>) => Promise<StudyTodo | void>;
  deleteTodo: (id: string) => Promise<void>;

  // Applied Content Actions
  setActiveApplication: (app: ApplicationItem | null) => void;
  setApplications: (apps: ApplicationItem[]) => void;

  // Problem Bank Actions (BAC-38)
  setActiveProblem: (problem: ProblemItem | null) => void;
  setProblems: (problems: ProblemItem[]) => void;
  fetchProblems: (filter?: any) => Promise<void>;
  updateProblem: (id: string, updates: Partial<ProblemItem>) => Promise<ProblemItem | void>;
  createProblem: (payload: Partial<ProblemItem>) => Promise<ProblemItem | void>;
  deleteProblem: (id: string) => Promise<void>;
  submitProblem: (problemId: string, payload: SubmitProblemPayload) => Promise<ProblemSubmission | void>;
  fetchProblemSubmissions: (problemId: string) => Promise<ProblemSubmission[]>;
  fetchFollowUpResponses: (problemId: string) => Promise<ProblemFollowUpResponseDTO[]>;
  saveFollowUpResponse: (
    problemId: string,
    followUpId: string,
    payload: { responseText: string; diagramData?: any; score?: number; feedback?: string }
  ) => Promise<ProblemFollowUpResponseDTO | void>;
  gradeFollowUpResponse: (
    problemId: string,
    followUpId: string,
    payload: { responseText: string; diagramData?: any }
  ) => Promise<GradeFollowUpResponseResult>;

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

// ==============================================================================
// CODE REPOSITORY DOCUMENTATION ENGINE TYPES
// ==============================================================================

export type RepoOriginType = 'GITHUB' | 'GITLAB' | 'CUSTOM' | 'LOCAL';

export type DesignCategory = 
  | 'ARCHITECTURE'
  | 'ALGORITHM'
  | 'CONCURRENCY'
  | 'DESIGN_PATTERN'
  | 'PERFORMANCE'
  | 'SECURITY'
  | 'SPOF_TRADEOFF'
  | 'GENERAL_NOTE';

export interface RepositoryDTO {
  id: string;
  name: string;
  owner: string;
  fullName: string;
  originType: RepoOriginType;
  cloneUrl: string;
  defaultBranch: string;
  activeCommitSha: string;
  description: string | null;
  language: string | null;
  starsCount: number;
  forksCount: number;
  isArchived: boolean;
  treeCachedAt: string | null;
  caseStudyType?: 'OPEN_SOURCE_PROJECT' | 'PAPER' | 'BLOG';
  annotationsCount?: number;
  cachedBlobsCount?: number;
  cachedBytes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ImportRepositoryInput {
  url?: string;
  fullName?: string;
  owner?: string;
  name?: string;
  branch?: string;
  originType?: RepoOriginType;
  description?: string;
  language?: string;
  customFiles?: Array<{ path: string; content: string }>;
}

export interface RepoTreeNode {
  path: string;
  name: string;
  type: 'file' | 'dir';
  size?: number;
  sha?: string;
  children?: RepoTreeNode[];
}

export interface RepoTreeManifest {
  repositoryId: string;
  commitSha: string;
  tree: RepoTreeNode[];
  totalFiles: number;
  truncated: boolean;
}

export interface CodeAnnotationDTO {
  id: string;
  repositoryId: string;
  commitSha: string;
  filePath: string;
  startLine: number;
  endLine: number;
  title: string;
  content: string;
  anchorCodeSnippet: string;
  designCategory: DesignCategory;
  aiExplanation: any | null;
  topicId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCodeAnnotationInput {
  repositoryId: string;
  commitSha?: string;
  filePath: string;
  startLine: number;
  endLine: number;
  title: string;
  content: string;
  anchorCodeSnippet: string;
  designCategory?: DesignCategory;
  topicId?: string | null;
}

export interface UpdateCodeAnnotationInput {
  title?: string;
  content?: string;
  designCategory?: DesignCategory;
  topicId?: string | null;
}

export interface CodeAnnotationThreadDTO {
  id: string;
  annotationId: string;
  sender: 'USER' | 'SOL_AI' | 'SYSTEM';
  message: string;
  suggestedQuizzes: any | null;
  createdAt: string;
}


