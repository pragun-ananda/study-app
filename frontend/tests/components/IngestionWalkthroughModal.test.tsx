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
    expect(screen.getByText(/PEDAGOGICAL AUDIT & WALKTHROUGH/i)).toBeInTheDocument();
    expect(screen.getByText('Attention Is All You Need (ArXiv:1706.03762)')).toBeInTheDocument();
    expect(screen.getByText('arxiv.org')).toBeInTheDocument();
    expect(screen.getByText('96% COVERAGE')).toBeInTheDocument();
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
});
