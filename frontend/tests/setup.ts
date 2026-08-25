import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';
import { useStore, INITIAL_TOPICS } from '../src/store/useStore';
import { INITIAL_TODOS } from '../src/data/test';
import { setCustomFetch } from '../src/api/client';

// 1. Polyfill ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// 2. Polyfill window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// 3. Polyfill navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue('')
  }
});

// 4. Polyfill HTMLCanvasElement.getContext for 2D/WebGL
HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
  if (contextId === '2d' || contextId === 'webgl' || contextId === 'webgl2') {
    return {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => []),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      // WebGL minimal stubs
      getExtension: vi.fn(),
      getParameter: vi.fn(() => 0),
      createTexture: vi.fn(),
      bindTexture: vi.fn(),
      texParameteri: vi.fn()
    };
  }
  return null;
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// 5. Lightweight mock fetch handler for unit testing
const mockFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.toString();
  const method = init?.method?.toUpperCase() || 'GET';
  const body = init?.body ? JSON.parse(init.body as string) : {};

  // GET /api/topics
  if (url.startsWith('/api/topics') && method === 'GET') {
    return new Response(JSON.stringify(useStore.getState().topicNodes), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /api/topics
  if (url === '/api/topics' && method === 'POST') {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newTopic = {
      ...body,
      id: body.id || `TOPIC-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`,
      prerequisites: body.prerequisites || [],
      unlocks: body.unlocks || [],
      notes: body.notes || []
    };
    return new Response(JSON.stringify(newTopic), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // PATCH /api/topics/:id
  if (url.match(/^\/api\/topics\/[^/]+$/) && method === 'PATCH') {
    const id = url.split('/').pop()!;
    const topic = useStore.getState().topicNodes.find((t) => t.id === id) || { id };
    const updated = { ...topic, ...body };
    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /api/topics/:topicId/notes
  if (url.match(/\/api\/topics\/[^/]+\/notes$/) && method === 'POST') {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newNote = {
      ...body,
      id: body.id || `NOTE-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`,
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: body.updatedAt || new Date().toISOString()
    };
    return new Response(JSON.stringify(newNote), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // PATCH /api/notes/:id
  if (url.match(/^\/api\/notes\/[^/]+$/) && method === 'PATCH') {
    const id = url.split('/').pop()!;
    const updated = { ...body, id, updatedAt: new Date().toISOString() };
    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // DELETE /api/notes/:id
  if (url.match(/^\/api\/notes\/[^/]+$/) && method === 'DELETE') {
    return new Response(null, { status: 204 });
  }

  // GET /api/todos
  if (url.startsWith('/api/todos') && method === 'GET') {
    return new Response(JSON.stringify(useStore.getState().todos), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /api/todos
  if (url === '/api/todos' && method === 'POST') {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newTodo = {
      ...body,
      id: body.id || `TODO-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`,
      completed: Boolean(body.completed)
    };
    return new Response(JSON.stringify(newTodo), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // PATCH /api/todos/:id
  if (url.match(/^\/api\/todos\/[^/]+$/) && method === 'PATCH') {
    const id = url.split('/').pop()!;
    const todo = useStore.getState().todos.find((t) => t.id === id) || { id };
    const updated = { ...todo, ...body };
    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // DELETE /api/todos/:id
  if (url.match(/^\/api\/todos\/[^/]+$/) && method === 'DELETE') {
    return new Response(null, { status: 204 });
  }

  // POST /api/topics/:id/prerequisites
  if (url.match(/\/api\/topics\/[^/]+\/prerequisites$/) && method === 'POST') {
    return new Response(JSON.stringify({ message: 'Added' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // DELETE /api/topics/:id/prerequisites/:prereqId
  if (url.match(/\/api\/topics\/[^/]+\/prerequisites\/[^/]+$/) && method === 'DELETE') {
    return new Response(null, { status: 204 });
  }

  return new Response(JSON.stringify({}), { status: 200 });
};

export const nativeFetch = globalThis.fetch;
(globalThis as any).__nativeFetch__ = nativeFetch;

window.fetch = mockFetch;
setCustomFetch(mockFetch);

// 6. Reset Zustand Store cleanly before each test run
beforeEach(() => {
  setCustomFetch(mockFetch);
  useStore.getState().resetState();
  useStore.getState().hydrate(INITIAL_TOPICS, INITIAL_TODOS);
  vi.clearAllMocks();
});
