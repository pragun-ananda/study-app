import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import CreateQuizModal from '../../src/components/hud/CreateQuizModal';
import { useStore } from '../../src/store/useStore';
import * as api from '../../src/api/client';

describe('CreateQuizModal Component', () => {
  beforeEach(() => {
    useStore.getState().resetState();
    vi.restoreAllMocks();
  });

  it('does not render when isCreateQuizOpen is false', () => {
    useStore.getState().setIsCreateQuizOpen(false);
    render(<CreateQuizModal />);
    expect(screen.queryByTestId('create-quiz-modal')).not.toBeInTheDocument();
  });

  it('renders modal with target topic selector and default MCQ question when isCreateQuizOpen is true', () => {
    useStore.getState().setIsCreateQuizOpen(true);
    render(<CreateQuizModal />);

    expect(screen.getByTestId('create-quiz-modal')).toBeInTheDocument();
    expect(screen.getByTestId('quiz-target-topic-select')).toBeInTheDocument();
    expect(screen.getByTestId('quiz-title-input')).toBeInTheDocument();
    expect(screen.getByTestId('question-prompt-input')).toBeInTheDocument();
    expect(screen.getByTestId('question-type-select')).toBeInTheDocument();
    expect(screen.getByTestId('option-input-A')).toBeInTheDocument();
    expect(screen.getByTestId('option-input-B')).toBeInTheDocument();
  });

  it('preselects target topic when createQuizTargetTopicId is set', () => {
    const topics = useStore.getState().topicNodes;
    expect(topics.length).toBeGreaterThan(1);
    const target = topics[1];

    useStore.getState().setCreateQuizTargetTopicId(target.id);
    useStore.getState().setIsCreateQuizOpen(true);

    render(<CreateQuizModal />);

    const select = screen.getByTestId('quiz-target-topic-select') as HTMLSelectElement;
    expect(select.value).toBe(target.id);
  });

  it('allows switching question types between MCQ, TRUE_FALSE, FLASHCARD, ORDERING, and MATCHING', async () => {
    useStore.getState().setIsCreateQuizOpen(true);
    render(<CreateQuizModal />);

    const typeSelect = screen.getByTestId('question-type-select');

    // Switch to TRUE_FALSE
    fireEvent.change(typeSelect, { target: { value: 'TRUE_FALSE' } });
    expect(screen.getByText('Correct Assertion:')).toBeInTheDocument();
    expect(screen.getByText('TRUE')).toBeInTheDocument();
    expect(screen.getByText('FALSE')).toBeInTheDocument();

    // Switch to FLASHCARD
    fireEvent.change(typeSelect, { target: { value: 'FLASHCARD' } });
    expect(screen.getByText(/Front: Term \/ Concept/i)).toBeInTheDocument();
    expect(screen.getByTestId('flashcard-definition-input')).toBeInTheDocument();

    // Switch to ORDERING
    fireEvent.change(typeSelect, { target: { value: 'ORDERING' } });
    expect(screen.getByText(/Sequence Steps/i)).toBeInTheDocument();
    expect(screen.getByText('Add Step')).toBeInTheDocument();

    // Switch to MATCHING
    fireEvent.change(typeSelect, { target: { value: 'MATCHING' } });
    expect(screen.getAllByText(/Matching Pairs/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Add Pair')).toBeInTheDocument();
  });

  it('allows adding and removing questions in builder mode', async () => {
    useStore.getState().setIsCreateQuizOpen(true);
    render(<CreateQuizModal />);

    expect(screen.getByTestId('question-tab-0')).toBeInTheDocument();
    expect(screen.queryByTestId('question-tab-1')).not.toBeInTheDocument();

    // Click Add Question
    const addBtn = screen.getByTestId('add-question-btn');
    fireEvent.click(addBtn);

    expect(screen.getByTestId('question-tab-1')).toBeInTheDocument();
    expect(screen.getByText(/2 Questions Ready/i)).toBeInTheDocument();

    // Click Delete Question
    const deleteBtn = screen.getByTestId('delete-question-btn');
    fireEvent.click(deleteBtn);

    expect(screen.queryByTestId('question-tab-1')).not.toBeInTheDocument();
    expect(screen.getByText(/1 Question Ready/i)).toBeInTheDocument();
  });

  it('switches to Raw JSON mode, handles syntax errors, and syncs back to Builder mode', async () => {
    useStore.getState().setIsCreateQuizOpen(true);
    render(<CreateQuizModal />);

    const rawJsonBtn = screen.getByText('Raw JSON');
    fireEvent.click(rawJsonBtn);

    const textarea = screen.getByTestId('quiz-raw-json-textarea') as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();

    // Type invalid JSON
    fireEvent.change(textarea, { target: { value: '{ invalid: json' } });
    expect(screen.getByText(/Unexpected token|Expected/i)).toBeInTheDocument();

    // Try switching back to Builder mode while JSON is invalid
    const builderBtn = screen.getByText('Builder');
    fireEvent.click(builderBtn);
    expect(screen.getByText(/Invalid JSON syntax/i)).toBeInTheDocument();

    // Put valid JSON
    const validJson = JSON.stringify([
      {
        type: 'FLASHCARD',
        term: 'Backpropagation through time',
        definition: 'BPTT unrolls RNN computation graphs across time steps.',
        difficulty: 'MEDIUM'
      }
    ]);
    fireEvent.change(textarea, { target: { value: validJson } });

    // Switch back to Builder mode
    fireEvent.click(builderBtn);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Backpropagation through time')).toBeInTheDocument();
    });
  });

  it('validates quiz title and question prompt on form submission', async () => {
    useStore.getState().setIsCreateQuizOpen(true);
    render(<CreateQuizModal />);

    // Attempt submit with empty title
    const saveBtn = screen.getByTestId('save-quiz-btn');
    // Button is disabled when title is empty
    expect(saveBtn).toBeDisabled();

    const titleInput = screen.getByTestId('quiz-title-input');
    fireEvent.change(titleInput, { target: { value: 'Neural Networks 101' } });
    expect(saveBtn).not.toBeDisabled();

    // Leave question prompt empty and trigger submit
    const promptInput = screen.getByTestId('question-prompt-input');
    fireEvent.change(promptInput, { target: { value: '   ' } });

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByTestId('create-quiz-error-banner')).toBeInTheDocument();
      expect(screen.getByText(/missing a prompt or term/i)).toBeInTheDocument();
    });
  });

  it('submits quiz successfully and attaches it to the target topic', async () => {
    const topic = useStore.getState().topicNodes[0];
    useStore.getState().setCreateQuizTargetTopicId(topic.id);
    useStore.getState().setIsCreateQuizOpen(true);

    const createQuizSpy = vi.spyOn(api, 'createQuizForTopic').mockResolvedValueOnce({
      id: 'QUIZ-CREATED-1',
      title: 'Attention Mechanism Mastery',
      description: 'Test questions',
      questions: [
        {
          id: 'Q-1',
          type: 'MCQ',
          prompt: 'What scaling is used in self-attention?',
          options: { A: 'sqrt(d_k)', B: 'd_k^2' },
          correctAnswer: 'A',
          explanation: 'Standard scaling'
        }
      ]
    });

    render(<CreateQuizModal />);

    const titleInput = screen.getByTestId('quiz-title-input');
    fireEvent.change(titleInput, { target: { value: 'Attention Mechanism Mastery' } });

    const promptInput = screen.getByTestId('question-prompt-input');
    fireEvent.change(promptInput, { target: { value: 'What scaling is used in self-attention?' } });

    const optA = screen.getByTestId('option-input-A');
    fireEvent.change(optA, { target: { value: 'sqrt(d_k)' } });

    const optB = screen.getByTestId('option-input-B');
    fireEvent.change(optB, { target: { value: 'd_k^2' } });

    const saveBtn = screen.getByTestId('save-quiz-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(createQuizSpy).toHaveBeenCalledWith(
        topic.id,
        expect.objectContaining({
          title: 'Attention Mechanism Mastery'
        })
      );
      expect(useStore.getState().isCreateQuizOpen).toBe(false);
    });

    // Verify quiz was appended to topic in store
    const updatedTopic = useStore.getState().topicNodes.find((t) => t.id === topic.id);
    expect(updatedTopic?.quizzes?.some((q) => q.title === 'Attention Mechanism Mastery')).toBe(true);
  });

  it('closes modal when cancel button is clicked', () => {
    useStore.getState().setIsCreateQuizOpen(true);
    render(<CreateQuizModal />);

    const cancelBtn = screen.getByTestId('cancel-quiz-btn');
    fireEvent.click(cancelBtn);

    expect(useStore.getState().isCreateQuizOpen).toBe(false);
  });

  it('closes modal when Escape key is pressed', () => {
    useStore.getState().setIsCreateQuizOpen(true);
    render(<CreateQuizModal />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useStore.getState().isCreateQuizOpen).toBe(false);
  });
});
