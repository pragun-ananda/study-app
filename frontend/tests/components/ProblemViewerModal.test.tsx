import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import ProblemViewerModal from '../../src/components/hud/ProblemViewerModal';
import { useStore } from '../../src/store/useStore';
import { ProblemItem, TopicNode } from '../../src/types/telemetry';

describe('ProblemViewerModal Component', () => {
  beforeEach(() => {
    useStore.getState().resetState();
  });

  const mockTopic: TopicNode = {
    id: 'TOPIC-HASH-RING',
    name: 'Consistent Hashing',
    category: 'SYSTEMS',
    mastery: 85,
    status: 'MASTERED',
    lastReviewed: new Date().toISOString(),
    coordinates: [0, 0, 0],
    prerequisites: [],
    unlocks: [],
    summary: 'Virtual nodes and deterministic partitioning ring'
  };

  const mockProblem: ProblemItem = {
    id: 'PROB-RATE-LIMITER',
    title: 'Distributed Rate Limiter',
    type: 'SYSTEM_DESIGN',
    difficulty: 'HARD',
    domain: 'SYSTEMS',
    summary: 'Design a distributed rate limiter that handles 100k+ QPS with sub-millisecond overhead.',
    targetCompanies: ['Stripe', 'Google', 'Meta'],
    timeLimitMinutes: 45,
    prompt: `### Problem Description
Design a high-throughput, low-latency rate limiter service across multiple regions.

#### Requirements
- 100k requests/sec
- Configurable per-user tier limits`,
    hints: [
      'Token bucket is better suited than fixed window counters to prevent boundary spikes.',
      'Redis cluster with local in-memory sliding windows can minimize cross-datacenter round-trips.'
    ],
    solution: `### Recommended Architecture
1. **Algorithm**: Token Bucket + Sliding Log hybrid.
2. **Data Store**: Redis cluster sharded via consistent hashing.`,
    starterCode: {
      python: 'class RateLimiter:\n    def allow_request(self, user_id: str) -> bool:\n        pass\n',
      typescript: 'export class RateLimiter {\n  allowRequest(userId: string): boolean {\n    return true;\n  }\n}\n'
    },
    prerequisiteTopics: [mockTopic],
    quizzes: []
  };

  it('renders nothing when activeProblem is null', () => {
    useStore.getState().setActiveProblem(null);
    const { container } = render(<ProblemViewerModal />);
    expect(container.firstChild).toBeNull();
  });

  it('renders header, badges, prompt, and starter code when activeProblem is set', () => {
    useStore.getState().setActiveProblem(mockProblem);
    render(<ProblemViewerModal />);

    // Header & metadata
    expect(screen.getByText('Distributed Rate Limiter')).toBeInTheDocument();
    expect(screen.getByText('SYSTEM DESIGN ARCHITECTURE')).toBeInTheDocument();
    expect(screen.getByText('HARD')).toBeInTheDocument();
    expect(screen.getByText('SYSTEMS')).toBeInTheDocument();
    expect(screen.getByText('45 min limit')).toBeInTheDocument();

    // Companies
    expect(screen.getByText('Stripe')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();

    // Prompt content
    expect(screen.getByText(/Design a high-throughput, low-latency rate limiter service/i)).toBeInTheDocument();

    // Starter code tabs
    expect(screen.getByText('python')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('toggles hints drawer and reveals hints progressively', () => {
    useStore.getState().setActiveProblem(mockProblem);
    render(<ProblemViewerModal />);

    // Initial state: hint 1 is hidden
    const hint1Toggle = screen.getByTestId('hint-toggle-btn-0');
    expect(screen.queryByText(/Token bucket is better suited/i)).not.toBeInTheDocument();

    // Click to reveal hint 1
    fireEvent.click(hint1Toggle);
    expect(screen.getByText(/Token bucket is better suited/i)).toBeInTheDocument();

    // Click again to collapse hint 1
    fireEvent.click(hint1Toggle);
    expect(screen.queryByText(/Token bucket is better suited/i)).not.toBeInTheDocument();
  });

  it('switches to SOLUTION tab and displays prerequisite topic chips', () => {
    useStore.getState().setActiveProblem(mockProblem);
    render(<ProblemViewerModal />);

    // Switch to SOLUTION tab
    const solutionTabBtn = screen.getByTestId('problem-tab-solution');
    fireEvent.click(solutionTabBtn);

    // Solution text
    expect(screen.getByText(/Recommended Architecture/i)).toBeInTheDocument();

    // Prerequisite topic chip
    expect(screen.getByText('Consistent Hashing')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();

    // Clicking prerequisite chip focuses topic in store
    const prereqChip = screen.getByTestId('prereq-topic-chip-TOPIC-HASH-RING');
    fireEvent.click(prereqChip);

    expect(useStore.getState().selectedTopicId).toBe('TOPIC-HASH-RING');
    expect(useStore.getState().isInspectorOpen).toBe(true);
    expect(useStore.getState().activeProblem).toBeNull();
  });

  it('closes modal on Escape key press', () => {
    useStore.getState().setActiveProblem(mockProblem);
    render(<ProblemViewerModal />);

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(useStore.getState().activeProblem).toBeNull();
  });

  it('closes modal when close button is clicked', () => {
    useStore.getState().setActiveProblem(mockProblem);
    render(<ProblemViewerModal />);

    const closeBtn = screen.getByTitle('Close problem (Esc)');
    fireEvent.click(closeBtn);
    expect(useStore.getState().activeProblem).toBeNull();
  });

  it('enters edit mode and allows editing problem content', async () => {
    const updateProblemSpy = vi.fn().mockResolvedValue({
      ...mockProblem,
      title: 'Updated Rate Limiter',
      prompt: 'Updated prompt markdown'
    });
    useStore.setState({ updateProblem: updateProblemSpy as any, activeProblem: mockProblem });

    render(<ProblemViewerModal />);

    // Click Edit button
    const editBtn = screen.getByTestId('problem-edit-btn');
    fireEvent.click(editBtn);

    // Form inputs should now be visible
    const titleInput = screen.getByTestId('problem-edit-title-input');
    expect(titleInput).toHaveValue('Distributed Rate Limiter');

    // Edit title
    fireEvent.change(titleInput, { target: { value: 'Updated Rate Limiter' } });
    expect(titleInput).toHaveValue('Updated Rate Limiter');

    // Edit prompt textarea
    const promptTextarea = screen.getByTestId('problem-edit-prompt-textarea');
    fireEvent.change(promptTextarea, { target: { value: 'Updated prompt markdown' } });

    // Switch to preview mode
    const previewBtn = screen.getByTestId('problem-edit-preview-mode-btn');
    fireEvent.click(previewBtn);
    expect(screen.getByText('Updated prompt markdown')).toBeInTheDocument();

    // Switch back to write mode
    const writeBtn = screen.getByTestId('problem-edit-write-mode-btn');
    fireEvent.click(writeBtn);

    // Click Save button
    const saveBtn = screen.getByTestId('problem-save-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateProblemSpy).toHaveBeenCalledWith(
        'PROB-RATE-LIMITER',
        expect.objectContaining({
          title: 'Updated Rate Limiter',
          prompt: 'Updated prompt markdown'
        })
      );
    });
  });

  it('cancels edit mode and reverts changes on Cancel button click', () => {
    useStore.getState().setActiveProblem(mockProblem);
    render(<ProblemViewerModal />);

    // Enter edit mode
    fireEvent.click(screen.getByTestId('problem-edit-btn'));

    const titleInput = screen.getByTestId('problem-edit-title-input');
    fireEvent.change(titleInput, { target: { value: 'Temp Title' } });

    // Click Cancel
    const cancelBtn = screen.getByTestId('problem-cancel-edit-btn');
    fireEvent.click(cancelBtn);

    // Should be back in view mode with original title
    expect(screen.getByText('Distributed Rate Limiter')).toBeInTheDocument();
    expect(screen.queryByTestId('problem-edit-title-input')).not.toBeInTheDocument();
  });
});
