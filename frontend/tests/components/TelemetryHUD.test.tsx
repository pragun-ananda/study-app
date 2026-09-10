import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import TelemetryHUD from '../../src/components/hud/TelemetryHUD';
import { useStore } from '../../src/store/useStore';

describe('TelemetryHUD Component', () => {
  beforeEach(() => {
    useStore.getState().resetState();
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

  it('expands left sidebar and switches between TOPICS and TASKS tabs', () => {
    render(<TelemetryHUD />);

    // Click toggle button to expand left sidebar
    const expandButton = screen.getByLabelText('Toggle study panel');
    fireEvent.click(expandButton);

    // Find and click the TASKS tab button
    const tasksTab = screen.getByRole('button', { name: /TASKS/i });
    fireEvent.click(tasksTab);

    expect(screen.getByPlaceholderText('Add new study goal...')).toBeInTheDocument();
  });

  it('clicks a topic row in left sidebar list to select and focus it', () => {
    render(<TelemetryHUD />);

    fireEvent.click(screen.getByLabelText('Toggle study panel'));

    const firstTopic = useStore.getState().topicNodes[0];
    const topicRow = screen.getByText(firstTopic.name);
    fireEvent.click(topicRow);

    expect(useStore.getState().selectedTopicId).toBe(firstTopic.id);
  });

  it('adds a new todo from the HUD task panel', async () => {
    render(<TelemetryHUD />);

    // Expand sidebar
    const expandButton = screen.getByLabelText('Toggle study panel');
    fireEvent.click(expandButton);

    // Switch to TASKS tab
    const tasksTab = screen.getByRole('button', { name: /TASKS/i });
    fireEvent.click(tasksTab);

    const input = screen.getByPlaceholderText('Add new study goal...');
    fireEvent.change(input, { target: { value: 'Review Vector Embeddings' } });

    // Submit form by triggering submit on input's form
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(useStore.getState().todos.some((t) => t.title === 'Review Vector Embeddings')).toBe(true);
    });
  });

  it('toggles task completion and deletes tasks from HUD', async () => {
    render(<TelemetryHUD />);

    // Expand sidebar and go to TASKS
    fireEvent.click(screen.getByLabelText('Toggle study panel'));
    fireEvent.click(screen.getByRole('button', { name: /TASKS/i }));

    const firstTodo = useStore.getState().todos[0];
    const initialCompleted = firstTodo.completed;

    // Click the toggle button for first task
    const todoTitle = screen.getByText(firstTodo.title);
    const todoCard = todoTitle.closest('div');
    const checkboxBtn = todoCard?.parentElement?.querySelector('button');
    if (checkboxBtn) fireEvent.click(checkboxBtn);

    await waitFor(() => {
      expect(useStore.getState().todos.find((t) => t.id === firstTodo.id)?.completed).toBe(!initialCompleted);
    });
  });

  it('renders inspector card and increments mastery when recall button is clicked', () => {
    const topic = useStore.getState().topicNodes[0];
    const initialMastery = topic.mastery;
    useStore.getState().setSelectedTopicId(topic.id);
    useStore.getState().setIsInspectorOpen(true);

    render(<TelemetryHUD />);

    expect(screen.getAllByText(new RegExp(topic.name, 'i')).length).toBeGreaterThan(0);
    expect(screen.getByText('CATEGORY')).toBeInTheDocument();
    expect(screen.getByText(topic.category)).toBeInTheDocument();

    const recallBtn = screen.getByRole('button', { name: /\+10% MASTERY RECALL/i });
    fireEvent.click(recallBtn);

    const updated = useStore.getState().topicNodes.find((n) => n.id === topic.id);
    expect(updated?.mastery).toBe(Math.min(100, initialMastery + 10));
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
    it('opens CreateNodeModal when header + NODE button is clicked', () => {
      render(<TelemetryHUD />);

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

    it('deletes topic from graph when DELETE button is clicked in Inspector', async () => {
      const topic = useStore.getState().topicNodes[0];
      useStore.getState().setSelectedTopicId(topic.id);
      useStore.getState().setIsInspectorOpen(true);

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const deleteSpy = vi.spyOn(useStore.getState(), 'deleteTopicNode').mockResolvedValueOnce();

      render(<TelemetryHUD />);

      // Open edit mode
      fireEvent.click(screen.getByTestId('inspector-edit-toggle-btn'));

      // Click delete
      const deleteBtn = screen.getByTestId('inspector-delete-topic-btn');
      fireEvent.click(deleteBtn);

      expect(confirmSpy).toHaveBeenCalled();
      expect(deleteSpy).toHaveBeenCalledWith(topic.id);

      confirmSpy.mockRestore();
      deleteSpy.mockRestore();
    });
  });
});



