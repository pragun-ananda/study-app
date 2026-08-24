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
