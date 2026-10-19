import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useRepoStore, MAX_OPEN_FILES_BUFFER } from '../../src/store/useRepoStore';
import * as api from '../../src/api/client';

describe('useRepoStore', () => {
  beforeEach(() => {
    useRepoStore.getState().resetState();
    vi.clearAllMocks();
  });

  it('initializes with default empty state and TREE_CODE view mode', () => {
    const state = useRepoStore.getState();
    expect(state.repositories).toEqual([]);
    expect(state.activeRepoId).toBeNull();
    expect(state.activeRepo).toBeNull();
    expect(state.treeManifest).toBeNull();
    expect(state.openFiles).toEqual([]);
    expect(state.activeFilePath).toBeNull();
    expect(state.fileBlobs).toEqual({});
    expect(state.annotations).toEqual([]);
    expect(state.isRepoViewerOpen).toBe(false);
    expect(state.viewMode).toBe('TREE_CODE');
  });

  it('fetchRepositories fetches and populates repositories array', async () => {
    await useRepoStore.getState().fetchRepositories();
    const state = useRepoStore.getState();
    expect(state.repositories.length).toBeGreaterThan(0);
    expect(state.repositories[0].id).toBe('REPO-1');
    expect(state.repositories[0].name).toBe('linux');
    expect(state.isLoading).toBe(false);
  });

  it('importRepo imports repository, updates list, and selects it', async () => {
    const newRepo = await useRepoStore.getState().importRepo({
      url: 'https://github.com/facebook/react'
    });

    expect(newRepo.name).toBe('react');
    const state = useRepoStore.getState();
    expect(state.repositories[0].id).toBe(newRepo.id);
    expect(state.activeRepoId).toBe(newRepo.id);
    expect(state.isImportModalOpen).toBe(false);
  });

  it('selectRepository loads manifest tree and automatically opens README or first file', async () => {
    await useRepoStore.getState().fetchRepositories();
    await useRepoStore.getState().selectRepository('REPO-1');

    const state = useRepoStore.getState();
    expect(state.activeRepoId).toBe('REPO-1');
    expect(state.treeManifest).not.toBeNull();
    expect(state.treeManifest?.repositoryId).toBe('REPO-1');
    expect(state.openFiles).toContain('README.md');
    expect(state.activeFilePath).toBe('README.md');
    expect(state.fileBlobs['README.md']).toBeDefined();
    expect(state.fileBlobs['README.md'].content).toContain('Linux Kernel');
  });

  it('enforces Mac mini max 3 open files ring buffer on openFile', async () => {
    await useRepoStore.getState().fetchRepositories();
    await useRepoStore.getState().selectRepository('REPO-1');

    const store = useRepoStore.getState();
    // Open 1st file
    await store.openFile('file1.ts');
    // Open 2nd file
    await store.openFile('file2.ts');
    // Open 3rd file
    await store.openFile('file3.ts');

    let current = useRepoStore.getState();
    expect(current.openFiles.length).toBe(MAX_OPEN_FILES_BUFFER);

    // Open 4th file -> must evict oldest file
    await current.openFile('file4.ts');
    current = useRepoStore.getState();

    expect(current.openFiles.length).toBe(MAX_OPEN_FILES_BUFFER);
    expect(current.openFiles).toContain('file4.ts');
    expect(current.activeFilePath).toBe('file4.ts');
  });

  it('closeFile removes file and switches active tab to previous open tab', async () => {
    const store = useRepoStore.getState();
    await store.fetchRepositories();
    await store.selectRepository('REPO-1');

    await useRepoStore.getState().openFile('file1.ts');
    await useRepoStore.getState().openFile('file2.ts');

    expect(useRepoStore.getState().openFiles).toContain('file2.ts');
    expect(useRepoStore.getState().activeFilePath).toBe('file2.ts');

    useRepoStore.getState().closeFile('file2.ts');

    const afterClose = useRepoStore.getState();
    expect(afterClose.openFiles).not.toContain('file2.ts');
    expect(afterClose.activeFilePath).toBe('file1.ts');
  });

  it('switches viewMode between TREE_CODE, FULL_CODE, and SPLIT_ANNOTATIONS', () => {
    useRepoStore.getState().setViewMode('FULL_CODE');
    expect(useRepoStore.getState().viewMode).toBe('FULL_CODE');

    useRepoStore.getState().setViewMode('SPLIT_ANNOTATIONS');
    expect(useRepoStore.getState().viewMode).toBe('SPLIT_ANNOTATIONS');

    useRepoStore.getState().setViewMode('TREE_CODE');
    expect(useRepoStore.getState().viewMode).toBe('TREE_CODE');
  });

  it('manages annotation active selection state', () => {
    useRepoStore.getState().setActiveAnnotationId('ANN-123');
    expect(useRepoStore.getState().activeAnnotationId).toBe('ANN-123');

    useRepoStore.getState().setActiveAnnotationId(null);
    expect(useRepoStore.getState().activeAnnotationId).toBeNull();
  });

  it('openRepoViewer and closeRepoViewer toggle isRepoViewerOpen modal flag', async () => {
    await useRepoStore.getState().openRepoViewer('REPO-1');
    expect(useRepoStore.getState().isRepoViewerOpen).toBe(true);

    useRepoStore.getState().closeRepoViewer();
    expect(useRepoStore.getState().isRepoViewerOpen).toBe(false);
  });
});
