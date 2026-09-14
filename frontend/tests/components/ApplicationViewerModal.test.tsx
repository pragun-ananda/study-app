import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import ApplicationViewerModal from '../../src/components/hud/ApplicationViewerModal';
import { ApplicationSubgraph } from '../../src/components/hud/ApplicationSubgraph';
import { useStore } from '../../src/store/useStore';
import { ApplicationItem } from '../../src/types/telemetry';

describe('ApplicationViewerModal & Subgraph Components', () => {
  beforeEach(() => {
    useStore.getState().resetState();
  });

  const mockApp: ApplicationItem = {
    id: 'APP-TEST-001',
    title: 'Distributed Consensus Case Study',
    type: 'CASE_STUDY',
    domain: 'SYSTEMS',
    difficulty: 'ADVANCED',
    organization: 'Google SRE',
    readTimeMinutes: 12,
    summary: 'A deep dive into distributed consensus in high-availability environments.',
    topicIds: ['TOPIC-001', 'TOPIC-002'],
    externalUrl: 'https://example.com/case-study',
    content: `# Architecture Overview

This is an applied systems design case study.

## Core Mechanics
- Quorum reads
- Leader election
`
  };

  it('renders nothing when activeApplication is null', () => {
    useStore.getState().setActiveApplication(null);
    const { container } = render(<ApplicationViewerModal />);
    expect(container.firstChild).toBeNull();
  });

  it('renders dual-panel view with content, badges, metadata, and subgraph roster when activeApplication is set', () => {
    useStore.getState().setActiveApplication(mockApp);
    render(<ApplicationViewerModal />);

    // Header & metadata
    expect(screen.getByText('Distributed Consensus Case Study')).toBeInTheDocument();
    expect(screen.getByText('Case Study')).toBeInTheDocument();
    expect(screen.getByText('ADVANCED')).toBeInTheDocument();
    expect(screen.getByText('SYSTEMS')).toBeInTheDocument();
    expect(screen.getByText('Google SRE')).toBeInTheDocument();
    expect(screen.getByText('12 min read')).toBeInTheDocument();

    // Executive summary lead-in
    expect(
      screen.getByText('A deep dive into distributed consensus in high-availability environments.')
    ).toBeInTheDocument();

    // Markdown content rendered
    expect(screen.getByText('Architecture Overview')).toBeInTheDocument();
    expect(screen.getByText('Core Mechanics')).toBeInTheDocument();

    // Source link
    expect(screen.getByTitle('Open original source')).toHaveAttribute(
      'href',
      'https://example.com/case-study'
    );
  });

  it('closes modal when close button is clicked', () => {
    useStore.getState().setActiveApplication(mockApp);
    render(<ApplicationViewerModal />);

    const closeBtn = screen.getByTitle('Close viewer (Esc)');
    fireEvent.click(closeBtn);

    expect(useStore.getState().activeApplication).toBeNull();
  });

  it('closes modal on Escape key press', () => {
    useStore.getState().setActiveApplication(mockApp);
    render(<ApplicationViewerModal />);

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    expect(useStore.getState().activeApplication).toBeNull();
  });

  it('allows clicking a concept card in the dual pane view to select that concept in the store', () => {
    const topics = useStore.getState().topicNodes;
    const testAppWithTopics: ApplicationItem = {
      ...mockApp,
      topicIds: [topics[0].id, topics[1].id]
    };
    useStore.getState().setActiveApplication(testAppWithTopics);
    render(<ApplicationViewerModal />);

    const firstCard = screen.getByText(topics[0].name);
    fireEvent.click(firstCard);

    expect(useStore.getState().selectedTopicId).toBe(topics[0].id);
  });

  it('opens a study note and closes the application viewer when Study Note is clicked on a concept card', () => {
    const topics = useStore.getState().topicNodes;
    // Find a topic with notes
    const topicWithNote = topics.find((t) => t.notes && t.notes.length > 0);
    expect(topicWithNote).toBeDefined();

    const testAppWithNote: ApplicationItem = {
      ...mockApp,
      topicIds: [topicWithNote!.id]
    };
    useStore.getState().setActiveApplication(testAppWithNote);
    render(<ApplicationViewerModal />);

    const studyNoteBtn = screen.getByTitle('Open concept study notes');
    expect(studyNoteBtn).toBeInTheDocument();
    fireEvent.click(studyNoteBtn);

    expect(useStore.getState().activeApplication).toBeNull();
    expect(useStore.getState().activeNote).toEqual(topicWithNote!.notes![0]);
    expect(useStore.getState().selectedTopicId).toBe(topicWithNote!.id);
  });

  describe('ApplicationSubgraph', () => {
    it('renders empty message when no topic IDs are supplied', () => {
      render(<ApplicationSubgraph topicIds={[]} />);
      expect(screen.getByText(/no concepts connected to this application yet/i)).toBeInTheDocument();
    });

    it('renders SVG subgraph with nodes and click to inspect summary', async () => {
      // Find two real topic IDs from the store
      const topics = useStore.getState().topicNodes;
      const targetIds = [topics[0].id, topics[1].id];

      render(<ApplicationSubgraph topicIds={targetIds} />);

      expect(screen.getByText(/concept subgraph/i)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(`${targetIds.length} Nodes`, 'i'))).toBeInTheDocument();

      // Click on a node in SVG
      const nodeGlyph = screen.getByText(topics[0].name.slice(0, 3).toUpperCase());
      fireEvent.click(nodeGlyph);

      // Node details should now be previewed in bottom strip
      await waitFor(() => {
        expect(screen.getByText(topics[0].name)).toBeInTheDocument();
        expect(screen.getByText(topics[0].summary)).toBeInTheDocument();
      });
    });
  });
});
