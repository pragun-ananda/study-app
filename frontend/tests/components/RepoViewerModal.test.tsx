import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RepoViewerModal } from '../../src/components/code_repo/RepoViewerModal';
import { useRepoStore } from '../../src/store/useRepoStore';

describe('RepoViewerModal', () => {
  beforeEach(() => {
    useRepoStore.getState().resetState();
    vi.clearAllMocks();
  });

  it('renders nothing when isRepoViewerOpen is false', () => {
    const { container } = render(<RepoViewerModal />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal dialog when isRepoViewerOpen is true', async () => {
    await waitFor(() => useRepoStore.getState().openRepoViewer('REPO-1'));

    render(<RepoViewerModal />);

    expect(screen.getByText('Code Repository Studio')).toBeInTheDocument();
    expect(screen.getByTestId('viewmode-tree-code')).toBeInTheDocument();
    expect(screen.getByTestId('viewmode-full-code')).toBeInTheDocument();
    expect(screen.getByTestId('viewmode-split-notes')).toBeInTheDocument();
  });

  it('switches view mode when layout buttons are clicked', async () => {
    await waitFor(() => useRepoStore.getState().openRepoViewer('REPO-1'));

    render(<RepoViewerModal />);

    const fullCodeBtn = screen.getByTestId('viewmode-full-code');
    fireEvent.click(fullCodeBtn);
    expect(useRepoStore.getState().viewMode).toBe('FULL_CODE');

    const splitBtn = screen.getByTestId('viewmode-split-notes');
    fireEvent.click(splitBtn);
    expect(useRepoStore.getState().viewMode).toBe('SPLIT_ANNOTATIONS');
  });

  it('closes modal when close button is clicked', async () => {
    await waitFor(() => useRepoStore.getState().openRepoViewer('REPO-1'));

    render(<RepoViewerModal />);

    const closeBtn = screen.getByTestId('close-repo-viewer-button');
    fireEvent.click(closeBtn);

    expect(useRepoStore.getState().isRepoViewerOpen).toBe(false);
  });
});
