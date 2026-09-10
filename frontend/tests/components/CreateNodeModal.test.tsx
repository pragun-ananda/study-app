import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import CreateNodeModal from '../../src/components/hud/CreateNodeModal';
import { useStore } from '../../src/store/useStore';
import { DEFAULT_DOMAINS } from '../../src/types/telemetry';

describe('CreateNodeModal Component', () => {
  beforeEach(() => {
    useStore.getState().resetState();
    useStore.getState().setIsCreateNodeOpen(true);
  });

  it('renders modal with all form inputs when isCreateNodeOpen is true', () => {
    render(<CreateNodeModal />);

    expect(screen.getByTestId('create-node-modal')).toBeInTheDocument();
    expect(screen.getByTestId('create-node-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('create-node-category-select')).toBeInTheDocument();
    expect(screen.getByTestId('create-node-status-select')).toBeInTheDocument();
    expect(screen.getByTestId('create-node-summary-input')).toBeInTheDocument();
    expect(screen.getByTestId('create-node-submit-btn')).toBeInTheDocument();
  });

  it('populates category dropdown with all DEFAULT_DOMAINS', () => {
    render(<CreateNodeModal />);

    const categorySelect = screen.getByTestId('create-node-category-select') as HTMLSelectElement;
    const options = Array.from(categorySelect.options).map((o) => o.value);
    expect(options).toEqual(expect.arrayContaining([...DEFAULT_DOMAINS]));
  });

  it('disables submit button when topic name is empty or only whitespace', () => {
    render(<CreateNodeModal />);

    const submitBtn = screen.getByTestId('create-node-submit-btn');
    const nameInput = screen.getByTestId('create-node-name-input');

    fireEvent.change(nameInput, { target: { value: '   ' } });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(nameInput, { target: { value: 'Transformers' } });
    expect(submitBtn).not.toBeDisabled();
  });

  it('successfully creates a topic node and links selected prerequisites', async () => {
    const existingTopics = useStore.getState().topicNodes;
    const prereqTopic = existingTopics[0];

    const addTopicSpy = vi.spyOn(useStore.getState(), 'addTopicNode').mockResolvedValueOnce({
      id: 'TOPIC-NEW-123',
      name: 'Diffusion Probabilistic Models',
      category: 'AI & ML',
      status: 'LEARNING',
      mastery: 25,
      coordinates: [10, 10, 0],
      summary: 'Denoising diffusion fundamentals',
      lastReviewed: 'Never',
      prerequisites: [],
      unlocks: []
    });

    const addPrereqSpy = vi.spyOn(useStore.getState(), 'addPrerequisiteEdge').mockResolvedValueOnce();

    render(<CreateNodeModal />);

    // Fill form
    fireEvent.change(screen.getByTestId('create-node-name-input'), {
      target: { value: 'Diffusion Probabilistic Models' }
    });
    fireEvent.change(screen.getByTestId('create-node-category-select'), {
      target: { value: 'AI & ML' }
    });
    fireEvent.change(screen.getByTestId('create-node-status-select'), {
      target: { value: 'LEARNING' }
    });
    fireEvent.change(screen.getByTestId('create-node-summary-input'), {
      target: { value: 'Denoising diffusion fundamentals' }
    });

    // Select prerequisite
    const prereqRow = screen.getByText(prereqTopic.name);
    fireEvent.click(prereqRow);

    // Submit
    const submitBtn = screen.getByTestId('create-node-submit-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(addTopicSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Diffusion Probabilistic Models',
          category: 'AI & ML',
          status: 'LEARNING',
          summary: 'Denoising diffusion fundamentals'
        })
      );
      expect(addPrereqSpy).toHaveBeenCalledWith('TOPIC-NEW-123', prereqTopic.id);
      expect(useStore.getState().isCreateNodeOpen).toBe(false);
    });

    addTopicSpy.mockRestore();
    addPrereqSpy.mockRestore();
  });

  it('displays error message and keeps modal open if topic creation fails', async () => {
    const addTopicSpy = vi.spyOn(useStore.getState(), 'addTopicNode').mockRejectedValueOnce(
      new Error('Failed to create topic')
    );

    render(<CreateNodeModal />);

    fireEvent.change(screen.getByTestId('create-node-name-input'), {
      target: { value: 'Faulty Topic' }
    });

    const submitBtn = screen.getByTestId('create-node-submit-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Failed to create topic')).toBeInTheDocument();
      expect(useStore.getState().isCreateNodeOpen).toBe(true);
    });

    addTopicSpy.mockRestore();
  });

  it('closes modal when Cancel button or X button is clicked', () => {
    render(<CreateNodeModal />);

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);
    expect(useStore.getState().isCreateNodeOpen).toBe(false);

    act(() => {
      useStore.getState().setIsCreateNodeOpen(true);
    });
    const closeXBtn = screen.getByTitle('Close (ESC)');
    fireEvent.click(closeXBtn);
    expect(useStore.getState().isCreateNodeOpen).toBe(false);
  });
});
