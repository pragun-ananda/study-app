import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import TelemetryHUD from '../../src/components/hud/TelemetryHUD';
import { useStore } from '../../src/store/useStore';
import { useRepoStore } from '../../src/store/useRepoStore';

describe('TelemetryHUD Component', () => {
  beforeEach(() => {
    useStore.getState().resetState();
    useRepoStore.getState().resetState();
  });

  it('renders top navigation buttons and telemetry counters', () => {
    render(<TelemetryHUD />);
    expect(screen.getByText('SUBGRAPHS')).toBeInTheDocument();
    expect(screen.getByTitle('Open concept search')).toBeInTheDocument();
    expect(screen.getByText(/MASTERY/i)).toBeInTheDocument();
  });

  it('renders Restore HUD button when hudVisible is false and restores HUD on click', () => {
    useStore.getState().setHudVisibility(false);
    render(<TelemetryHUD />);

    const restoreBtn = screen.getByRole('button', { name: /RESTORE HUD/i });
    expect(restoreBtn).toBeInTheDocument();

    fireEvent.click(restoreBtn);
    expect(useStore.getState().hudVisible).toBe(true);
  });

  it('opens subgraphs panel and allows selecting a domain category, then closing it', async () => {
    render(<TelemetryHUD />);

    const subgraphsButton = screen.getByTitle('Open Subgraphs filter');
    fireEvent.click(subgraphsButton);

    await waitFor(() => {
      expect(screen.getByText('CS')).toBeInTheDocument();
    });

    const csButton = screen.getByText('CS');
    fireEvent.click(csButton);

    expect(useStore.getState().selectedCategory).toBe('CS');

    const minimizeBtn = screen.getByTitle('Minimize Subgraphs');
    fireEvent.click(minimizeBtn);
  });

  it('dynamically computes mastery score for selected subgraph category', () => {
    useStore.getState().setSelectedCategory('CS');
    render(<TelemetryHUD />);

    expect(screen.getByText(/CS MASTERY/i)).toBeInTheDocument();
  });

  it('opens search bar, updates query when typed, and closes search when X clicked', async () => {
    render(<TelemetryHUD />);

    const searchButton = screen.getByTitle('Open concept search');
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search 220+ concepts...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search 220+ concepts...');
    fireEvent.change(searchInput, { target: { value: 'Backpropagation' } });

    expect(useStore.getState().searchQuery).toBe('Backpropagation');

    const closeSearchBtn = screen.getByTitle('Close search');
    fireEvent.click(closeSearchBtn);
    expect(useStore.getState().searchQuery).toBe('');
  });

  it('expands left sidebar and switches between CONCEPTS and APPLIED tabs', () => {
    render(<TelemetryHUD />);

    // Click toggle button to expand left sidebar
    const expandButton = screen.getByLabelText('Toggle study panel');
    fireEvent.click(expandButton);

    // Find and click the APPLIED tab button
    const appliedTab = screen.getByTestId('sidebar-tab-applications');
    fireEvent.click(appliedTab);

    expect(screen.getByText(/REAL-WORLD SCENARIOS/i)).toBeInTheDocument();
  });

  it('maximizes left sidebar when clicking anywhere on the minimized panel', () => {
    render(<TelemetryHUD />);

    expect(useStore.getState().isSidebarOpen).toBe(false);

    // Click anywhere on the left study sidebar while minimized
    const sidebar = screen.getByTestId('left-study-sidebar');
    fireEvent.click(sidebar);

    expect(useStore.getState().isSidebarOpen).toBe(true);
  });

  it('clicks a topic row in left sidebar list to select and focus it', () => {
    render(<TelemetryHUD />);

    fireEvent.click(screen.getByLabelText('Toggle study panel'));

    const firstTopic = useStore.getState().topicNodes[0];
    const topicRow = screen.getByText(firstTopic.name);
    fireEvent.click(topicRow);

    expect(useStore.getState().selectedTopicId).toBe(firstTopic.id);
  });

  it('renders CONCEPTS and APPLIED tabs and verifies absence of TASKS tab', () => {
    render(<TelemetryHUD />);

    // Expand sidebar
    const expandButton = screen.getByLabelText('Toggle study panel');
    fireEvent.click(expandButton);

    // Verify CONCEPTS tab exists with node count
    const conceptsTab = screen.getByTestId('sidebar-tab-concepts');
    expect(conceptsTab).toBeInTheDocument();
    expect(conceptsTab).toHaveTextContent(/CONCEPTS/i);

    // Verify CASE STUDIES tab exists
    const appliedTab = screen.getByTestId('sidebar-tab-applications');
    expect(appliedTab).toBeInTheDocument();
    expect(appliedTab).toHaveTextContent(/CASE STUDIES/i);

    // Verify PROBLEMS tab exists
    const problemsTab = screen.getByTestId('sidebar-tab-problems');
    expect(problemsTab).toBeInTheDocument();
    expect(problemsTab).toHaveTextContent(/PROBLEMS/i);

    // Verify TASKS tab does NOT exist
    expect(screen.queryByRole('button', { name: /TASKS/i })).not.toBeInTheDocument();
  });

  it('switches between CONCEPTS and APPLIED tabs in HUD sidebar', () => {
    render(<TelemetryHUD />);

    // Expand sidebar
    fireEvent.click(screen.getByLabelText('Toggle study panel'));

    // Initially in CONCEPTS (TOPICS) tab
    expect(screen.getByTestId('sidebar-add-node-btn')).toBeInTheDocument();

    // Switch to APPLIED tab
    fireEvent.click(screen.getByTestId('sidebar-tab-applications'));
    expect(screen.getByText(/REAL-WORLD SCENARIOS/i)).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-add-node-btn')).not.toBeInTheDocument();

    // Switch back to CONCEPTS tab
    fireEvent.click(screen.getByTestId('sidebar-tab-concepts'));
    expect(screen.getByTestId('sidebar-add-node-btn')).toBeInTheDocument();
  });

  it('renders inspector card with topic metadata and without recall button', () => {
    const topic = useStore.getState().topicNodes[0];
    useStore.getState().setSelectedTopicId(topic.id);
    useStore.getState().setIsInspectorOpen(true);

    render(<TelemetryHUD />);

    expect(screen.getAllByText(new RegExp(topic.name, 'i')).length).toBeGreaterThan(0);
    expect(screen.getByText('CATEGORY')).toBeInTheDocument();
    expect(screen.getByText(topic.category)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\+10% MASTERY RECALL/i })).not.toBeInTheDocument();
  });

  it('allows navigating to unlock nodes directly from inspector', () => {
    const topic = useStore.getState().topicNodes.find((n) => n.unlocks.length > 0)!;
    useStore.getState().setSelectedTopicId(topic.id);
    useStore.getState().setIsInspectorOpen(true);

    render(<TelemetryHUD />);

    const unlockNode = useStore.getState().topicNodes.find((n) => n.id === topic.unlocks[0]);
    if (unlockNode) {
      const unlockItems = screen.getAllByText(unlockNode.name);
      fireEvent.click(unlockItems[0]);
      expect(useStore.getState().selectedTopicId).toBe(unlockNode.id);
    }
  });

  it('opens note editor when + ADD NOTE is clicked in inspector', () => {
    const topic = useStore.getState().topicNodes[0];
    useStore.getState().setSelectedTopicId(topic.id);
    useStore.getState().setIsInspectorOpen(true);

    render(<TelemetryHUD />);

    const addNoteBtn = screen.getByRole('button', { name: /\+ ADD NOTE/i });
    fireEvent.click(addNoteBtn);

    expect(useStore.getState().isNoteEditing).toBe(true);
    expect(useStore.getState().activeNote).toBeDefined();
  });

  it('opens note modal when an existing note card is clicked in inspector', () => {
    const topic = useStore.getState().topicNodes[0];
    const existingNote = topic.notes?.[0];
    expect(existingNote).toBeDefined();

    if (existingNote) {
      useStore.getState().setSelectedTopicId(topic.id);
      useStore.getState().setIsInspectorOpen(true);

      render(<TelemetryHUD />);

      const noteCard = screen.getByText(existingNote.title);
      fireEvent.click(noteCard);

      expect(useStore.getState().activeNote?.id).toBe(existingNote.id);
    }
  });

  it('closes inspector when close X button is clicked', () => {
    const topic = useStore.getState().topicNodes[0];
    useStore.getState().setSelectedTopicId(topic.id);
    useStore.getState().setIsInspectorOpen(true);

    render(<TelemetryHUD />);

    const closeBtn = screen.getByTitle('Close Inspector');
    fireEvent.click(closeBtn);

    expect(useStore.getState().isInspectorOpen).toBe(false);
  });

  describe('URL Ingest Plus-Icon Textbox', () => {
    it('renders plus icon button and opens URL input textbox on click', async () => {
      render(<TelemetryHUD />);

      const plusBtn = screen.getByTestId('ingest-url-btn');
      expect(plusBtn).toBeInTheDocument();

      fireEvent.click(plusBtn);

      await waitFor(() => {
        expect(screen.getByTestId('ingest-url-input')).toBeInTheDocument();
        expect(screen.getByTestId('ingest-url-submit-btn')).toBeInTheDocument();
      });
    });

    it('submits URL to ingestUrl when form is submitted', async () => {
      const ingestSpy = vi.spyOn(useStore.getState(), 'ingestUrl').mockResolvedValueOnce({
        status: 'success' as const,
        url: 'https://example.com/system-design',
        executedSteps: ['fetch_url' as const, 'clean_content' as const, 'extract_topics' as const, 'generate_content' as const, 'review_content' as const, 'add_to_review_queue' as const],
        message: 'Success',
        details: {} as any
      });

      render(<TelemetryHUD />);

      fireEvent.click(screen.getByTestId('ingest-url-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('ingest-url-input')).toBeInTheDocument();
      });

      const input = screen.getByTestId('ingest-url-input');
      fireEvent.change(input, { target: { value: 'https://example.com/system-design' } });

      const submitBtn = screen.getByTestId('ingest-url-submit-btn');
      fireEvent.click(submitBtn);

      expect(ingestSpy).toHaveBeenCalledWith('https://example.com/system-design');
      await waitFor(() => {
        expect(screen.getByText('Content staged to review queue!')).toBeInTheDocument();
      });
      ingestSpy.mockRestore();
    });

    it('closes URL input popover when close button is clicked', async () => {
      render(<TelemetryHUD />);

      fireEvent.click(screen.getByTestId('ingest-url-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('ingest-url-input')).toBeInTheDocument();
      });

      const closeBtn = screen.getByTitle('Close');
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByTestId('ingest-url-input')).not.toBeInTheDocument();
      });
    });
  });

  describe('Manual Node Creation and Content Editing', () => {
    it('opens CreateNodeModal when unified + button is opened and Create Node Manually is clicked', () => {
      render(<TelemetryHUD />);

      // Open the unified Add popover
      const plusBtn = screen.getByTestId('ingest-url-btn');
      fireEvent.click(plusBtn);

      const createBtn = screen.getByTestId('create-node-btn');
      expect(createBtn).toBeInTheDocument();

      fireEvent.click(createBtn);
      expect(useStore.getState().isCreateNodeOpen).toBe(true);
    });

    it('opens CreateNodeModal when sidebar CREATE NODE button is clicked', () => {
      render(<TelemetryHUD />);

      // Expand sidebar
      fireEvent.click(screen.getByLabelText('Toggle study panel'));

      const sidebarBtn = screen.getByTestId('sidebar-add-node-btn');
      expect(sidebarBtn).toBeInTheDocument();

      fireEvent.click(sidebarBtn);
      expect(useStore.getState().isCreateNodeOpen).toBe(true);
    });

    it('toggles edit mode in Inspector and updates topic metadata on save', async () => {
      const topic = useStore.getState().topicNodes[0];
      useStore.getState().setSelectedTopicId(topic.id);
      useStore.getState().setIsInspectorOpen(true);

      const updateSpy = vi.spyOn(useStore.getState(), 'updateTopicNode').mockResolvedValueOnce({
        ...topic,
        name: 'Edited Topic Name',
        summary: 'Updated summary content'
      });

      render(<TelemetryHUD />);

      // Toggle edit mode
      const editBtn = screen.getByTestId('inspector-edit-toggle-btn');
      fireEvent.click(editBtn);

      expect(screen.getByTestId('inspector-edit-form')).toBeInTheDocument();

      // Change name and summary
      const nameInput = screen.getByTestId('inspector-edit-name-input');
      fireEvent.change(nameInput, { target: { value: 'Edited Topic Name' } });

      const summaryInput = screen.getByTestId('inspector-edit-summary-input');
      fireEvent.change(summaryInput, { target: { value: 'Updated summary content' } });

      // Save
      const saveBtn = screen.getByTestId('inspector-save-topic-btn');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith(
          topic.id,
          expect.objectContaining({
            name: 'Edited Topic Name',
            summary: 'Updated summary content'
          })
        );
      });

      updateSpy.mockRestore();
    });

    it('keeps edit form open and displays error banner when updateTopicNode fails', async () => {
      const topic = useStore.getState().topicNodes[0];
      useStore.getState().setSelectedTopicId(topic.id);
      useStore.getState().setIsInspectorOpen(true);

      const updateSpy = vi.spyOn(useStore.getState(), 'updateTopicNode').mockResolvedValueOnce(undefined as any);
      useStore.setState({ error: 'Network error updating topic' });

      render(<TelemetryHUD />);

      // Toggle edit mode
      fireEvent.click(screen.getByTestId('inspector-edit-toggle-btn'));
      expect(screen.getByTestId('inspector-edit-form')).toBeInTheDocument();

      // Submit form
      fireEvent.submit(screen.getByTestId('inspector-edit-form'));

      await waitFor(() => {
        expect(screen.getByText('Network error updating topic')).toBeInTheDocument();
        expect(screen.getByTestId('inspector-edit-form')).toBeInTheDocument();
      });

      updateSpy.mockRestore();
    });

    it('allows adding and removing prerequisites directly in Inspector Edit Mode', async () => {
      const topics = useStore.getState().topicNodes;
      const mainTopic = topics[0];
      const otherTopic = topics[1];

      // Ensure mainTopic has otherTopic as prereq initially
      mainTopic.prerequisites = [otherTopic.id];
      useStore.getState().setSelectedTopicId(mainTopic.id);
      useStore.getState().setIsInspectorOpen(true);

      const removeSpy = vi.spyOn(useStore.getState(), 'removePrerequisiteEdge').mockResolvedValueOnce();
      const addSpy = vi.spyOn(useStore.getState(), 'addPrerequisiteEdge').mockResolvedValueOnce();

      render(<TelemetryHUD />);

      // Open edit mode
      fireEvent.click(screen.getByTestId('inspector-edit-toggle-btn'));

      // Remove prereq
      const removeBtn = screen.getByTestId(`remove-prereq-${otherTopic.id}`);
      fireEvent.click(removeBtn);
      expect(removeSpy).toHaveBeenCalledWith(mainTopic.id, otherTopic.id);

      // Add third topic as prereq
      const thirdTopic = topics[2];
      const addSelect = screen.getByTestId('inspector-add-prereq-select');
      fireEvent.change(addSelect, { target: { value: thirdTopic.id } });

      const linkBtn = screen.getByTestId('inspector-add-prereq-btn');
      fireEvent.click(linkBtn);
      expect(addSpy).toHaveBeenCalledWith(mainTopic.id, thirdTopic.id);

      removeSpy.mockRestore();
      addSpy.mockRestore();
    });

    it('opens dedicated confirmation modal when DELETE button is clicked and deletes on confirm', async () => {
      const topic = useStore.getState().topicNodes[0];
      useStore.getState().setSelectedTopicId(topic.id);
      useStore.getState().setIsInspectorOpen(true);

      const deleteSpy = vi.spyOn(useStore.getState(), 'deleteTopicNode').mockResolvedValueOnce();

      render(<TelemetryHUD />);

      // Open edit mode
      fireEvent.click(screen.getByTestId('inspector-edit-toggle-btn'));

      // Click delete
      const deleteBtn = screen.getByTestId('inspector-delete-topic-btn');
      fireEvent.click(deleteBtn);

      // Verify dedicated modal is shown and window.confirm was NOT used
      const modal = screen.getByTestId('delete-node-modal');
      expect(modal).toBeInTheDocument();
      expect(screen.getByText('Delete Topic Node')).toBeInTheDocument();
      expect(modal).toHaveTextContent(topic.name);

      // Click confirm delete in modal
      const confirmBtn = screen.getByTestId('confirm-delete-node-btn');
      fireEvent.click(confirmBtn);

      expect(deleteSpy).toHaveBeenCalledWith(topic.id);

      deleteSpy.mockRestore();
    });

    it('cancels deletion when cancel button in modal is clicked', async () => {
      const topic = useStore.getState().topicNodes[0];
      useStore.getState().setSelectedTopicId(topic.id);
      useStore.getState().setIsInspectorOpen(true);

      const deleteSpy = vi.spyOn(useStore.getState(), 'deleteTopicNode').mockResolvedValueOnce();

      render(<TelemetryHUD />);

      // Open edit mode and click delete
      fireEvent.click(screen.getByTestId('inspector-edit-toggle-btn'));
      fireEvent.click(screen.getByTestId('inspector-delete-topic-btn'));

      expect(screen.getByTestId('delete-node-modal')).toBeInTheDocument();

      // Click cancel inside delete modal
      const cancelBtn = screen.getByTestId('cancel-delete-node-btn');
      fireEvent.click(cancelBtn);

      await waitFor(() => {
        expect(screen.queryByTestId('delete-node-modal')).not.toBeInTheDocument();
      });
      expect(deleteSpy).not.toHaveBeenCalled();

      deleteSpy.mockRestore();
    });

    it('focuses node and dismisses modal when bold node name link is clicked in delete popup', async () => {
      const topic = useStore.getState().topicNodes[0];
      useStore.getState().setSelectedTopicId(topic.id);
      useStore.getState().setIsInspectorOpen(true);

      render(<TelemetryHUD />);

      // Open edit mode and click delete
      fireEvent.click(screen.getByTestId('inspector-edit-toggle-btn'));
      fireEvent.click(screen.getByTestId('inspector-delete-topic-btn'));

      const linkBtn = screen.getByTestId('delete-node-link');
      expect(linkBtn).toBeInTheDocument();
      expect(linkBtn).toHaveTextContent(topic.name);
      expect(linkBtn.className).toContain('font-bold');

      fireEvent.click(linkBtn);

      await waitFor(() => {
        expect(screen.queryByTestId('delete-node-modal')).not.toBeInTheDocument();
      });
      expect(useStore.getState().selectedTopicId).toBe(topic.id);
      expect(useStore.getState().isInspectorOpen).toBe(true);
    });
  });

  describe('Theme Toggle Button', () => {
    it('renders theme toggle button with correct title and switches theme on click', () => {
      useStore.getState().setTheme('dark');
      render(<TelemetryHUD />);

      const toggleBtn = screen.getByTestId('theme-toggle-btn');
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).toHaveAttribute('title', 'Switch to Light Mode [T]');

      fireEvent.click(toggleBtn);
      expect(useStore.getState().theme).toBe('light');
      expect(toggleBtn).toHaveAttribute('title', 'Switch to Dark Mode [T]');

      fireEvent.click(toggleBtn);
      expect(useStore.getState().theme).toBe('dark');
      expect(toggleBtn).toHaveAttribute('title', 'Switch to Light Mode [T]');
    });
  });

  describe('Applied Content Integration', () => {
    it('switches to APPLIED tab in sidebar and opens an application card', async () => {
      useStore.getState().setIsSidebarOpen(true);
      render(<TelemetryHUD />);

      const appliedTabBtn = screen.getByTestId('sidebar-tab-applications');
      expect(appliedTabBtn).toBeInTheDocument();
      fireEvent.click(appliedTabBtn);

      await waitFor(() => {
        expect(screen.getByText('REAL-WORLD SCENARIOS')).toBeInTheDocument();
      });

      const appCards = screen.getAllByTestId('sidebar-application-card');
      expect(appCards.length).toBeGreaterThan(0);

      fireEvent.click(appCards[0]);
      expect(useStore.getState().activeApplication).not.toBeNull();
    });

    it('displays REAL-WORLD APPLICATIONS in inspector when a topic used in an application is selected', async () => {
      const apps = useStore.getState().applications;
      const appWithTopic = apps.find((a) => a.topicIds.length > 0);
      expect(appWithTopic).toBeDefined();

      const targetTopicId = appWithTopic!.topicIds[0];
      useStore.getState().setSelectedTopicId(targetTopicId);
      useStore.getState().setIsInspectorOpen(true);

      render(<TelemetryHUD />);

      await waitFor(() => {
        expect(screen.getByText('REAL-WORLD APPLICATIONS')).toBeInTheDocument();
      });

      const appItems = screen.getAllByTestId('inspector-application-item');
      expect(appItems.length).toBeGreaterThan(0);

      fireEvent.click(appItems[0]);
      expect(useStore.getState().activeApplication).toBe(appWithTopic);
      expect(useStore.getState().isInspectorOpen).toBe(false);
      expect(useStore.getState().isSidebarOpen).toBe(false);
    });
  });

  describe('Problem Bank Integration', () => {
    it('switches to PROBLEMS tab in sidebar and opens a problem card', async () => {
      useStore.getState().setIsSidebarOpen(true);
      useStore.getState().setProblems([
        {
          id: 'PROB-TEST-1',
          title: 'Distributed Rate Limiter',
          type: 'SYSTEM_DESIGN',
          difficulty: 'HARD',
          domain: 'SYSTEMS',
          summary: 'Design a distributed rate limiter',
          targetCompanies: ['Stripe', 'Google'],
          timeLimitMinutes: 45,
          prompt: '### Prompt\nDesign a rate limiter.',
          hints: ['Token bucket algorithm'],
          solution: '### Solution\nUse Redis with token bucket.',
          starterCode: {},
          prerequisiteTopics: [],
          quizzes: []
        }
      ]);

      render(<TelemetryHUD />);

      const problemsTabBtn = screen.getByTestId('sidebar-tab-problems');
      expect(problemsTabBtn).toBeInTheDocument();
      fireEvent.click(problemsTabBtn);

      await waitFor(() => {
        expect(screen.getByText('PRACTICE PROBLEMS')).toBeInTheDocument();
      });

      const problemCards = screen.getAllByTestId('sidebar-problem-card');
      expect(problemCards.length).toBe(1);

      fireEvent.click(problemCards[0]);
      expect(useStore.getState().activeProblem?.id).toBe('PROB-TEST-1');
    });

    it('displays PRACTICE PROBLEMS in inspector when a topic linked to a problem is selected', async () => {
      const topic = useStore.getState().topicNodes[0];
      useStore.getState().setProblems([
        {
          id: 'PROB-TEST-2',
          title: 'Trapping Rain Water',
          type: 'CODING',
          difficulty: 'HARD',
          domain: 'CS',
          summary: 'Two-pointer water trapping',
          targetCompanies: ['Google', 'Meta'],
          timeLimitMinutes: 45,
          prompt: '### Prompt\nTrapping rain water.',
          hints: ['Two pointers'],
          solution: '### Solution\nTwo pointers technique.',
          starterCode: {},
          prerequisiteTopics: [topic],
          quizzes: []
        }
      ]);

      useStore.getState().setSelectedTopicId(topic.id);
      useStore.getState().setIsInspectorOpen(true);

      render(<TelemetryHUD />);

      await waitFor(() => {
        expect(screen.getByText('PRACTICE PROBLEMS')).toBeInTheDocument();
      });

      const problemItems = screen.getAllByTestId('inspector-problem-item');
      expect(problemItems.length).toBeGreaterThan(0);

      fireEvent.click(problemItems[0]);
      expect(useStore.getState().activeProblem?.id).toBe('PROB-TEST-2');
      expect(useStore.getState().isInspectorOpen).toBe(false);
      expect(useStore.getState().isSidebarOpen).toBe(false);
    });

    it('keeps a problem open while showing its selected concept in the graph inspector', () => {
      const topic = useStore.getState().topicNodes.find((node) => node.id === 'TOPIC-188')!;
      useStore.getState().setSelectedTopicId(topic.id);
      useStore.getState().setIsInspectorOpen(true);
      useStore.getState().setActiveProblem({
        id: 'PROB-FAULT-TOLERANT-WORK-QUEUE',
        title: 'Implement a Fault-Tolerant Work Queue',
        type: 'CODING',
        difficulty: 'MEDIUM',
        domain: 'SYSTEMS',
        summary: 'Keep queued work accounted for when workers fail.',
        targetCompanies: [],
        timeLimitMinutes: 45,
        prompt: 'Implement a fault-tolerant work queue.',
        hints: [],
        solution: '',
        starterCode: {},
        prerequisiteTopics: [],
        quizzes: []
      });

      render(<TelemetryHUD />);

      expect(screen.getByTestId('problem-viewer-modal')).toBeInTheDocument();
      expect(screen.getByTestId('topic-inspector')).toHaveTextContent('Thread Safety');
      expect(screen.getByTestId('topic-inspector')).toHaveClass('w-[calc(42vw-1rem)]');
      expect(screen.queryByLabelText(/concept content$/i)).not.toBeInTheDocument();
    });

    it('displays CODE REPOSITORY ANNOTATIONS in inspector when a topic linked to an annotation is selected', async () => {
      const topic = useStore.getState().topicNodes[0];
      useRepoStore.setState({
        repositories: [
          {
            id: 'REPO-1',
            owner: 'redis',
            name: 'redis',
            fullName: 'redis/redis',
            remoteUrl: 'https://github.com/redis/redis',
            defaultBranch: 'unstable',
            originType: 'GITHUB',
            isCloned: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        annotations: [
          {
            id: 'ANN-TOPIC-1',
            repositoryId: 'REPO-1',
            commitSha: 'latest',
            filePath: 'src/ae.c',
            startLine: 120,
            endLine: 145,
            title: 'Epoll Multiplexing Loop',
            content: 'Event-driven reactor core',
            anchorCodeSnippet: 'int aeProcessEvents(aeEventLoop *eventLoop) { ... }',
            designCategory: 'ARCHITECTURE',
            aiExplanation: null,
            topicId: topic.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      });

      useStore.getState().setSelectedTopicId(topic.id);
      useStore.getState().setIsInspectorOpen(true);

      render(<TelemetryHUD />);

      await waitFor(() => {
        expect(screen.getByText('CODE REPOSITORY ANNOTATIONS')).toBeInTheDocument();
      });

      expect(screen.getByText('Epoll Multiplexing Loop')).toBeInTheDocument();

      const annItems = screen.getAllByTestId('inspector-repo-annotation-item');
      expect(annItems.length).toBeGreaterThan(0);

      fireEvent.click(annItems[0]);

      await waitFor(() => {
        expect(useRepoStore.getState().isRepoViewerOpen).toBe(true);
        expect(useRepoStore.getState().activeAnnotationId).toBe('ANN-TOPIC-1');
      });
    });
  });

  describe('Manual Quiz Creation Integration', () => {
    it('opens CreateQuizModal with target node preselected when + ADD QUIZ is clicked in inspector', () => {
      const topic = useStore.getState().topicNodes[0];
      useStore.getState().setSelectedTopicId(topic.id);
      useStore.getState().setIsInspectorOpen(true);

      render(<TelemetryHUD />);

      const addQuizBtn = screen.getByTestId('add-quiz-button');
      expect(addQuizBtn).toBeInTheDocument();
      fireEvent.click(addQuizBtn);

      expect(useStore.getState().isCreateQuizOpen).toBe(true);
      expect(useStore.getState().createQuizTargetTopicId).toBe(topic.id);
    });

    it('opens CreateQuizModal when top bar plus menu "Create Quiz Manually" is clicked', async () => {
      render(<TelemetryHUD />);

      const plusBtn = screen.getByTestId('ingest-url-btn');
      fireEvent.click(plusBtn);

      await waitFor(() => {
        expect(screen.getByTestId('create-quiz-manually-btn')).toBeInTheDocument();
      });

      const createQuizBtn = screen.getByTestId('create-quiz-manually-btn');
      fireEvent.click(createQuizBtn);

      expect(useStore.getState().isCreateQuizOpen).toBe(true);
    });
  });
});




