import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnnotationDock } from '../../src/components/code_repo/AnnotationDock';
import { useRepoStore } from '../../src/store/useRepoStore';
import { useSolStore } from '../../src/store/useSolStore';
import { CodeAnnotationDTO } from '../../src/types/telemetry';

describe('AnnotationDock', () => {
  const sampleAnnotations: CodeAnnotationDTO[] = [
    {
      id: 'ANN-101',
      repositoryId: 'REPO-1',
      commitSha: 'abc',
      filePath: 'src/server.c',
      startLine: 10,
      endLine: 20,
      title: 'Event Loop Multiplexing',
      content: 'Using epoll for non-blocking network socket polling.',
      anchorCodeSnippet: 'int epoll_wait(int epfd, struct epoll_event *events, int maxevents, int timeout);',
      designCategory: 'ARCHITECTURE',
      aiExplanation: null,
      topicId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'ANN-102',
      repositoryId: 'REPO-1',
      commitSha: 'abc',
      filePath: 'src/server.c',
      startLine: 35,
      endLine: 45,
      title: 'Striped Mutex Contention',
      content: 'Prevents thread contention by striping bucket locks.',
      anchorCodeSnippet: 'pthread_mutex_lock(&bucket[idx].lock);',
      designCategory: 'CONCURRENCY',
      aiExplanation: {
        summary: 'Locks individual hash buckets rather than entire hash map.',
        architecturalRationale: 'Reduces lock contention by N-fold scaling horizontally with CPU cores.',
        designPatterns: ['Striped Locking', 'Critical Section'],
        concurrencyAndFailureModes: {
          raceConditionsAndDeadlocks: 'Lock ordering must be maintained if multi-key operations occur.',
          memoryTradeoffs: 'N mutex instances increase struct memory overhead.',
          spofOrBottleneck: 'Single hot key will still saturate its specific bucket lock.'
        },
        complexityAnalysis: {
          timeComplexity: 'O(1)',
          spaceComplexity: 'O(N) mutexes',
          scalabilityNotes: 'Scales to 64 cores'
        },
        suggestedStudyQuestions: [
          {
            question: 'How do you perform atomic re-sizing across striped buckets?',
            rationale: 'Tests synchronization barriers and two-phase locking knowledge.'
          }
        ]
      },
      topicId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  beforeEach(() => {
    useRepoStore.getState().resetState();
    useSolStore.getState().closeChat();
    useRepoStore.setState({
      activeRepoId: 'REPO-1',
      activeFilePath: 'src/server.c',
      annotations: sampleAnnotations
    });
  });

  it('renders all annotations for the active file', () => {
    render(<AnnotationDock currentFileContent="" />);

    expect(screen.getByText('Event Loop Multiplexing')).toBeInTheDocument();
    expect(screen.getByText('Striped Mutex Contention')).toBeInTheDocument();
    expect(screen.getByText('2 Notes')).toBeInTheDocument();
  });

  it('filters annotations by category when category filter pill is clicked', () => {
    render(<AnnotationDock currentFileContent="" />);

    // Click CONCURRENCY filter
    const concurrencyFilter = screen.getByTestId('filter-concurrency');
    fireEvent.click(concurrencyFilter);

    expect(screen.getByText('Striped Mutex Contention')).toBeInTheDocument();
    expect(screen.queryByText('Event Loop Multiplexing')).not.toBeInTheDocument();

    // Click ALL filter
    const allFilter = screen.getByTestId('filter-all');
    fireEvent.click(allFilter);

    expect(screen.getByText('Event Loop Multiplexing')).toBeInTheDocument();
  });

  it('displays AI architectural rationale card when aiExplanation exists', () => {
    render(<AnnotationDock currentFileContent="" />);

    expect(screen.getByText('Staff+ Architectural Critique')).toBeInTheDocument();
    expect(screen.getByText(/Locks individual hash buckets/)).toBeInTheDocument();
    expect(screen.getByText(/Reduces lock contention/)).toBeInTheDocument();
    expect(screen.getByText('Striped Locking')).toBeInTheDocument();
  });

  it('displays Explain Architecture with AI button when aiExplanation is null and triggers explanation on click', async () => {
    render(<AnnotationDock currentFileContent="" />);

    const explainBtn = screen.getByTestId('explain-ai-btn-ANN-101');
    expect(explainBtn).toBeInTheDocument();

    fireEvent.click(explainBtn);

    await waitFor(() => {
      const state = useRepoStore.getState();
      const ann = state.annotations.find((a) => a.id === 'ANN-101');
      expect(ann?.aiExplanation).toBeDefined();
    });
  });

  it('detects code drift when current file content has shifted', () => {
    // Current file content has modified code at lines 10-20
    const shiftedContent = new Array(30).fill('// modified code').join('\n');

    render(<AnnotationDock currentFileContent={shiftedContent} />);

    const driftBadges = screen.getAllByText('Drift');
    expect(driftBadges.length).toBeGreaterThan(0);
  });

  it('allows editing annotation title and content in-place', async () => {
    render(<AnnotationDock currentFileContent="" />);

    const editBtn = screen.getByTestId('edit-annotation-ANN-101');
    fireEvent.click(editBtn);

    const titleInput = screen.getByDisplayValue('Event Loop Multiplexing');
    fireEvent.change(titleInput, { target: { value: 'Reactor Pattern Multiplexing' } });

    const saveBtn = screen.getByTitle('Save Changes');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Reactor Pattern Multiplexing')).toBeInTheDocument();
    });
  });

  it('allows deleting annotation on trash click', async () => {
    render(<AnnotationDock currentFileContent="" />);

    const delBtn = screen.getByTestId('delete-annotation-ANN-101');
    fireEvent.click(delBtn);

    await waitFor(() => {
      expect(screen.queryByText('Event Loop Multiplexing')).not.toBeInTheDocument();
    });
  });

  it('opens Sol AI chat drawer and sends context when Ask Sol AI in Chat is clicked', () => {
    render(<AnnotationDock currentFileContent="" />);

    const askSolBtns = screen.getAllByText('Ask Sol AI in Chat');
    fireEvent.click(askSolBtns[0]);

    expect(useSolStore.getState().isOpen).toBe(true);
    const messages = useSolStore.getState().messages;
    const lastMsg = messages[messages.length - 1];
    expect(lastMsg.text).toContain('src/server.c');
  });
});
