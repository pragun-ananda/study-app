import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ProblemViewerModal from '../../src/components/hud/ProblemViewerModal';
import { useStore } from '../../src/store/useStore';
import { ProblemItem, TopicNode } from '../../src/types/telemetry';

describe('ProblemViewerModal Component', () => {
  beforeEach(() => {
    useStore.getState().resetState();
  });

  afterEach(() => {
    cleanup();
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

    // Starter code tabs (8 languages)
    const expectedLangs = ['python', 'typescript', 'java', 'cpp', 'go', 'rust', 'sql', 'protobuf'];
    expectedLangs.forEach((lang) => {
      expect(screen.getByTestId(`starter-lang-tab-${lang}`)).toBeInTheDocument();
    });

    // Split Monaco Workbench
    expect(screen.getByTestId('problem-code-workbench')).toBeInTheDocument();
    expectedLangs.forEach((lang) => {
      expect(screen.getByTestId(`workbench-lang-tab-${lang}`)).toBeInTheDocument();
    });
    expect(screen.getByTestId('run-code-btn')).toBeInTheDocument();
    expect(screen.getByTestId('submit-solution-btn')).toBeInTheDocument();
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

  it('switches starter code language tab and supports code copy', () => {
    useStore.getState().setActiveProblem(mockProblem);
    render(<ProblemViewerModal />);

    // Starter code box is rendered with test ID
    const box = screen.getByTestId('problem-starter-code-box');
    expect(box).toBeInTheDocument();

    // Default language is python
    expect(box).toHaveTextContent(/def allow_request/i);

    // Switch to typescript tab
    const tsTab = screen.getByTestId('starter-lang-tab-typescript');
    fireEvent.click(tsTab);

    // Typescript code is now rendered
    expect(box).toHaveTextContent(/export class RateLimiter/i);

    // Copy starter code button exists
    expect(screen.getByTestId('copy-starter-code-btn')).toBeInTheDocument();
  });

  it('adapts syntax highlighting and layout tokens in Light Mode and Dark Mode', () => {
    // 1. Dark Mode
    useStore.getState().setTheme('dark');
    useStore.getState().setActiveProblem(mockProblem);
    const { unmount } = render(<ProblemViewerModal />);
    expect(screen.getByTestId('problem-starter-code-box')).toHaveClass('bg-[#060a14]');
    unmount();

    // 2. Light Mode
    useStore.getState().setTheme('light');
    render(<ProblemViewerModal />);
    expect(screen.getByTestId('problem-starter-code-box')).toHaveClass('bg-slate-50');
  });

  it('supports toggling workbench layout, switching workbench language, adjusting font size, and resetting code', () => {
    useStore.getState().setActiveProblem(mockProblem);
    render(<ProblemViewerModal />);

    // In default split view, both left pane and workbench are visible
    expect(screen.getByTestId('problem-prompt-left-pane')).toBeInTheDocument();
    expect(screen.getByTestId('problem-code-workbench')).toBeInTheDocument();

    // Font size controls
    expect(screen.getByText('13px')).toBeInTheDocument();
    const increaseBtn = screen.getByTestId('increase-font-btn');
    fireEvent.click(increaseBtn);
    expect(screen.getByText('14px')).toBeInTheDocument();

    const decreaseBtn = screen.getByTestId('decrease-font-btn');
    fireEvent.click(decreaseBtn);
    expect(screen.getByText('13px')).toBeInTheDocument();

    // Switch workbench language tab to typescript
    const wbTsTab = screen.getByTestId('workbench-lang-tab-typescript');
    fireEvent.click(wbTsTab);

    // Reset code button is clickable
    const resetBtn = screen.getByTestId('reset-code-btn');
    fireEvent.click(resetBtn);

    // Toggle to full layout and back
    const layoutToggleBtn = screen.getByTestId('toggle-workbench-layout-btn');
    fireEvent.click(layoutToggleBtn);
    // In full layout, split workbench is hidden and full prompt is displayed
    expect(screen.queryByTestId('problem-code-workbench')).not.toBeInTheDocument();
    expect(screen.getByTestId('problem-starter-code-box')).toBeInTheDocument();

    // Toggle back to split layout
    fireEvent.click(layoutToggleBtn);
    expect(screen.getByTestId('problem-code-workbench')).toBeInTheDocument();
  });

  it('supports switching between all 8 languages in workbench and starter code tabs', () => {
    useStore.getState().setActiveProblem(mockProblem);
    render(<ProblemViewerModal />);

    const langExpectations = [
      { id: 'python', label: 'Python' },
      { id: 'typescript', label: 'TypeScript' },
      { id: 'java', label: 'Java' },
      { id: 'cpp', label: 'C++' },
      { id: 'go', label: 'Go' },
      { id: 'rust', label: 'Rust' },
      { id: 'sql', label: 'SQL' },
      { id: 'protobuf', label: 'Protobuf' }
    ];

    // Workbench tabs
    for (const { id, label } of langExpectations) {
      const tab = screen.getByTestId(`workbench-lang-tab-${id}`);
      fireEvent.click(tab);
      // Status bar displays active language label
      expect(screen.getByText(label, { selector: 'span' })).toBeInTheDocument();
    }

    // Starter tabs in left pane
    for (const { id } of langExpectations) {
      const starterTab = screen.getByTestId(`starter-lang-tab-${id}`);
      fireEvent.click(starterTab);
      expect(screen.getByTestId('problem-starter-code-box')).toBeInTheDocument();
    }
  });

  it('renders testcase console drawer with case tabs, inputs, and allows running code', async () => {
    const problemWithCases: ProblemItem = {
      ...mockProblem,
      testCases: [
        { input: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1], expected: 6, explanation: 'Sample trap case' },
        { input: [4, 2, 0, 3, 2, 5], expected: 9, explanation: 'Second trap case' }
      ]
    };
    useStore.getState().setActiveProblem(problemWithCases);
    render(<ProblemViewerModal />);

    // Testcase Console Drawer is rendered
    expect(screen.getByTestId('testcase-console-drawer')).toBeInTheDocument();
    expect(screen.getByTestId('tab-testcases')).toBeInTheDocument();
    expect(screen.getByTestId('tab-console-output')).toBeInTheDocument();

    // Default Case 1 and Case 2 pills exist
    expect(screen.getByTestId('case-pill-0')).toBeInTheDocument();
    expect(screen.getByTestId('case-pill-1')).toBeInTheDocument();

    // Input editor has Case 1 value
    const inputEditor = screen.getByTestId('testcase-input-editor');
    expect(inputEditor).toHaveValue(JSON.stringify(problemWithCases.testCases![0].input, null, 2));

    // Expected editor has Case 1 expected value
    const expectedEditor = screen.getByTestId('testcase-expected-editor');
    expect(expectedEditor).toHaveValue('6');

    // Switch to Case 2
    fireEvent.click(screen.getByTestId('case-pill-1'));
    expect(screen.getByTestId('testcase-expected-editor')).toHaveValue('9');

    // Click Run Code button
    const runBtn = screen.getByTestId('run-code-btn');
    fireEvent.click(runBtn);

    // Console output tab opens and shows verdict
    await waitFor(() => {
      expect(screen.getByTestId('execution-verdict-badge')).toBeInTheDocument();
      expect(screen.getByTestId('actual-output-display')).toBeInTheDocument();
      expect(screen.getByTestId('expected-output-display')).toBeInTheDocument();
    });
  });

  it('allows adding and deleting custom test cases in the testcase console', () => {
    useStore.getState().setActiveProblem(mockProblem);
    render(<ProblemViewerModal />);

    // Initially has 1 sample case
    expect(screen.getByTestId('case-pill-0')).toBeInTheDocument();
    expect(screen.queryByTestId('case-pill-1')).not.toBeInTheDocument();

    // Click Add Case
    const addCaseBtn = screen.getByTestId('add-testcase-btn');
    fireEvent.click(addCaseBtn);

    // Case 2 pill should now exist
    expect(screen.getByTestId('case-pill-1')).toBeInTheDocument();

    // Edit custom case input
    const inputEditor = screen.getByTestId('testcase-input-editor');
    fireEvent.change(inputEditor, { target: { value: '{"test": 123}' } });
    expect(inputEditor).toHaveValue('{"test": 123}');

    // Delete custom case
    const deleteBtn = screen.getByTestId('delete-case-btn-1');
    fireEvent.click(deleteBtn);

    // Case 2 pill should be gone
    expect(screen.queryByTestId('case-pill-1')).not.toBeInTheDocument();
  });

  it('allows collapsing and expanding the testcase console drawer', () => {
    useStore.getState().setActiveProblem(mockProblem);
    render(<ProblemViewerModal />);

    const drawer = screen.getByTestId('testcase-console-drawer');
    expect(drawer).toHaveClass('h-[230px]');

    // Click toggle button to collapse
    const toggleBtn = screen.getByTestId('toggle-console-btn');
    fireEvent.click(toggleBtn);
    expect(drawer).toHaveClass('h-10');

    // Click toggle button to expand
    fireEvent.click(toggleBtn);
    expect(drawer).toHaveClass('h-[230px]');
  });
});

