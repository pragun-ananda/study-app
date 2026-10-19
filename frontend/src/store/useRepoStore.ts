import { create } from 'zustand';
import {
  RepositoryDTO,
  ImportRepositoryInput,
  RepoTreeManifest,
  CodeAnnotationDTO,
  CreateCodeAnnotationInput,
  UpdateCodeAnnotationInput
} from '../types/telemetry';
import * as api from '../api/client';

export type RepoViewMode = 'TREE_CODE' | 'FULL_CODE' | 'SPLIT_ANNOTATIONS';

// Mac mini memory guardrail: keep at most 3 active file tabs open simultaneously
export const MAX_OPEN_FILES_BUFFER = 3;

export interface FileBlobData {
  content: string;
  fileSizeBytes: number;
  encoding: string;
  fromCache: boolean;
  isTruncated: boolean;
}

export interface RepoState {
  repositories: RepositoryDTO[];
  activeRepoId: string | null;
  activeRepo: RepositoryDTO | null;
  treeManifest: RepoTreeManifest | null;
  openFiles: string[];
  activeFilePath: string | null;
  fileBlobs: Record<string, FileBlobData>;
  annotations: CodeAnnotationDTO[];
  activeAnnotationId: string | null;
  isRepoViewerOpen: boolean;
  isImportModalOpen: boolean;
  isLoading: boolean;
  isLoadingTree: boolean;
  isLoadingBlob: boolean;
  error: string | null;
  viewMode: RepoViewMode;

  // Actions
  fetchRepositories: () => Promise<void>;
  importRepo: (input: ImportRepositoryInput) => Promise<RepositoryDTO>;
  selectRepository: (id: string) => Promise<void>;
  openRepoViewer: (repoId?: string) => Promise<void>;
  closeRepoViewer: () => void;
  setIsImportModalOpen: (open: boolean) => void;
  setViewMode: (mode: RepoViewMode) => void;
  openFile: (filePath: string) => Promise<void>;
  closeFile: (filePath: string) => void;
  setActiveFile: (filePath: string) => void;
  fetchAnnotations: (repoId: string, filePath?: string) => Promise<void>;
  createAnnotation: (input: CreateCodeAnnotationInput) => Promise<CodeAnnotationDTO>;
  updateAnnotation: (id: string, input: UpdateCodeAnnotationInput) => Promise<CodeAnnotationDTO>;
  deleteAnnotation: (id: string) => Promise<void>;
  setActiveAnnotationId: (id: string | null) => void;
  resetState: () => void;
}

