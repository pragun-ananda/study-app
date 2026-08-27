// Category Enums matching database schema CHECK constraints
export type DomainCategory =
  | 'AI & ML'
  | 'CS'
  | 'SYSTEMS'
  | 'MATH'
  | 'PHYSICS'
  | 'CYBERSECURITY'
  | 'ARCH';

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
  | 'review_content'
  | 'add_to_review_queue';

export interface IngestRequestOptions {
  timeoutMs?: number;
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
}

export interface ExtractTopicsResult {
  topics: Array<{ name: string; category?: DomainCategory; summary?: string }>;
}

export interface GenerateContentResult {
  notes: Array<{ title: string; content?: string; topicName?: string }>;
}

export interface ReviewContentResult {
  passed: boolean;
  notes?: string;
}

export interface AddToReviewQueueResult {
  queueId: string | null;
  status: 'queued' | 'bypassed';
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
    extractedTopicsCount?: number;
    generatedNotesCount?: number;
    reviewPassed?: boolean;
    queueId?: string | null;
  };
}

