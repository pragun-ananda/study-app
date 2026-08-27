import { TopicNode, NoteItem, StudyTodo, IngestPipelineResult, IngestRequestOptions } from '../types/telemetry';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let customBaseUrl: string | null = null;
let customFetchFn: typeof fetch | null = null;

export function setApiBaseUrl(url: string | null) {
  customBaseUrl = url;
}

export function setCustomFetch(fn: typeof fetch | null) {
  customFetchFn = fn;
}

export function getApiBaseUrl(): string {
  if (customBaseUrl !== null) return customBaseUrl;
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) {
    return (import.meta as any).env.VITE_API_BASE_URL;
  }
  if (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && (window as any).__VITE_API_BASE_URL__) {
    return (window as any).__VITE_API_BASE_URL__;
  }
  return '';
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const fetchFn = customFetchFn || (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);

  const res = await fetchFn(`${baseUrl}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    let errorData: any = null;
    try {
      errorData = await res.json();
      if (errorData?.error) {
        errorMsg = errorData.error;
      }
    } catch {
      // Body is not JSON
    }
    throw new ApiError(res.status, errorMsg, errorData);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

// ==========================================
// Topics API
// ==========================================

export async function fetchTopics(filters?: {
  category?: string;
  status?: string;
}): Promise<TopicNode[]> {
  const queryParams = new URLSearchParams();
  if (filters?.category) queryParams.set('category', filters.category);
  if (filters?.status) queryParams.set('status', filters.status);

  const qs = queryParams.toString();
  const endpoint = `/api/topics${qs ? `?${qs}` : ''}`;
  return request<TopicNode[]>(endpoint);
}

export async function fetchTopicById(id: string): Promise<TopicNode> {
  return request<TopicNode>(`/api/topics/${encodeURIComponent(id)}`);
}

export async function createTopic(topic: Partial<TopicNode> & { name: string; category?: TopicNode['category'] }): Promise<TopicNode> {
  return request<TopicNode>('/api/topics', {
    method: 'POST',
    body: JSON.stringify(topic)
  });
}

export async function updateTopic(id: string, updates: Partial<TopicNode>): Promise<TopicNode> {
  return request<TopicNode>(`/api/topics/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export async function deleteTopic(id: string): Promise<void> {
  return request<void>(`/api/topics/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

// ==========================================
// Prerequisites Graph API
// ==========================================

export async function addPrerequisite(topicId: string, prerequisiteId: string): Promise<{ topicId: string; prerequisiteId: string; message: string }> {
  return request<{ topicId: string; prerequisiteId: string; message: string }>(
    `/api/topics/${encodeURIComponent(topicId)}/prerequisites`,
    {
      method: 'POST',
      body: JSON.stringify({ prerequisiteId })
    }
  );
}

export async function removePrerequisite(topicId: string, prerequisiteId: string): Promise<void> {
  return request<void>(
    `/api/topics/${encodeURIComponent(topicId)}/prerequisites/${encodeURIComponent(prerequisiteId)}`,
    {
      method: 'DELETE'
    }
  );
}

// ==========================================
// Study Notes API
// ==========================================

export async function fetchNotesForTopic(topicId: string): Promise<NoteItem[]> {
  return request<NoteItem[]>(`/api/topics/${encodeURIComponent(topicId)}/notes`);
}

export async function createNoteForTopic(
  topicId: string,
  note: Omit<NoteItem, 'id'>
): Promise<NoteItem> {
  return request<NoteItem>(`/api/topics/${encodeURIComponent(topicId)}/notes`, {
    method: 'POST',
    body: JSON.stringify(note)
  });
}

export async function updateNote(id: string, note: Partial<NoteItem>): Promise<NoteItem> {
  return request<NoteItem>(`/api/notes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(note)
  });
}

export async function deleteNote(id: string): Promise<void> {
  return request<void>(`/api/notes/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

// ==========================================
// Study Todos API
// ==========================================

export async function fetchTodos(filters?: {
  completed?: boolean;
  category?: string;
  priority?: string;
}): Promise<StudyTodo[]> {
  const queryParams = new URLSearchParams();
  if (filters?.completed !== undefined) queryParams.set('completed', String(filters.completed));
  if (filters?.category) queryParams.set('category', filters.category);
  if (filters?.priority) queryParams.set('priority', filters.priority);

  const qs = queryParams.toString();
  const endpoint = `/api/todos${qs ? `?${qs}` : ''}`;
  return request<StudyTodo[]>(endpoint);
}

export async function fetchTodoById(id: string): Promise<StudyTodo> {
  return request<StudyTodo>(`/api/todos/${encodeURIComponent(id)}`);
}

export async function createTodo(todo: Omit<StudyTodo, 'id'>): Promise<StudyTodo> {
  return request<StudyTodo>('/api/todos', {
    method: 'POST',
    body: JSON.stringify(todo)
  });
}

export async function updateTodo(id: string, updates: Partial<StudyTodo>): Promise<StudyTodo> {
  return request<StudyTodo>(`/api/todos/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export async function deleteTodo(id: string): Promise<void> {
  return request<void>(`/api/todos/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

// ==========================================
// Ingestion Pipeline API (BAC-1 / BAC-2)
// ==========================================

export async function ingestFromUrl(
  url: string,
  options?: IngestRequestOptions
): Promise<IngestPipelineResult> {
  return request<IngestPipelineResult>('/api/ingest', {
    method: 'POST',
    body: JSON.stringify({ url, options })
  });
}