export const useRepoStore = create<RepoState>((set, get) => ({
  repositories: [],
  activeRepoId: null,
  activeRepo: null,
  treeManifest: null,
  openFiles: [],
  activeFilePath: null,
  fileBlobs: {},
  annotations: [],
  activeAnnotationId: null,
  isRepoViewerOpen: false,
  isImportModalOpen: false,
  isLoading: false,
  isLoadingTree: false,
  isLoadingBlob: false,
  error: null,
  viewMode: 'TREE_CODE',

  fetchRepositories: async () => {
    try {
      set({ isLoading: true, error: null });
      const repos = await api.getRepositories();
      set({ repositories: repos, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch repositories', isLoading: false });
    }
  },

  importRepo: async (input: ImportRepositoryInput) => {
    try {
      set({ isLoading: true, error: null });
      const repo = await api.importRepository(input);
      set((state) => ({
        repositories: [repo, ...state.repositories.filter((r) => r.id !== repo.id)],
        activeRepoId: repo.id,
        activeRepo: repo,
        isImportModalOpen: false,
        isLoading: false
      }));
      // Automatically load tree for imported repo
      await get().selectRepository(repo.id);
      return repo;
    } catch (err: any) {
      set({ error: err.message || 'Failed to import repository', isLoading: false });
      throw err;
    }
  },

  selectRepository: async (id: string) => {
    try {
      set({ activeRepoId: id, isLoadingTree: true, error: null });
      const repos = get().repositories;
      let repo = repos.find((r) => r.id === id) || null;
      if (!repo) {
        repo = await api.getRepository(id);
      }

      set({ activeRepo: repo });

      // Fetch lazy tree
      const manifest = await api.getRepoTree(id);
      set({
        treeManifest: manifest,
        isLoadingTree: false,
        openFiles: [],
        activeFilePath: null,
        fileBlobs: {},
        annotations: []
      });

      // Load repository annotations
      await get().fetchAnnotations(id);

      // Automatically open README.md or first available root file if present
      const firstFile = manifest.tree.find((n) => n.type === 'file');
      const readme = manifest.tree.find((n) => n.type === 'file' && n.name.toLowerCase().startsWith('readme'));
      const targetFile = readme || firstFile;
      if (targetFile) {
        await get().openFile(targetFile.path);
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to load repository', isLoadingTree: false });
    }
  },

  openRepoViewer: async (repoId?: string) => {
    set({ isRepoViewerOpen: true });
    if (get().repositories.length === 0) {
      await get().fetchRepositories();
    }
    const targetId = repoId || get().activeRepoId || get().repositories[0]?.id;
    if (targetId) {
      await get().selectRepository(targetId);
    }
  },

  closeRepoViewer: () => {
    set({ isRepoViewerOpen: false });
  },

  setIsImportModalOpen: (open: boolean) => {
    set({ isImportModalOpen: open });
  },

  setViewMode: (mode: RepoViewMode) => {
    set({ viewMode: mode });
  },

  openFile: async (filePath: string) => {
    const { activeRepoId, openFiles, fileBlobs } = get();
    if (!activeRepoId) return;

    // Enforce Mac mini max 3 open files ring buffer
    let updatedOpenFiles = openFiles.includes(filePath)
      ? openFiles
      : [...openFiles, filePath];

    if (updatedOpenFiles.length > MAX_OPEN_FILES_BUFFER) {
      // Drop the oldest file not currently being selected
      const fileToEvict = updatedOpenFiles.find((f) => f !== filePath);
      if (fileToEvict) {
        updatedOpenFiles = updatedOpenFiles.filter((f) => f !== fileToEvict);
        // Clean up from local memory blob map if needed
        const updatedBlobs = { ...fileBlobs };
        delete updatedBlobs[fileToEvict];
        set({ fileBlobs: updatedBlobs });
      }
    }

    set({ openFiles: updatedOpenFiles, activeFilePath: filePath });

    // Fetch blob if not already in store
    if (!fileBlobs[filePath]) {
      try {
        set({ isLoadingBlob: true });
        const blob = await api.getRepoBlob(activeRepoId, filePath);
        set((state) => ({
          fileBlobs: {
            ...state.fileBlobs,
            [filePath]: blob
          },
          isLoadingBlob: false
        }));
      } catch (err: any) {
        set({ error: err.message || 'Failed to fetch file content', isLoadingBlob: false });
      }
    }

    // Refresh annotations for this file
    await get().fetchAnnotations(activeRepoId, filePath);
  },

  closeFile: (filePath: string) => {
    const { openFiles, activeFilePath, fileBlobs } = get();
    const updated = openFiles.filter((f) => f !== filePath);
    const updatedBlobs = { ...fileBlobs };
    delete updatedBlobs[filePath];

    let nextActive = activeFilePath;
    if (activeFilePath === filePath) {
      nextActive = updated.length > 0 ? updated[updated.length - 1] : null;
    }

    set({
      openFiles: updated,
      activeFilePath: nextActive,
      fileBlobs: updatedBlobs
    });
  },

  setActiveFile: (filePath: string) => {
    set({ activeFilePath: filePath });
    const { activeRepoId } = get();
    if (activeRepoId) {
      get().fetchAnnotations(activeRepoId, filePath);
    }
  },

  fetchAnnotations: async (repoId: string, filePath?: string) => {
    try {
      const annotations = await api.getRepoAnnotations(repoId, filePath);
      set({ annotations });
    } catch (err: any) {
      console.warn('[FETCH_ANNOTATIONS_ERROR]:', err);
    }
  },

  createAnnotation: async (input: CreateCodeAnnotationInput) => {
    const annotation = await api.createRepoAnnotation(input.repositoryId, input);
    set((state) => ({
      annotations: [...state.annotations, annotation],
      activeAnnotationId: annotation.id
    }));
    return annotation;
  },

  updateAnnotation: async (id: string, input: UpdateCodeAnnotationInput) => {
    const { activeRepoId } = get();
    if (!activeRepoId) throw new Error('No active repository');

    const updated = await api.updateRepoAnnotation(activeRepoId, id, input);
    set((state) => ({
      annotations: state.annotations.map((a) => (a.id === id ? updated : a))
    }));
    return updated;
  },

  deleteAnnotation: async (id: string) => {
    const { activeRepoId } = get();
    if (!activeRepoId) return;

    await api.deleteRepoAnnotation(activeRepoId, id);
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
      activeAnnotationId: state.activeAnnotationId === id ? null : state.activeAnnotationId
    }));
  },

  setActiveAnnotationId: (id: string | null) => {
    set({ activeAnnotationId: id });
  },

  resetState: () => {
    set({
      repositories: [],
      activeRepoId: null,
      activeRepo: null,
      treeManifest: null,
      openFiles: [],
      activeFilePath: null,
      fileBlobs: {},
      annotations: [],
      activeAnnotationId: null,
      isRepoViewerOpen: false,
      isImportModalOpen: false,
      isLoading: false,
      isLoadingTree: false,
      isLoadingBlob: false,
      error: null,
      viewMode: 'TREE_CODE'
    });
  }
}));
