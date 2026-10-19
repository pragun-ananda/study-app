import {
  TopicNode,
  NoteItem,
  QuizItem,
  StudyTodo,
  IngestPipelineResult,
  IngestRequestOptions,
  ReviewQueueResponseDTO,
  GraphUpdate,
  LineReviewComment,
  ProblemItem,
  ProblemSubmission,
  SubmitProblemPayload,
  SystemDesignFollowUp,
  ProblemFollowUpResponseDTO,
  GradeFollowUpResponseResult,
  GradeSystemDesignPayload,
  RepositoryDTO,
  ImportRepositoryInput,
  RepoTreeManifest,
  CodeAnnotationDTO,
  CreateCodeAnnotationInput,
  UpdateCodeAnnotationInput,
  CodeAnnotationThreadDTO
} from '../types/telemetry';

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
// Quizzes API
// ==========================================

export async function fetchQuizzesForTopic(topicId: string): Promise<QuizItem[]> {
  return request<QuizItem[]>(`/api/topics/${encodeURIComponent(topicId)}/quizzes`);
}

export async function fetchQuizById(id: string): Promise<QuizItem> {
  return request<QuizItem>(`/api/quizzes/${encodeURIComponent(id)}`);
}

export async function createQuizForTopic(
  topicId: string,
  quiz: Omit<QuizItem, 'id'> & { id?: string }
): Promise<QuizItem> {
  return request<QuizItem>(`/api/topics/${encodeURIComponent(topicId)}/quizzes`, {
    method: 'POST',
    body: JSON.stringify(quiz)
  });
}

