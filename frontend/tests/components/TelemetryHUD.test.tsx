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

    // Click chevron to expand left sidebar
    const expandButton = screen.getByRole('button', { name: '' });
    fireEvent.click(expandButton);

    // Find and click the TASKS tab button
    const tasksTab = screen.getByRole('button', { name: /TASKS/i });
    fireEvent.click(tasksTab);

    expect(screen.getByPlaceholderText('Add new study goal...')).toBeInTheDocument();
  });

  it('adds a new todo from the HUD task panel', () => {
    render(<TelemetryHUD />);

    // Expand sidebar
    const expandButton = screen.getByRole('button', { name: '' });
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

  it('renders inspector card when a topic is selected and inspector is opened', () => {
    const topic = useStore.getState().topicNodes[0];
    useStore.getState().setSelectedTopicId(topic.id);
    useStore.getState().setIsInspectorOpen(true);

    render(<TelemetryHUD />);

    expect(screen.getAllByText(new RegExp(topic.name, 'i')).length).toBeGreaterThan(0);
    expect(screen.getByText('CATEGORY')).toBeInTheDocument();
    expect(screen.getByText(topic.category)).toBeInTheDocument();
  });
});
