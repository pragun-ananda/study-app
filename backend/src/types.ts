// Category Taxonomy (Defaults with dynamic emergent domain support)
export const DEFAULT_DOMAINS = [
  'AI & ML',
  'CS',
  'SYSTEMS',
  'MATH',
  'PHYSICS',
  'CYBERSECURITY',
  'ARCH'
] as const;

export type DefaultDomainCategory = (typeof DEFAULT_DOMAINS)[number];
export type DomainCategory = DefaultDomainCategory | (string & {});

// Status Enums matching database schema CHECK constraints
export type TopicStatus = 'DUE' | 'LEARNING' | 'MASTERED' | 'NEW';

// Priority Enums matching study todos CHECK constraints
export type TodoPriority = 'HIGH' | 'MEDIUM' | 'LOW';

// Raw PostgreSQL Database Rows
export interface TopicRow {
  id: string;
  name: string;
  category: DomainCategory;
  summary: string;
  mastery: string | number; // pg driver returns numeric as string
  status: TopicStatus;
  coord_x: string | number;
  coord_y: string | number;
  coord_z: string | number;
  last_reviewed: string | null;
}

export interface TopicPrerequisiteRow {
  topic_id: string;
  prerequisite_id: string;
}

export interface NoteRow {
  id: string;
  topic_id: string;
  title: string;
  filename: string | null;
  content: string;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface QuizRow {
  id: string;
  topic_id: string;
  title: string;
  description: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export type QuizQuestionType = 'MCQ' | 'TRUE_FALSE' | 'MATCHING' | 'ORDERING' | 'FLASHCARD';
export type QuizQuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface QuizQuestionRow {
  id: string;
  quiz_id: string;
  note_id: string | null;
  type: QuizQuestionType;
  prompt: string;
  payload: any;
  correct_answer: string;
  explanation: string;
  difficulty: QuizQuestionDifficulty;
  created_at: string | Date;
}

export interface IngestReviewQueueRow {
  id: string;
  source_url: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  payload: any;
  audit_report: any;
  created_at: string | Date;
  reviewed_at: string | Date | null;
}

export interface StudyTodoRow {
  id: string;
  topic_id: string | null;
  title: string;
  category: DomainCategory;
  priority: TodoPriority;
  completed: boolean;
  due_date: string;
  created_at: string | Date;
}

// API DTOs (Data Transfer Objects) matching Frontend Types
export interface TopicDTO {
  id: string;
  name: string;
  category: DomainCategory;
  summary: string;
  mastery: number;
  status: TopicStatus;
  coordinates: [number, number, number];
  lastReviewed: string;
  prerequisites: string[];
  unlocks: string[];
  notes?: NoteDTO[];
}

export interface NoteDTO {
  id: string;
  title: string;
  filename?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuizQuestionDTO {
  id: string;
  quizId: string;
  noteId?: string;
  type: QuizQuestionType;
  prompt: string;
  payload: any;
  correctAnswer: string;
  explanation: string;
  difficulty: QuizQuestionDifficulty;
  createdAt?: string;
}

export interface QuizDTO {
  id: string;
  topicId: string;
  title: string;
  description?: string;
  questions?: QuizQuestionDTO[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StudyTodoDTO {
  id: string;
  topicId?: string;
  title: string;
  category: DomainCategory;
  priority: TodoPriority;
  completed: boolean;
  dueDate: string;
  createdAt?: string;
}

// Ingestion Pipeline Types (BAC-1 / BAC-2)
export type IngestPipelineStep =
  | 'fetch_url'
  | 'clean_content'
  | 'extract_topics'
  | 'generate_content'
  | 'generate_quizzes'
  | 'review_content'
  | 'add_to_review_queue';

export interface IngestRequestOptions {
  timeoutMs?: number;
  existingDomains?: string[];
  maxTopics?: number;
  maxRefinementIterations?: number;
  skipCritic?: boolean;
}

export interface IngestRequestPayload {
  url: string;
  options?: IngestRequestOptions;
}

export interface FetchUrlResult {
  content: string;
  status: number;
  contentType?: string;
  contentLength: number;
  finalUrl?: string;
}

export interface CleanContentResult {
  cleanedContent: string;
  cleanedLength: number;
  title?: string;
  byline?: string;
  excerpt?: string;
}

export interface ExtractedTopic {
  name: string;
  category: DomainCategory;
  summary: string;
  prerequisites?: string[];
  isNewDomain?: boolean;
}

export interface ExtractTopicsOptions {
  llmClient?: any;
  existingDomains?: string[];
  maxTopics?: number;
  skipCritic?: boolean;
}

export interface ExtractTopicsResult {
  topics: ExtractedTopic[];
  suggestedNewDomains?: string[];
  validationReport?: {
    totalExtracted: number;
    totalApproved: number;
    rejectedTopics: Array<{ name: string; reason: string }>;
  };
}

// -----------------------------------------------------------------------------
// Note Generation Types
// -----------------------------------------------------------------------------
export interface GeneratedNote {
  title: string;
  topicName: string;
  content: string;
  keyFormulas?: string[];
  codeSnippetsCount?: number;
}

export interface GenerateContentOptions {
  llmClient?: any;
  maxRefinementIterations?: number;
  timeoutMs?: number;
}

export interface GenerateContentResult {
  notes: GeneratedNote[];
  auditReports?: NoteAuditReport[];
}

export interface NoteAuditReport {
  topicName: string;
  passed: boolean;
  coverageScore: number; // 0 to 100
  missingConcepts: string[];
  hallucinations: string[];
  syntaxErrors: string[];
  feedback: string;
  refinementIterations: number;
}

// -----------------------------------------------------------------------------
// Quiz Generation Types
// -----------------------------------------------------------------------------
export interface MCQPayload {
  options: Array<{ id: string; text: string }>;
  distractorExplanations?: Record<string, string>;
}

export interface TrueFalsePayload {
  statement: string;
  isTrue: boolean;
}

export interface MatchingPayload {
  pairs: Array<{ term: string; definition: string }>;
  distractorTerms?: string[];
}

export interface OrderingPayload {
  items: string[];
  correctOrder: number[];
  orderedSequence: string[];
}

export interface FlashcardPayload {
  front: string;
  back: string;
  memorizationReason: string;
}

export interface GeneratedQuizQuestion {
  type: QuizQuestionType;
  prompt: string;
  payload: MCQPayload | TrueFalsePayload | MatchingPayload | OrderingPayload | FlashcardPayload;
  correctAnswer: string;
  explanation: string;
  difficulty: QuizQuestionDifficulty;
  sourceAssertion?: string;
}

export interface GeneratedQuiz {
  topicName: string;
  title: string;
  description?: string;
  questions: GeneratedQuizQuestion[];
}

export interface GenerateQuizOptions {
  llmClient?: any;
  maxRefinementIterations?: number;
  timeoutMs?: number;
}

export interface GenerateQuizResult {
  quizzes: GeneratedQuiz[];
  auditReports?: QuizAuditReport[];
}

export interface QuizAuditReport {
  topicName: string;
  passed: boolean;
  coverageScore: number; // 0 to 100
  untestedSections: string[];
  flawedQuestions: Array<{ index: number; reason: string }>;
  feedback: string;
  refinementIterations: number;
}

// -----------------------------------------------------------------------------
// Overall Review & Queue Types
// -----------------------------------------------------------------------------
export interface ReviewContentResult {
  passed: boolean;
  overallScore: number;
  noteAudits: NoteAuditReport[];
  quizAudits: QuizAuditReport[];
  summary: string;
}

export interface AddToReviewQueueResult {
  queueId: string | null;
  status: 'queued' | 'bypassed';
}

// -----------------------------------------------------------------------------
// Graph Update & Intelligent Content Merge Types (BAC-27)
// -----------------------------------------------------------------------------
export type GraphUpdateType =
  | 'NOTE_UPDATE'
  | 'QUIZ_UPDATE'
  | 'EDGE_UPDATE'
  | 'TOPIC_UPDATE';

export type GraphUpdateStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export interface GraphUpdate {
  id: string; // UPDATE-UUID
  type: GraphUpdateType;
  status: GraphUpdateStatus;
  category: DomainCategory;
  targetId: string; // topicId, noteId, or quizId
  targetName: string; // Human-readable title
  title: string; // E.g., "Semantic Merge: Cassandra Storage Model"
  description: string; // Concise explanation of changes
  oldContent: string; // Empty string for first write, existing content for updates/merges
  newContent: string; // The resulting content
  sourceUrl?: string; // Source article/document URL
  createdAt: string;
  payload?: {
    topicId?: string;
    noteId?: string;
    quizId?: string;
    edge?: { fromId: string; toId: string; action: 'ADD' | 'REMOVE' };
    patch?: any;
    notePatch?: any;
  };
}

export interface MergeAuditReport {
  passed: boolean;
  preservationScore: number; // 0 - 100% (measure of original content retained)
  coverageScore: number; // 0 - 100% (measure of new material integrated)
  lostOriginalConcepts: string[]; // Critical: flags any dropped formulas, diagrams, or nuances
  omittedNewConcepts: string[]; // Flags any missed points from incoming source
  unresolvedDuplicates: string[]; // Flags any redundant paragraphs/explanations
  feedback: string;
  refinementIterations: number;
}

export interface MergeContentResult {
  mergedNote: GeneratedNote;
  auditReport: MergeAuditReport;
  updateType: 'NOTE_UPDATE';
}

export interface IngestPipelineResult {
  status: 'success' | 'error';
  url: string;
  executedSteps: IngestPipelineStep[];
  message: string;
  details: {
    finalUrl?: string;
    fetchStatus?: number;
    contentLength?: number;
    cleanedLength?: number;
    cleanedTitle?: string;
    extractedTopicsCount?: number;
    suggestedNewDomains?: string[];
    generatedNotesCount?: number;
    generatedQuizzesCount?: number;
    generatedQuestionsCount?: number;
    reviewPassed?: boolean;
    overallScore?: number;
    queueId?: string | null;
    noteAudits?: NoteAuditReport[];
    quizAudits?: QuizAuditReport[];
    mergeAudits?: MergeAuditReport[];
    graphUpdates?: GraphUpdate[];
  };
}

