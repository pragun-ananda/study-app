import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';
import { useStore, INITIAL_TOPICS } from '../src/store/useStore';
import { useRepoStore } from '../src/store/useRepoStore';
import { INITIAL_TODOS } from '../src/data/test';
import { setCustomFetch } from '../src/api/client';

// 1. Polyfill ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
window.HTMLElement.prototype.scrollIntoView = vi.fn();

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

// 3. Polyfill navigator.clipboard and localStorage
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue('')
  }
});

const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = String(value);
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(localStorageStore)) {
      delete localStorageStore[key];
    }
  }),
  get length() {
    return Object.keys(localStorageStore).length;
  },
  key: vi.fn((idx: number) => Object.keys(localStorageStore)[idx] ?? null)
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
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

  // DELETE /api/topics/:id
  if (url.match(/^\/api\/topics\/[^/]+$/) && method === 'DELETE') {
    return new Response(null, { status: 204 });
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

  // GET /api/problems/:id/follow-ups/responses
  if (url.match(/\/api\/problems\/[^/]+\/follow-ups\/responses$/) && method === 'GET') {
    const parts = url.split('/');
    const problemId = parts[3];
    const responses = (useStore.getState().followUpResponses || {})[problemId] || [];
    return new Response(JSON.stringify(responses), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // GET /api/problems/:id/follow-ups
  if (url.match(/\/api\/problems\/[^/]+\/follow-ups$/) && method === 'GET') {
    const followUps = useStore.getState().activeProblem?.followUps || [];
    return new Response(JSON.stringify(followUps), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /api/problems/:id/follow-ups/:followUpId/response
  if (url.match(/\/api\/problems\/[^/]+\/follow-ups\/[^/]+\/response$/) && method === 'POST') {
    const parts = url.split('/');
    const problemId = parts[3];
    const followUpId = parts[5];
    const responseDto = {
      id: `RESP-${Date.now()}`,
      problemId,
      followUpId,
      responseText: body.responseText || '',
      diagramData: body.diagramData || null,
      score: body.score || null,
      feedback: body.feedback || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return new Response(JSON.stringify(responseDto), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /api/problems/:id/follow-ups/:followUpId/grade
  if (url.match(/\/api\/problems\/[^/]+\/follow-ups\/[^/]+\/grade$/) && method === 'POST') {
    const parts = url.split('/');
    const problemId = parts[3];
    const followUpId = parts[5];
    const evaluation = {
      score: 88,
      rubricScores: {
        stream_partitioning: { score: 26, maxWeight: 30, feedback: 'Strong partition key choice' },
        stateful_sliding_windows: { score: 35, maxWeight: 40, feedback: 'Flink stateful windows well specified' },
        fault_tolerance_ha: { score: 27, maxWeight: 30, feedback: 'RocksDB checkpoint replicas adequate' }
      },
      scalabilityAssessment: 'The architecture proposal demonstrates sound horizontal scalability across compute and state storage tiers.',
      singlePointsOfFailure: [
        'Single primary Kafka broker controller without Raft quorum failover',
        'Direct synchronous downstream worker calls without circuit breaker'
      ],
      tradeOffCritique: 'Favors eventual consistency and low write latency over strict linearizability.',
      actionableImprovements: [
        'Implement client-side consistent hashing to prevent partition skew',
        'Add distributed tracing headers (OpenTelemetry) across the event stream pipeline'
      ]
    };
    const savedResponse = {
      id: `RESP-${Date.now()}`,
      problemId,
      followUpId,
      responseText: body.responseText || '',
      diagramData: body.diagramData || null,
      score: evaluation.score,
      feedback: JSON.stringify(evaluation),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return new Response(JSON.stringify({ evaluation, savedResponse }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /api/problems/grade-system-design
  if (url === '/api/problems/grade-system-design' && method === 'POST') {
    const evaluation = {
      score: 85,
      rubricScores: {
        architecture: { score: 42, maxWeight: 50, feedback: 'Clean separation of concerns' },
        scalability: { score: 43, maxWeight: 50, feedback: 'Horizontal scaling verified' }
      },
      scalabilityAssessment: 'Architecture supports horizontal scaling.',
      singlePointsOfFailure: ['Single primary database instance'],
      tradeOffCritique: 'Asynchronous replication prioritizes availability.',
      actionableImprovements: ['Add multi-AZ database read replicas']
    };
    return new Response(JSON.stringify({ evaluation, savedResponse: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // GET /api/repositories
  if (url === '/api/repositories' && method === 'GET') {
    return new Response(
      JSON.stringify([
        {
          id: 'REPO-1',
          owner: 'torvalds',
          name: 'linux',
          fullName: 'torvalds/linux',
          remoteUrl: 'https://github.com/torvalds/linux',
          defaultBranch: 'master',
          activeCommitSha: 'abc1234',
          isPublic: true,
          description: 'Linux kernel source tree',
          language: 'C',
          starsCount: 170000,
          forksCount: 50000,
          storageBudgetBytes: 104857600,
          cachedBytes: 1024,
          cachedBlobsCount: 1,
          annotationsCount: 2,
          createdAt: '2026-10-19T00:00:00Z',
          updatedAt: '2026-10-19T00:00:00Z'
        }
      ]),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // POST /api/repositories/import or /api/repositories
  if ((url === '/api/repositories/import' || url === '/api/repositories') && method === 'POST') {
    return new Response(
      JSON.stringify({
        id: `REPO-${Date.now()}`,
        owner: body.url?.split('/')[3] || 'facebook',
        name: body.url?.split('/')[4] || 'react',
        fullName: 'facebook/react',
        remoteUrl: body.url || 'https://github.com/facebook/react',
        defaultBranch: 'main',
        activeCommitSha: 'def5678',
        isPublic: true,
        description: 'React library',
        language: 'TypeScript',
        starsCount: 220000,
        forksCount: 45000,
        storageBudgetBytes: 104857600,
        cachedBytes: 0,
        cachedBlobsCount: 0,
        annotationsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // GET /api/repositories/:id/tree
  if (url.match(/\/api\/repositories\/[^/]+\/tree/) && method === 'GET') {
    return new Response(
      JSON.stringify({
        repositoryId: 'REPO-1',
        commitSha: 'abc1234',
        truncated: false,
        fileCount: 2,
        tree: [
          { path: 'README.md', name: 'README.md', type: 'file', size: 120 },
          {
            path: 'src',
            name: 'src',
            type: 'directory',
            children: [{ path: 'src/index.ts', name: 'index.ts', type: 'file', size: 450 }]
          }
        ]
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // GET /api/repositories/:id/blob
  if (url.match(/\/api\/repositories\/[^/]+\/blob/) && method === 'GET') {
    return new Response(
      JSON.stringify({
        content: '# Linux Kernel\n\nWelcome to Linux.',
        fileSizeBytes: 33,
        encoding: 'utf-8',
        fromCache: true,
        isTruncated: false
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // GET /api/repositories/:id/annotations
  if (url.match(/\/api\/repositories\/[^/]+\/annotations$/) && method === 'GET') {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /api/repositories/:id/annotations
  if (url.match(/\/api\/repositories\/[^/]+\/annotations$/) && method === 'POST') {
    return new Response(
      JSON.stringify({
        id: `ANN-${Date.now()}`,
        repositoryId: 'REPO-1',
        filePath: body.filePath,
        startLine: body.startLine,
        endLine: body.endLine,
        title: body.title,
        content: body.content,
        category: body.category || 'ARCHITECTURE',
        codeSnippet: body.codeSnippet || '',
        threadCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // GET /api/repositories/:id
  if (url.match(/\/api\/repositories\/[^/]+$/) && method === 'GET') {
    return new Response(
      JSON.stringify({
        id: 'REPO-1',
        owner: 'torvalds',
        name: 'linux',
        fullName: 'torvalds/linux',
        remoteUrl: 'https://github.com/torvalds/linux',
        defaultBranch: 'master',
        activeCommitSha: 'abc1234',
        isPublic: true,
        description: 'Linux kernel source tree',
        language: 'C',
        starsCount: 170000,
        forksCount: 50000,
        storageBudgetBytes: 104857600,
        cachedBytes: 1024,
        cachedBlobsCount: 1,
        annotationsCount: 2,
        createdAt: '2026-10-19T00:00:00Z',
        updatedAt: '2026-10-19T00:00:00Z'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(JSON.stringify({}), { status: 200 });
};

export const nativeFetch = globalThis.fetch;
(globalThis as any).__nativeFetch__ = nativeFetch;

window.fetch = mockFetch;
setCustomFetch(mockFetch);

// 6. Reset Zustand Store cleanly before each test run
beforeEach(() => {
  localStorageMock.clear();
  setCustomFetch(mockFetch);
  useStore.getState().resetState();
  useStore.getState().hydrate(INITIAL_TOPICS, INITIAL_TODOS);
  useRepoStore.getState().resetState();
  vi.clearAllMocks();
});

// 7. Mock @monaco-editor/react for jsdom unit testing
vi.mock('@monaco-editor/react', async () => {
  const React = await import('react');
  const registeredLanguages: Array<{ id: string }> = [];
  const mockEditor = (props: any) => {
    if (props.beforeMount) {
      try {
        props.beforeMount({
          languages: {
            getLanguages: () => registeredLanguages,
            register: ({ id }: { id: string }) => registeredLanguages.push({ id }),
            setMonarchTokensProvider: vi.fn()
          }
        });
      } catch {}
    }
    return React.createElement(
      'div',
      {
        'data-testid': 'monaco-editor-container',
        'data-language': props.language,
        'data-theme': props.theme
      },
      React.createElement('textarea', {
        'data-testid': 'monaco-editor-textarea',
        value: props.value,
        onChange: (e: any) => props.onChange?.(e.target.value),
        'aria-label': 'Code Editor'
      })
    );
  };

  return {
    __esModule: true,
    default: mockEditor,
    Editor: mockEditor,
    useMonaco: () => null,
    loader: { config: vi.fn(), init: vi.fn() }
  };
});

// 8. Mock @excalidraw/excalidraw for jsdom unit testing
vi.mock('@excalidraw/excalidraw', async () => {
  const React = await import('react');
  const mockApi = {
    updateScene: vi.fn(),
    resetScene: vi.fn(),
    getSceneElements: vi.fn(() => [
      { id: '1', type: 'rectangle', text: 'Load Balancer', isDeleted: false }
    ]),
    getAppState: vi.fn(() => ({ viewBackgroundColor: '#ffffff' })),
    getFiles: vi.fn(() => ({})),
    scrollToContent: vi.fn()
  };

  const MockExcalidraw = (props: any) => {
    React.useEffect(() => {
      if (props.excalidrawAPI) {
        props.excalidrawAPI(mockApi);
      }
    }, [props.excalidrawAPI]);

    return React.createElement(
      'div',
      {
        'data-testid': 'mock-excalidraw-container',
        className: 'excalidraw-mock'
      },
      React.createElement(
        'div',
        {
          'data-testid': 'mock-excalidraw-canvas',
          className: 'canvas-mock'
        },
        'Excalidraw Architecture Canvas'
      )
    );
  };

  return {
    __esModule: true,
    Excalidraw: MockExcalidraw,
    convertToExcalidrawElements: (elements: any[]) =>
      elements.map((el, i) => ({
        id: el.id || `mock-${i}`,
        type: el.type || 'rectangle',
        text: el.label?.text || el.text || '',
        x: el.x || 0,
        y: el.y || 0,
        width: el.width || 100,
        height: el.height || 60,
        isDeleted: false
      })),
    exportToBlob: vi.fn(),
    exportToSvg: vi.fn()
  };
});
