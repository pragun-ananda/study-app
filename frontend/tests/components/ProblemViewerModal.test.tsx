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

  it('exposes breakdown and guided practice tabs for any problem with a reviewed path', () => {
    useStore.getState().setActiveProblem({ ...mockProblem, guidedLearningPathAvailable: true });
    render(<ProblemViewerModal />);
    expect(screen.getByTestId('problem-tab-guided')).toHaveTextContent('BREAKDOWN & PRACTICE');
    expect(screen.getByTestId('problem-tab-guided').className).toContain('text-sky-600');
  });

  it('shows coding follow-up questions from the problem prompt data', () => {
    const codingProblem = {
      ...mockProblem,
      type: 'CODING' as const,
      followUps: [{ id: 'FU-1', title: 'Worker restart', prompt: 'What happens after restart?', rubric: {}, hints: [] }]
    };
    useStore.getState().setActiveProblem(codingProblem);
    render(<ProblemViewerModal />);

    fireEvent.click(screen.getByTestId('problem-tab-system-design'));
    expect(screen.getByTestId('problem-tab-system-design')).toHaveTextContent('FOLLOW-UP QUESTIONS');
    expect(screen.getByText('Follow-Up Questions')).toBeInTheDocument();
    expect(screen.getByText('Worker restart')).toBeInTheDocument();
    expect(screen.getByText('What happens after restart?')).toBeInTheDocument();
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

  it('handles code submission and displays submission result overlay with telemetry', async () => {
    const mockSubmission = {
      id: 'SUB-123',
      problemId: mockProblem.id,
      language: 'typescript',
      code: 'export function solve() { return true; }',
      status: 'ACCEPTED' as const,
      passedCount: 2,
      totalCount: 2,
      runtimeMs: 0.45,
      memoryKb: 37200,
      stdout: 'All 2 cases passed',
      createdAt: new Date().toISOString()
    };

    const submitSpy = vi.fn().mockResolvedValue(mockSubmission);
    useStore.setState({ submitProblem: submitSpy as any });
    useStore.getState().setActiveProblem(mockProblem);
    render(<ProblemViewerModal />);

    // Click Submit button
    const submitBtn = screen.getByTestId('submit-solution-btn');
    expect(submitBtn).toBeInTheDocument();
    fireEvent.click(submitBtn);

    // Submission result modal opens
    await waitFor(() => {
      expect(screen.getByTestId('submission-result-modal')).toBeInTheDocument();
      expect(screen.getByTestId('submission-verdict-title')).toHaveTextContent(/Accepted/i);
      expect(screen.getByTestId('submission-runtime-stat')).toHaveTextContent(/ms/i);
      expect(screen.getByTestId('submission-memory-stat')).toHaveTextContent(/MB/i);
      expect(screen.getByTestId('submission-passed-stat')).toHaveTextContent('2 / 2');
    });

    // Close submission modal via Back to Code button
    const closeBtn = screen.getByTestId('back-to-code-btn');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('submission-result-modal')).not.toBeInTheDocument();
  });

  it('switches to SUBMISSIONS tab and renders submission history table', async () => {
    const mockSubmission = {
      id: 'SUB-456',
      problemId: mockProblem.id,
      language: 'python',
      code: 'class Solution:\n    pass',
      status: 'ACCEPTED' as const,
      passedCount: 3,
      totalCount: 3,
      runtimeMs: 1.2,
      memoryKb: 38000,
      createdAt: new Date().toISOString()
    };

    const fetchSpy = vi.fn().mockResolvedValue([mockSubmission]);
    useStore.setState({
      fetchProblemSubmissions: fetchSpy as any,
      problemSubmissions: {
        [mockProblem.id]: [mockSubmission]
      }
    });
    useStore.getState().setActiveProblem(mockProblem);
    render(<ProblemViewerModal />);

    // Switch to SUBMISSIONS tab
    const submissionsTab = screen.getByTestId('problem-tab-submissions');
    expect(submissionsTab).toBeInTheDocument();
    fireEvent.click(submissionsTab);

    // Section and table are visible
    await waitFor(() => {
      expect(screen.getByTestId('problem-submissions-section')).toBeInTheDocument();
      expect(screen.getByTestId('submissions-table')).toBeInTheDocument();
      expect(screen.getByTestId('submission-history-row')).toBeInTheDocument();
      expect(screen.getByText('python')).toBeInTheDocument();
    });
  });

  describe('System Design Follow-ups Drawer & Workbench', () => {
    const mockProblemWithFollowUps: ProblemItem = {
      ...mockProblem,
      id: 'PROB-TRAPPING-WATER-FU',
      title: 'Trapping Rain Water',
      followUps: [
        {
          id: 'FU-STREAM-1',
          title: 'Distributed Stream Aggregation & Flood Early Warning',
          prompt: 'How to scale hydrological stream ingestion to 1M events/sec across Kafka partitions?',
          rubric: {
            stream_partitioning: 30,
            stateful_windows: 40,
            fault_tolerance: 30
          },
          hints: [
            'Partition by geospatial watershed ID',
            'Use Apache Flink with RocksDB checkpointing'
          ],
          sampleArchitecture: 'Sensors -> Kafka -> Flink -> TimescaleDB'
        },
        {
          id: 'FU-ARCHIVE-2',
          title: 'Historical Hydrological Analytics Archive',
          prompt: 'Archive 10 years of sensor records with sub-second temporal rollups.',
          rubric: {
            columnar_storage: 50,
            materialized_views: 50
          }
        }
      ]
    };

    it('renders SYSTEM DESIGN tab with badge count and allows switching to follow-ups drawer', async () => {
      useStore.getState().setActiveProblem(mockProblemWithFollowUps);
      render(<ProblemViewerModal />);

      // Tab button and count badge
      const systemDesignTab = screen.getByTestId('problem-tab-system-design');
      expect(systemDesignTab).toBeInTheDocument();
      expect(screen.getByTestId('system-design-count-badge')).toHaveTextContent('2');

      // Click to switch tab
      fireEvent.click(systemDesignTab);

      // Section is visible
      expect(screen.getByTestId('problem-system-design-section')).toBeInTheDocument();
      expect(screen.getByText('System Design Follow-Ups')).toBeInTheDocument();

      // Challenge selector pills
      expect(screen.getByTestId('followup-pill-0')).toHaveTextContent('Distributed Stream Aggregation & Flood Early Warning');
      expect(screen.getByTestId('followup-pill-1')).toHaveTextContent('Historical Hydrological Analytics Archive');

      // Prompt and Rubric cards
      expect(screen.getByTestId('followup-prompt-card')).toHaveTextContent(/How to scale hydrological stream ingestion/i);
      expect(screen.getByTestId('followup-rubric-card')).toHaveTextContent('stream partitioning');
      expect(screen.getByTestId('followup-rubric-card')).toHaveTextContent('30%');

      // Hints card and toggling
      expect(screen.getByTestId('followup-hints-card')).toBeInTheDocument();
      const hintToggle0 = screen.getByTestId('followup-hint-toggle-0');
      fireEvent.click(hintToggle0);
      expect(screen.getByTestId('followup-hint-content-0')).toHaveTextContent('Partition by geospatial watershed ID');
    });

    it('switches challenges when clicking pills', async () => {
      useStore.getState().setActiveProblem(mockProblemWithFollowUps);
      render(<ProblemViewerModal />);

      fireEvent.click(screen.getByTestId('problem-tab-system-design'));

      // Switch to challenge #2
      fireEvent.click(screen.getByTestId('followup-pill-1'));

      expect(screen.getByTestId('followup-prompt-card')).toHaveTextContent(/Archive 10 years of sensor records/i);
      expect(screen.getByTestId('followup-rubric-card')).toHaveTextContent('columnar storage');
    });

    it('allows typing architectural response and saves draft', async () => {
      const saveSpy = vi.fn().mockResolvedValue({
        id: 'RESP-123',
        problemId: mockProblemWithFollowUps.id,
        followUpId: 'FU-STREAM-1',
        responseText: 'We partition Kafka topics by watershed cell ID.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      useStore.setState({
        saveFollowUpResponse: saveSpy as any,
        followUpResponses: {}
      });

      useStore.getState().setActiveProblem(mockProblemWithFollowUps);
      render(<ProblemViewerModal />);

      fireEvent.click(screen.getByTestId('problem-tab-system-design'));

      // Find response editor textarea
      const textarea = screen.getByTestId('followup-response-textarea');
      fireEvent.change(textarea, { target: { value: 'We partition Kafka topics by watershed cell ID.' } });
      expect(textarea).toHaveValue('We partition Kafka topics by watershed cell ID.');

      // Click Save Architecture Draft
      const saveBtn = screen.getByTestId('save-followup-response-btn');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(saveSpy).toHaveBeenCalledWith(
          mockProblemWithFollowUps.id,
          'FU-STREAM-1',
          { responseText: 'We partition Kafka topics by watershed cell ID.' }
        );
        expect(screen.getByText('Saved')).toBeInTheDocument();
      });
    });

    it('renders empty state when problem has no follow-ups', () => {
      const problemWithoutFollowUps: ProblemItem = {
        ...mockProblem,
        id: 'PROB-NO-FU',
        followUps: []
      };

      useStore.getState().setActiveProblem(problemWithoutFollowUps);
      render(<ProblemViewerModal />);

      fireEvent.click(screen.getByTestId('problem-tab-system-design'));
      expect(screen.getByTestId('no-followups-message')).toBeInTheDocument();
      expect(screen.getByText('No System Design Follow-Ups')).toBeInTheDocument();
    });

    it('switches between Diagram, Split, and Written workbench modes', async () => {
      useStore.getState().setActiveProblem(mockProblemWithFollowUps);
      render(<ProblemViewerModal />);

      fireEvent.click(screen.getByTestId('problem-tab-system-design'));

      // Default is SPLIT: both Excalidraw canvas and textarea are present
      expect(screen.getByTestId('workbench-mode-split')).toBeInTheDocument();
      expect(screen.getByTestId('excalidraw-canvas-wrapper')).toBeInTheDocument();
      expect(screen.getByTestId('followup-response-textarea')).toBeInTheDocument();

      // Switch to DIAGRAM only
      fireEvent.click(screen.getByTestId('workbench-mode-diagram'));
      expect(screen.getByTestId('excalidraw-canvas-wrapper')).toBeInTheDocument();
      expect(screen.queryByTestId('followup-response-textarea')).not.toBeInTheDocument();

      // Switch to WRITTEN only
      fireEvent.click(screen.getByTestId('workbench-mode-written'));
      expect(screen.queryByTestId('excalidraw-canvas-wrapper')).not.toBeInTheDocument();
      expect(screen.getByTestId('followup-response-textarea')).toBeInTheDocument();
    });

    it('triggers Grade Architecture with AI and renders evaluation report cards', async () => {
      const mockEvaluation: SystemDesignGradingResult = {
        score: 88,
        rubricScores: {
          stream_partitioning: { score: 26, maxWeight: 30, feedback: 'Strong partition key choice' },
          stateful_sliding_windows: { score: 35, maxWeight: 40, feedback: 'Flink stateful windows well specified' },
          fault_tolerance_ha: { score: 27, maxWeight: 30, feedback: 'RocksDB checkpoint replicas adequate' }
        },
        scalabilityAssessment: 'The architecture proposal demonstrates sound horizontal scalability across compute and state storage tiers.',
        singlePointsOfFailure: [
          'Single primary Kafka broker controller without Raft quorum failover',
          'Direct synchronous downstream worker calls without circuit breaker'
        ],
        tradeOffCritique: 'Favors eventual consistency and low write latency over strict linearizability.',
        actionableImprovements: [
          'Implement client-side consistent hashing to prevent partition skew',
          'Add distributed tracing headers (OpenTelemetry) across the event stream pipeline'
        ]
      };

      const gradeSpy = vi.fn().mockResolvedValue({
        evaluation: mockEvaluation,
        savedResponse: {
          id: 'RESP-GRADED-1',
          problemId: mockProblemWithFollowUps.id,
          followUpId: 'FU-STREAM-1',
          responseText: 'Kafka stream with Flink workers.',
          score: 88,
          feedback: JSON.stringify(mockEvaluation),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      useStore.setState({ gradeFollowUpResponse: gradeSpy as any });
      useStore.getState().setActiveProblem(mockProblemWithFollowUps);
      render(<ProblemViewerModal />);

      fireEvent.click(screen.getByTestId('problem-tab-system-design'));

      const gradeBtn = screen.getByTestId('grade-architecture-btn');
      expect(gradeBtn).toHaveTextContent('Grade Architecture with AI');

      fireEvent.click(gradeBtn);

      await waitFor(() => {
        expect(gradeSpy).toHaveBeenCalledWith(
          mockProblemWithFollowUps.id,
          'FU-STREAM-1',
          expect.any(Object)
        );
      });

      // Verify Evaluation Report Card
      await waitFor(() => {
        expect(screen.getByTestId('system-design-grading-report')).toBeInTheDocument();
        expect(screen.getByTestId('grading-overall-score')).toHaveTextContent('88 / 100');
        expect(screen.getByTestId('grading-rubric-breakdown')).toHaveTextContent('stream partitioning');
        expect(screen.getByTestId('grading-rubric-breakdown')).toHaveTextContent('26 / 30');
        expect(screen.getByTestId('grading-scalability-assessment')).toHaveTextContent(/sound horizontal scalability/i);
        expect(screen.getByTestId('grading-spofs-container')).toHaveTextContent('Single primary Kafka broker controller');
        expect(screen.getByTestId('grading-tradeoffs-critique')).toHaveTextContent(/Favors eventual consistency/i);
        expect(screen.getByTestId('grading-improvements-container')).toHaveTextContent('Implement client-side consistent hashing');
      });
    });
  });
});


