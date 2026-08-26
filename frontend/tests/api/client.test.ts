import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ApiError,
  setApiBaseUrl,
  getApiBaseUrl,
  setCustomFetch,
  fetchTopics,
  fetchTopicById,
  createTopic,
  updateTopic,
  deleteTopic,
  addPrerequisite,
  removePrerequisite,
  fetchNotesForTopic,
  createNoteForTopic,
  updateNote,
  deleteNote,
  fetchTodos,
  fetchTodoById,
  createTodo,
  updateTodo,
  deleteTodo
} from '../../src/api/client';

describe('Frontend API Client (src/api/client.ts)', () => {
  beforeEach(() => {
    setApiBaseUrl(null);
    setCustomFetch(null);
  });

  describe('Configuration & Base URL Resolution', () => {
    it('sets and retrieves custom base URL', () => {
      setApiBaseUrl('https://api.example.com');
      expect(getApiBaseUrl()).toBe('https://api.example.com');

      setApiBaseUrl(null);
      expect(getApiBaseUrl()).toBe('');
    });

    it('instantiates ApiError with status and custom data', () => {
      const err = new ApiError(404, 'Not Found', { detail: 'Topic 999 not found' });
      expect(err.status).toBe(404);
      expect(err.message).toBe('Not Found');
      expect(err.name).toBe('ApiError');
      expect(err.data).toEqual({ detail: 'Topic 999 not found' });
    });
  });

  describe('HTTP Error Handling & Responses', () => {
    it('throws ApiError on non-ok response with JSON error message', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid topic coordinates' })
      });
      setCustomFetch(mockFetch as any);

      await expect(createTopic({ name: 'Bad Topic' })).rejects.toThrow('Invalid topic coordinates');
    });

    it('throws ApiError on non-ok response when body is not JSON', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: async () => {
          throw new Error('Not JSON');
        }
      });
      setCustomFetch(mockFetch as any);

      await expect(fetchTopics()).rejects.toThrow('HTTP Error 502: Bad Gateway');
    });

    it('handles 204 No Content responses cleanly', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        statusText: 'No Content'
      });
      setCustomFetch(mockFetch as any);

      const res = await deleteTopic('TOPIC-001');
      expect(res).toBeUndefined();
    });
  });

  describe('Topics API Endpoints', () => {
    it('constructs query parameters for fetchTopics', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => []
      });
      setCustomFetch(mockFetch as any);

      await fetchTopics({ category: 'AI & ML', status: 'MASTERED' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/topics?category=AI+%26+ML&status=MASTERED'),
        expect.any(Object)
      );
    });

    it('calls fetchTopicById with encoded ID', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'TOPIC-001', name: 'Backprop' })
      });
      setCustomFetch(mockFetch as any);

      const topic = await fetchTopicById('TOPIC-001');
      expect(topic.name).toBe('Backprop');
      expect(mockFetch).toHaveBeenCalledWith('/api/topics/TOPIC-001', expect.any(Object));
    });

    it('calls updateTopic with PATCH method and payload', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'TOPIC-001', mastery: 90 })
      });
      setCustomFetch(mockFetch as any);

      await updateTopic('TOPIC-001', { mastery: 90 });
      expect(mockFetch).toHaveBeenCalledWith('/api/topics/TOPIC-001', {
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
        body: JSON.stringify({ mastery: 90 })
      });
    });
  });

  describe('Prerequisites Graph API Endpoints', () => {
    it('calls addPrerequisite and removePrerequisite with correct endpoints', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ topicId: 'TOPIC-002', prerequisiteId: 'TOPIC-001', message: 'Added' })
      });
      setCustomFetch(mockFetch as any);

      await addPrerequisite('TOPIC-002', 'TOPIC-001');
      expect(mockFetch).toHaveBeenCalledWith('/api/topics/TOPIC-002/prerequisites', {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({ prerequisiteId: 'TOPIC-001' })
      });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });
      await removePrerequisite('TOPIC-002', 'TOPIC-001');
      expect(mockFetch).toHaveBeenCalledWith('/api/topics/TOPIC-002/prerequisites/TOPIC-001', {
        headers: { 'Content-Type': 'application/json' },
        method: 'DELETE'
      });
    });
  });

  describe('Notes API Endpoints', () => {
    it('calls fetchNotesForTopic, createNoteForTopic, updateNote, and deleteNote', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [{ id: 'NOTE-001', title: 'Note 1' }]
      });
      setCustomFetch(mockFetch as any);

      const notes = await fetchNotesForTopic('TOPIC-001');
      expect(notes.length).toBe(1);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 'NOTE-002', title: 'New Note' })
      });
      const created = await createNoteForTopic('TOPIC-001', { title: 'New Note', content: 'C' });
      expect(created.id).toBe('NOTE-002');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'NOTE-002', title: 'Updated' })
      });
      const updated = await updateNote('NOTE-002', { title: 'Updated' });
      expect(updated.title).toBe('Updated');

      mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });
      await deleteNote('NOTE-002');
      expect(mockFetch).toHaveBeenCalledWith('/api/notes/NOTE-002', {
        headers: { 'Content-Type': 'application/json' },
        method: 'DELETE'
      });
    });
  });

  describe('Todos API Endpoints', () => {
    it('calls fetchTodos with filters, fetchTodoById, createTodo, updateTodo, and deleteTodo', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [{ id: 'TODO-001', title: 'Task' }]
      });
      setCustomFetch(mockFetch as any);

      const todos = await fetchTodos({ completed: true, category: 'CS', priority: 'HIGH' });
      expect(todos.length).toBe(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/todos?completed=true&category=CS&priority=HIGH'),
        expect.any(Object)
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'TODO-001', title: 'Task 1' })
      });
      const single = await fetchTodoById('TODO-001');
      expect(single.id).toBe('TODO-001');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 'TODO-002', title: 'Created' })
      });
      const created = await createTodo({ title: 'Created', category: 'CS', priority: 'LOW', dueDate: 'Today', completed: false });
      expect(created.id).toBe('TODO-002');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'TODO-002', completed: true })
      });
      const updated = await updateTodo('TODO-002', { completed: true });
      expect(updated.completed).toBe(true);

      mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });
      await deleteTodo('TODO-002');
      expect(mockFetch).toHaveBeenCalledWith('/api/todos/TODO-002', {
        headers: { 'Content-Type': 'application/json' },
        method: 'DELETE'
      });
    });
  });

  describe('Ingestion Pipeline API Endpoints (BAC-1 / BAC-2)', () => {
    it('calls ingestFromUrl with payload and options', async () => {
      const mockResponse = {
        status: 'success',
        url: 'https://example.com/article',
        executedSteps: ['fetch_url', 'clean_content', 'extract_topics', 'generate_content', 'review_content', 'add_to_review_queue'],
        message: 'Ingestion pipeline executed successfully',
        details: { fetchStatus: 200, contentLength: 1024 }
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });
      setCustomFetch(mockFetch as any);

      const result = await (await import('../../src/api/client')).ingestFromUrl('https://example.com/article', { timeoutMs: 3000 });
      expect(result.status).toBe('success');
      expect(result.executedSteps.length).toBe(6);
      expect(mockFetch).toHaveBeenCalledWith('/api/ingest', {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com/article', options: { timeoutMs: 3000 } })
      });
    });
  });
});
