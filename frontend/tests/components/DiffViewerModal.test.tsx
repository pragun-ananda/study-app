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

  it('renders Mermaid diagram properly in RENDERED PREVIEW mode', async () => {
    useStore.setState({
      activeDiffUpdateId: 'UPDATE-MERMAID',
      graphUpdates: [
        {
          id: 'UPDATE-MERMAID',
          title: 'Graph Flow Proposal',
          description: 'Adds architectural Mermaid diagram',
          category: 'AI & ML',
          type: 'NOTE_UPDATE',
          status: 'PENDING',
          createdAt: '1m ago',
          targetId: 'TOPIC-001',
          targetName: 'Transformer Architecture',
          oldContent: '# Old Architecture Note',
          newContent: `# New Architecture Note

\`\`\`mermaid
flowchart TD
  A[Attention] --> B[FeedForward]
  B --> C[LayerNorm]
\`\`\`
`
        }
      ]
    });

    render(<DiffViewerModal />);

    // Switch to preview mode
    const previewBtn = screen.getByText('RENDERED PREVIEW');
    fireEvent.click(previewBtn);

    // Verify Mermaid diagram container renders (either rendered SVG badge or syntax fallback)
    expect(await screen.findByText(/MERMAID/i)).toBeInTheDocument();
  });

  it('renders interactive QuizViewer cards when previewing a QUIZ_UPDATE', () => {
    useStore.setState({
      activeDiffUpdateId: 'UPDATE-QUIZ-01',
      graphUpdates: [
        {
          id: 'UPDATE-QUIZ-01',
          title: 'Initial Quiz Bank: Log-Structured Merge Trees',
          description: 'Comprehensive quiz bank with MCQs and distractor rationales',
          category: 'SYSTEMS',
          type: 'QUIZ_UPDATE',
          status: 'PENDING',
          createdAt: '1m ago',
          targetId: 'TOPIC-074',
          targetName: 'LSM Trees',
          oldContent: '[]',
          newContent: JSON.stringify([
            {
              type: 'MCQ',
              stem: 'Why do LSM trees achieve higher write throughput than B-trees?',
              options: {
                A: 'They convert random writes into sequential writes',
                B: 'They do not store data on disk'
              },
              correctAnswer: 'A',
              difficulty: 'MEDIUM'
            }
          ])
        }
      ]
    });

    render(<DiffViewerModal />);

    // Switch to preview mode
    const previewBtn = screen.getByText('RENDERED PREVIEW');
    fireEvent.click(previewBtn);

    // Verify QuizViewer rendered card elements appear instead of raw JSON
    expect(screen.getByTestId('quiz-viewer')).toBeInTheDocument();
    expect(screen.getByText('Why do LSM trees achieve higher write throughput than B-trees?')).toBeInTheDocument();
    expect(screen.getByText(/They convert random writes into sequential writes/i)).toBeInTheDocument();
  });
});
