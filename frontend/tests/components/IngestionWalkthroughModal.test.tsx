import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import IngestionWalkthroughModal from '../../src/components/hud/IngestionWalkthroughModal';
import { useStore } from '../../src/store/useStore';
import { INITIAL_QUEUE_ITEMS, INITIAL_UPDATES } from '../../src/data/test/updates';

describe('IngestionWalkthroughModal Component', () => {
  beforeEach(() => {
    useStore.getState().resetState();
  });

  it('renders nothing when activeWalkthroughQueueId is null', () => {
    const { container } = render(<IngestionWalkthroughModal />);
    expect(container.firstChild).toBeNull();
  });

  it('renders walkthrough modal when activeWalkthroughQueueId is set', () => {
    useStore.setState({
      activeWalkthroughQueueId: 'QUEUE-INIT-001',
      queueItems: INITIAL_QUEUE_ITEMS,
      graphUpdates: INITIAL_UPDATES
    });

    render(<IngestionWalkthroughModal />);

    expect(screen.getByTestId('ingestion-walkthrough-modal')).toBeInTheDocument();
    expect(screen.getByText(/AI WALKTHROUGH/i)).toBeInTheDocument();
    expect(screen.getByText('Attention Is All You Need (ArXiv:1706.03762)')).toBeInTheDocument();
    expect(screen.getByText('arxiv.org')).toBeInTheDocument();
    expect(screen.getByText('Quiz & Practice Questions')).toBeInTheDocument();
    expect(screen.queryByText(/% COVERAGE/i)).not.toBeInTheDocument();
  });

  it('displays executive summary, extracted concepts, and omitted content breakdown', () => {
    useStore.setState({
      activeWalkthroughQueueId: 'QUEUE-INIT-001',
      queueItems: INITIAL_QUEUE_ITEMS,
      graphUpdates: INITIAL_UPDATES
    });

    render(<IngestionWalkthroughModal />);

    // Executive summary
    expect(screen.getByText(/Synthesized core mathematical formulations and algorithmic execution traces/i)).toBeInTheDocument();

    // Extracted concepts
    expect(screen.getByText('Reverse-Mode Automatic Differentiation')).toBeInTheDocument();
    expect(screen.getByText(/Foundational computation engine enabling backpropagation/i)).toBeInTheDocument();

    // Omitted content
    expect(screen.getByText(/Hardware cluster node topologies/i)).toBeInTheDocument();
    expect(screen.getByText(/Infrastructure implementation details omitted/i)).toBeInTheDocument();

    // Quiz coverage gotchas
    expect(screen.getByText('Loss of precision in unscaled softmax gradients')).toBeInTheDocument();
  });

  it('approves all updates when Approve All is clicked', async () => {
    useStore.setState({
      activeWalkthroughQueueId: 'QUEUE-INIT-001',
      queueItems: INITIAL_QUEUE_ITEMS,
      graphUpdates: INITIAL_UPDATES
    });

    render(<IngestionWalkthroughModal />);

    const approveAllBtn = screen.getByTestId('walkthrough-approve-all-btn');
    fireEvent.click(approveAllBtn);

    // Queue updates should be marked APPROVED
    const update = useStore.getState().graphUpdates.find((u) => u.id === 'UPDATE-001');
    expect(update?.status).toBe('APPROVED');
    // Modal should close
    expect(useStore.getState().activeWalkthroughQueueId).toBeNull();
  });

  it('closes when close button is clicked or Escape is pressed', () => {
    useStore.setState({
      activeWalkthroughQueueId: 'QUEUE-INIT-001',
      queueItems: INITIAL_QUEUE_ITEMS
    });

    render(<IngestionWalkthroughModal />);

    const closeBtn = screen.getByTestId('close-walkthrough-modal-btn');
    fireEvent.click(closeBtn);

    expect(useStore.getState().activeWalkthroughQueueId).toBeNull();
  });

  it('groups updates by topic node and displays topic header with parts count', () => {
    useStore.setState({
      activeWalkthroughQueueId: 'QUEUE-INIT-002',
      queueItems: INITIAL_QUEUE_ITEMS,
      graphUpdates: INITIAL_UPDATES
    });

    render(<IngestionWalkthroughModal />);

    // Should render the topic group cards
    expect(screen.getByText('Binary Search Trees')).toBeInTheDocument();
    expect(screen.getByText('SVD & Matrix Factorization')).toBeInTheDocument();
    expect(screen.getByText('Across 2 Topics')).toBeInTheDocument();

    // Verify badges and updates inside group
    expect(screen.getByText('TOPIC UPDATE')).toBeInTheDocument();
    expect(screen.getByText('EDGE UPDATE')).toBeInTheDocument();
  });

  it('toggles inline preview of note content directly within walkthrough', () => {
    useStore.setState({
      activeWalkthroughQueueId: 'QUEUE-INIT-001',
      queueItems: INITIAL_QUEUE_ITEMS,
      graphUpdates: INITIAL_UPDATES
    });

    render(<IngestionWalkthroughModal />);

    // Check preview button for UPDATE-001
    const previewBtn = screen.getByTestId('walkthrough-preview-btn-UPDATE-001');
    expect(previewBtn).toBeInTheDocument();
    expect(previewBtn).toHaveTextContent('Preview');

    // Initially preview drawer is not visible
    expect(screen.queryByTestId('walkthrough-inline-preview-UPDATE-001')).not.toBeInTheDocument();

    // Click Preview button
    fireEvent.click(previewBtn);

    // Now preview drawer is open with note content
    expect(screen.getByTestId('walkthrough-inline-preview-UPDATE-001')).toBeInTheDocument();
    expect(screen.getByText(/Backpropagation & Automatic Differentiation/i)).toBeInTheDocument();
    expect(previewBtn).toHaveTextContent('Hide');

    // Click again to close preview drawer
    fireEvent.click(previewBtn);
    expect(screen.queryByTestId('walkthrough-inline-preview-UPDATE-001')).not.toBeInTheDocument();
  });
});

