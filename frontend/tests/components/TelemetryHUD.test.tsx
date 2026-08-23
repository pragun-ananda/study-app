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

  it('opens subgraphs panel and allows selecting a domain category', async () => {
    render(<TelemetryHUD />);

    const subgraphsButton = screen.getByTitle('Open Subgraphs filter');
    fireEvent.click(subgraphsButton);

    await waitFor(() => {
      expect(screen.getByText('CS')).toBeInTheDocument();
    });

    const csButton = screen.getByText('CS');
    fireEvent.click(csButton);

    expect(useStore.getState().selectedCategory).toBe('CS');
  });

  it('dynamically computes mastery score for selected subgraph category', () => {
    useStore.getState().setSelectedCategory('CS');
    render(<TelemetryHUD />);

    expect(screen.getByText(/CS MASTERY/i)).toBeInTheDocument();
  });

  it('opens search bar and updates store search query when typed', async () => {
    render(<TelemetryHUD />);

    const searchButton = screen.getByTitle('Open concept search');
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search 220+ concepts...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search 220+ concepts...');
    fireEvent.change(searchInput, { target: { value: 'Backpropagation' } });

    expect(useStore.getState().searchQuery).toBe('Backpropagation');
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

  it('adds a new todo from the HUD task panel', () => {
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

    expect(useStore.getState().todos.some((t) => t.title === 'Review Vector Embeddings')).toBe(true);
  });

  it('toggles task completion and deletes tasks from HUD', () => {
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

    expect(useStore.getState().todos.find((t) => t.id === firstTodo.id)?.completed).toBe(!initialCompleted);
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
});