export async function updateQuiz(id: string, updates: Partial<QuizItem>): Promise<QuizItem> {
  return request<QuizItem>(`/api/quizzes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export async function deleteQuiz(id: string): Promise<void> {
  return request<void>(`/api/quizzes/${encodeURIComponent(id)}`, {
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

// ==========================================
// Review Queue API
// ==========================================

export async function fetchReviewQueue(filters?: { status?: string }): Promise<ReviewQueueResponseDTO> {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.set('status', filters.status);
  const qs = queryParams.toString();
  return request<ReviewQueueResponseDTO>(`/api/review-queue${qs ? `?${qs}` : ''}`);
}

export async function fetchUpdateById(updateId: string): Promise<{ update: GraphUpdate; queueItem: any }> {
  return request<{ update: GraphUpdate; queueItem: any }>(`/api/review-queue/updates/${encodeURIComponent(updateId)}`);
}

export async function approveQueueUpdate(updateId: string): Promise<{ success: boolean; update: GraphUpdate; queueId: string }> {
  return request<{ success: boolean; update: GraphUpdate; queueId: string }>(
    `/api/review-queue/updates/${encodeURIComponent(updateId)}/approve`,
    { method: 'POST' }
  );
}

export async function rejectQueueUpdate(updateId: string): Promise<{ success: boolean; update: GraphUpdate; queueId: string }> {
  return request<{ success: boolean; update: GraphUpdate; queueId: string }>(
    `/api/review-queue/updates/${encodeURIComponent(updateId)}/reject`,
    { method: 'POST' }
  );
}

export async function requestChangesOnUpdate(
  updateId: string,
  payload: { comments: LineReviewComment[]; generalFeedback?: string }
): Promise<{ success: boolean; update: GraphUpdate; auditReport: any; queueId: string }> {
  return request<{ success: boolean; update: GraphUpdate; auditReport: any; queueId: string }>(
    `/api/review-queue/updates/${encodeURIComponent(updateId)}/request-changes`,
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  );
}

export async function approveEntireQueueItem(queueId: string): Promise<{ success: boolean; queueItem: any }> {
  return request<{ success: boolean; queueItem: any }>(
    `/api/review-queue/items/${encodeURIComponent(queueId)}/approve`,
    { method: 'POST' }
  );
}

export async function rejectEntireQueueItem(queueId: string): Promise<{ success: boolean; queueItem: any }> {
  return request<{ success: boolean; queueItem: any }>(
    `/api/review-queue/items/${encodeURIComponent(queueId)}/reject`,
    { method: 'POST' }
  );
}

export interface FetchProblemsFilter {
  type?: string;
  difficulty?: string;
  domain?: string;
  company?: string;
  topicId?: string;
  search?: string;
}

export async function fetchProblems(filter?: FetchProblemsFilter): Promise<ProblemItem[]> {
  const queryParams = new URLSearchParams();
  if (filter?.type) queryParams.set('type', filter.type);
  if (filter?.difficulty) queryParams.set('difficulty', filter.difficulty);
  if (filter?.domain) queryParams.set('domain', filter.domain);
  if (filter?.company) queryParams.set('company', filter.company);
  if (filter?.topicId) queryParams.set('topicId', filter.topicId);
  if (filter?.search) queryParams.set('search', filter.search);
  const qs = queryParams.toString();
  return request<ProblemItem[]>(`/api/problems${qs ? `?${qs}` : ''}`);
}

export async function fetchProblemById(id: string): Promise<ProblemItem> {
  return request<ProblemItem>(`/api/problems/${encodeURIComponent(id)}`);
}

export async function updateProblem(id: string, payload: Partial<ProblemItem>): Promise<ProblemItem> {
  return request<ProblemItem>(`/api/problems/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function createProblem(payload: Partial<ProblemItem>): Promise<ProblemItem> {
  return request<ProblemItem>('/api/problems', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function deleteProblem(id: string): Promise<boolean> {
  await request<{ status?: string }>(`/api/problems/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  return true;
}

export async function submitProblemSolution(
  id: string,
  payload: SubmitProblemPayload
): Promise<ProblemSubmission> {
  return request<ProblemSubmission>(`/api/problems/${encodeURIComponent(id)}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function fetchProblemSubmissions(id: string): Promise<ProblemSubmission[]> {
  return request<ProblemSubmission[]>(`/api/problems/${encodeURIComponent(id)}/submissions`);
}

export async function fetchProblemFollowUps(id: string): Promise<SystemDesignFollowUp[]> {
  return request<SystemDesignFollowUp[]>(`/api/problems/${encodeURIComponent(id)}/follow-ups`);
}

export async function fetchProblemFollowUpResponses(id: string): Promise<ProblemFollowUpResponseDTO[]> {
  return request<ProblemFollowUpResponseDTO[]>(`/api/problems/${encodeURIComponent(id)}/follow-ups/responses`);
}

export async function saveProblemFollowUpResponse(
  id: string,
  followUpId: string,
  payload: { responseText: string; diagramData?: any; score?: number; feedback?: string }
): Promise<ProblemFollowUpResponseDTO> {
  return request<ProblemFollowUpResponseDTO>(
    `/api/problems/${encodeURIComponent(id)}/follow-ups/${encodeURIComponent(followUpId)}/response`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );
}

export async function gradeSystemDesignFollowUp(
  id: string,
  followUpId: string,
  payload: { responseText: string; diagramData?: any }
): Promise<GradeFollowUpResponseResult> {
  return request<GradeFollowUpResponseResult>(
    `/api/problems/${encodeURIComponent(id)}/follow-ups/${encodeURIComponent(followUpId)}/grade`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );
}

export async function gradeSystemDesignDirect(
  payload: GradeSystemDesignPayload
): Promise<{ evaluation: any; savedResponse?: any }> {
  return request<{ evaluation: any; savedResponse?: any }>('/api/problems/grade-system-design', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

// ==========================================
// Code Repository Documentation Engine API
// ==========================================

export async function importRepository(input: ImportRepositoryInput): Promise<RepositoryDTO> {
  return request<RepositoryDTO>('/api/repositories/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
}

export async function getRepositories(): Promise<RepositoryDTO[]> {
  return request<RepositoryDTO[]>('/api/repositories');
}

export async function getRepository(id: string): Promise<RepositoryDTO> {
  return request<RepositoryDTO>(`/api/repositories/${encodeURIComponent(id)}`);
}

export async function getRepoTree(id: string, sha?: string): Promise<RepoTreeManifest> {
  const qs = sha ? `?sha=${encodeURIComponent(sha)}` : '';
  return request<RepoTreeManifest>(`/api/repositories/${encodeURIComponent(id)}/tree${qs}`);
}

export async function getRepoBlob(
  id: string,
  path: string,
  sha?: string
): Promise<{
  content: string;
  fileSizeBytes: number;
  encoding: string;
  fromCache: boolean;
  isTruncated: boolean;
}> {
  const params = new URLSearchParams({ path });
  if (sha) params.set('sha', sha);
  return request<{
    content: string;
    fileSizeBytes: number;
    encoding: string;
    fromCache: boolean;
    isTruncated: boolean;
  }>(`/api/repositories/${encodeURIComponent(id)}/blob?${params.toString()}`);
}

export async function getRepoAnnotations(
  id: string,
  path?: string,
  sha?: string
): Promise<CodeAnnotationDTO[]> {
  const params = new URLSearchParams();
  if (path) params.set('path', path);
  if (sha) params.set('sha', sha);
  const qs = params.toString();
  return request<CodeAnnotationDTO[]>(`/api/repositories/${encodeURIComponent(id)}/annotations${qs ? `?${qs}` : ''}`);
}

export async function createRepoAnnotation(
  id: string,
  input: CreateCodeAnnotationInput
): Promise<CodeAnnotationDTO> {
  return request<CodeAnnotationDTO>(`/api/repositories/${encodeURIComponent(id)}/annotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
}

export async function updateRepoAnnotation(
  id: string,
  annId: string,
  input: UpdateCodeAnnotationInput
): Promise<CodeAnnotationDTO> {
  return request<CodeAnnotationDTO>(`/api/repositories/${encodeURIComponent(id)}/annotations/${encodeURIComponent(annId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
}

export async function deleteRepoAnnotation(
  id: string,
  annId: string
): Promise<{ success: boolean; id: string }> {
  return request<{ success: boolean; id: string }>(
    `/api/repositories/${encodeURIComponent(id)}/annotations/${encodeURIComponent(annId)}`,
    { method: 'DELETE' }
  );
}

export async function getAnnotationThreads(
  id: string,
  annId: string
): Promise<CodeAnnotationThreadDTO[]> {
  return request<CodeAnnotationThreadDTO[]>(
    `/api/repositories/${encodeURIComponent(id)}/annotations/${encodeURIComponent(annId)}/threads`
  );
}

export async function createAnnotationThreadMessage(
  id: string,
  annId: string,
  sender: 'USER' | 'SOL_AI' | 'SYSTEM',
  message: string,
  suggestedQuizzes?: any
): Promise<CodeAnnotationThreadDTO> {
  return request<CodeAnnotationThreadDTO>(
    `/api/repositories/${encodeURIComponent(id)}/annotations/${encodeURIComponent(annId)}/threads`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender, message, suggestedQuizzes })
    }
  );
}

export async function explainCode(
  id: string,
  input: {
    filePath: string;
    startLine: number;
    endLine: number;
    codeSnippet: string;
    language?: string;
    userNote?: string;
    surroundingContext?: string;
  }
): Promise<any> {
  return request<any>(`/api/repositories/${encodeURIComponent(id)}/explain-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
}

export async function explainAnnotation(
  id: string,
  annId: string
): Promise<CodeAnnotationDTO> {
  return request<CodeAnnotationDTO>(
    `/api/repositories/${encodeURIComponent(id)}/annotations/${encodeURIComponent(annId)}/explain`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

export async function getAnnotationsByTopic(
  topicId: string
): Promise<(CodeAnnotationDTO & { repoName?: string })[]> {
  return request<(CodeAnnotationDTO & { repoName?: string })[]>(
    `/api/repositories/annotations/by-topic/${encodeURIComponent(topicId)}`
  );
}

export async function exportAnnotationToQuiz(
  id: string,
  annId: string,
  topicId?: string
): Promise<any> {
  return request<any>(
    `/api/repositories/${encodeURIComponent(id)}/annotations/${encodeURIComponent(annId)}/export-quiz`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId })
    }
  );
}
