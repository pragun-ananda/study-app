import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import DiffViewerModal from '../../src/components/hud/DiffViewerModal';
import { useStore } from '../../src/store/useStore';

describe('DiffViewerModal Component (FRO-11)', () => {
  beforeEach(() => {
    useStore.getState().resetState();
  });

  it('renders nothing when activeDiffUpdateId is null', () => {
    const { container } = render(<DiffViewerModal />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with diff lines, additions, and deletions when update is active', () => {
    useStore.getState().setActiveDiffUpdateId('UPDATE-001');
    render(<DiffViewerModal />);

    expect(screen.getByText('Backpropagation & Autograd Refinement')).toBeInTheDocument();
    expect(screen.getByText(/NOTE UPDATE/i)).toBeInTheDocument();
    expect(screen.getByText('DIFF VIEW')).toBeInTheDocument();
    expect(screen.getByText('RENDERED PREVIEW')).toBeInTheDocument();
    expect(screen.getByText('+ Additions')).toBeInTheDocument();
    expect(screen.getByText('- Deletions')).toBeInTheDocument();
  });

  it('switches between DIFF VIEW and RENDERED PREVIEW tabs', () => {
    useStore.getState().setActiveDiffUpdateId('UPDATE-001');
    render(<DiffViewerModal />);

    const previewBtn = screen.getByText('RENDERED PREVIEW');
    fireEvent.click(previewBtn);

    expect(screen.getByText(/Backpropagation & Automatic Differentiation/i)).toBeInTheDocument();

    const diffBtn = screen.getByText('DIFF VIEW');
    fireEvent.click(diffBtn);

    expect(screen.getByText('+ Additions')).toBeInTheDocument();
  });

  it('allows composing and saving an inline review comment on a line', () => {
    useStore.getState().setActiveDiffUpdateId('UPDATE-001');
    render(<DiffViewerModal />);

    // Click the first gutter "+" comment button
    const plusButtons = screen.getAllByTitle('Add comment to line');
    fireEvent.click(plusButtons[0]);

    const textarea = screen.getByPlaceholderText(/Add review feedback for this line/i);
    expect(textarea).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: 'New review feedback on line 1' } });

    const saveBtn = screen.getByText('Save Comment');
    fireEvent.click(saveBtn);

    expect(screen.getByText('New review feedback on line 1')).toBeInTheDocument();
  });

  it('allows deleting an existing inline comment', () => {
    useStore.getState().setActiveDiffUpdateId('UPDATE-001');
    render(<DiffViewerModal />);

    // UPDATE-001 has initial comment COMM-001
    expect(screen.getByText(/Verify matrix multiplication transpose/i)).toBeInTheDocument();

    const deleteBtn = screen.getByTitle('Delete comment');
    fireEvent.click(deleteBtn);

    expect(screen.queryByText(/Verify matrix multiplication transpose/i)).not.toBeInTheDocument();
  });

  it('clicking APPROVE & MERGE approves the update and closes the modal', () => {
    useStore.getState().setActiveDiffUpdateId('UPDATE-001');
    render(<DiffViewerModal />);

    const approveBtn = screen.getByText('APPROVE & MERGE');
    fireEvent.click(approveBtn);

    expect(useStore.getState().graphUpdates.find((u) => u.id === 'UPDATE-001')?.status).toBe('APPROVED');
    expect(useStore.getState().activeDiffUpdateId).toBeNull();
  });

  it('clicking REJECT rejects the update and closes the modal', () => {
    useStore.getState().setActiveDiffUpdateId('UPDATE-001');
    render(<DiffViewerModal />);

    const rejectBtn = screen.getByText('REJECT');
    fireEvent.click(rejectBtn);

    expect(useStore.getState().graphUpdates.find((u) => u.id === 'UPDATE-001')?.status).toBe('REJECTED');
    expect(useStore.getState().activeDiffUpdateId).toBeNull();
  });

  it('clicking REQUEST CHANGES marks update as CHANGES_REQUESTED and closes modal', () => {
    useStore.getState().setActiveDiffUpdateId('UPDATE-001');
    render(<DiffViewerModal />);

    const requestChangesBtn = screen.getByText(/REQUEST CHANGES/i);
    fireEvent.click(requestChangesBtn);

    expect(useStore.getState().graphUpdates.find((u) => u.id === 'UPDATE-001')?.status).toBe('CHANGES_REQUESTED');
    expect(useStore.getState().activeDiffUpdateId).toBeNull();
  });

  it('closes modal on close button click', () => {
    useStore.getState().setActiveDiffUpdateId('UPDATE-001');
    render(<DiffViewerModal />);

    const closeBtn = screen.getByTitle('Close (ESC)');
    fireEvent.click(closeBtn);
    expect(useStore.getState().activeDiffUpdateId).toBeNull();
  });

  it('closes modal on Escape key press', () => {
    useStore.getState().setActiveDiffUpdateId('UPDATE-001');
    render(<DiffViewerModal />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useStore.getState().activeDiffUpdateId).toBeNull();
  });
});
