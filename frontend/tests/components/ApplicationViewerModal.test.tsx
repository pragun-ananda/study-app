import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import ApplicationViewerModal from '../../src/components/hud/ApplicationViewerModal';
import { ApplicationSubgraph } from '../../src/components/hud/ApplicationSubgraph';
import { useStore } from '../../src/store/useStore';
import { ApplicationItem } from '../../src/types/telemetry';
import { SEED_APPLICATIONS } from '../../src/data/test/applications';

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

  it('renders OVERVIEW and QUIZ tabs when activeApplication has quizzes, and toggles between them', () => {
    const appWithQuiz: ApplicationItem = {
      ...mockApp,
      quizzes: [
        {
          id: 'QUIZ-TEST-001',
          title: 'Distributed Consensus Quiz',
          questions: [
            {
              id: 'Q-TEST-1',
              type: 'MCQ',
              prompt: 'What guarantees quorum intersection in Raft?',
              options: {
                A: 'Majority quorum (N/2 + 1)',
                B: 'Single leader lease',
                C: 'Random timeouts'
              },
              correctAnswer: 'A',
              explanation: 'Any two majorities must overlap by at least one node.'
            }
          ]
        }
      ]
    };

    useStore.getState().setActiveApplication(appWithQuiz);
    render(<ApplicationViewerModal />);

    // Tab switcher is visible
    expect(screen.getByTestId('application-tab-switcher')).toBeInTheDocument();
    const overviewTab = screen.getByTestId('application-tab-overview');
    const quizTab = screen.getByTestId('application-tab-quiz');

    expect(overviewTab).toBeInTheDocument();
    expect(quizTab).toBeInTheDocument();
    expect(screen.getByText('QUIZ (1)')).toBeInTheDocument();

    // Default tab is OVERVIEW: shows markdown content
    expect(screen.getByText('Architecture Overview')).toBeInTheDocument();
    expect(screen.queryByTestId('application-quiz-container')).not.toBeInTheDocument();

    // Click QUIZ tab
    fireEvent.click(quizTab);

    // Now QuizViewer is mounted inside the container
    expect(screen.getByTestId('application-quiz-container')).toBeInTheDocument();
    expect(screen.getByText('What guarantees quorum intersection in Raft?')).toBeInTheDocument();
    expect(screen.getByText(/Majority quorum/i)).toBeInTheDocument();

    // Switch back to OVERVIEW tab
    fireEvent.click(overviewTab);
    expect(screen.getByText('Architecture Overview')).toBeInTheDocument();
    expect(screen.queryByTestId('application-quiz-container')).not.toBeInTheDocument();
  });

  it('supports Wikipedia-style app:// navigation, pushes to history, renders back button and breadcrumbs, and navigates back', () => {
      const app1: ApplicationItem = {
        ...mockApp,
        id: 'APP-SRC-01',
        title: 'OpenAI Scaling Postgres',
        content: `Read about [Dynamo Storage](app://APP-TARGET-02) and [Consistent Hashing](concept://${useStore.getState().topicNodes[0].name}).`
      };

      const app2: ApplicationItem = {
        ...mockApp,
        id: 'APP-TARGET-02',
        title: 'Dynamo Storage Paper',
        content: `Return to [Postgres](app://APP-SRC-01).`
      };

      useStore.getState().setApplications([app1, app2]);
      useStore.getState().setActiveApplication(app1);

      render(<ApplicationViewerModal />);

      // Initially on app1
      expect(screen.getByText('OpenAI Scaling Postgres')).toBeInTheDocument();
      expect(screen.queryByTestId('application-back-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('application-breadcrumbs')).not.toBeInTheDocument();

      // Click the inline app:// link to navigate to app2
      const appLink = screen.getByTestId('wiki-link-app-APP-TARGET-02');
      fireEvent.click(appLink);

      // Now on app2
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dynamo Storage Paper');
      expect(useStore.getState().activeApplication?.id).toBe('APP-TARGET-02');

      // Back button and breadcrumbs are rendered
      const backBtn = screen.getByTestId('application-back-button');
      expect(backBtn).toBeInTheDocument();
      const breadcrumbs = screen.getByTestId('application-breadcrumbs');
      expect(breadcrumbs).toBeInTheDocument();
      expect(breadcrumbs).toHaveTextContent('OpenAI Scaling Postgres');

      // Click the Back button
      fireEvent.click(backBtn);

      // Restored back to app1
      expect(screen.getByText('OpenAI Scaling Postgres')).toBeInTheDocument();
      expect(useStore.getState().activeApplication?.id).toBe('APP-SRC-01');
      expect(screen.queryByTestId('application-back-button')).not.toBeInTheDocument();
    });

    it('selects and highlights a concept when an inline concept:// link is clicked', () => {
      const topic = useStore.getState().topicNodes[0];
      const app: ApplicationItem = {
        ...mockApp,
        topicIds: [topic.id],
        content: `Learn about [${topic.name}](concept://${topic.id}).`
      };

      useStore.getState().setApplications([app]);
      useStore.getState().setActiveApplication(app);

      render(<ApplicationViewerModal />);

      const conceptLink = screen.getByTestId(`wiki-link-concept-${topic.id}`);
      fireEvent.click(conceptLink);

      expect(useStore.getState().selectedTopicId).toBe(topic.id);
      expect(useStore.getState().isInspectorOpen).toBe(true);
    });

    it('correctly resolves B-Trees & B+ Trees and Trie links in Real-Time Autocomplete (APP-002)', () => {
      const topics = useStore.getState().topicNodes;
      const bTreeTopic = topics.find((t) => t.name.includes('B-Trees'));
      const trieTopic = topics.find((t) => t.name.includes('Trie'));
      expect(bTreeTopic).toBeDefined();
      expect(trieTopic).toBeDefined();

      const app2: ApplicationItem = {
        id: 'APP-002',
        title: 'Design a Real-Time Autocomplete / Typeahead Engine',
        type: 'INTERVIEW_PROBLEM',
        domain: 'CS',
        difficulty: 'INTERMEDIATE',
        organization: 'System Design Interview (Google / Meta)',
        readTimeMinutes: 8,
        summary: 'Architect a low-latency suggestion service.',
        topicIds: [trieTopic!.id, bTreeTopic!.id],
        content: `
A standard [Trie Prefix Trees](concept://Trie Prefix Trees) structure allows finding matching suffixes.
The permanent query-frequency log is persisted into a [B-Trees & B+ Trees](concept://B-Trees & B+ Trees) database (such as in [Scaling PostgreSQL](app://APP-005)).
`
      };

      const app5: ApplicationItem = {
        id: 'APP-005',
        title: 'Scaling PostgreSQL',
        type: 'CASE_STUDY',
        domain: 'SYSTEMS',
        difficulty: 'ADVANCED',
        organization: 'OpenAI',
        readTimeMinutes: 10,
        summary: 'OpenAI connection pooling.',
        topicIds: [bTreeTopic!.id],
        content: `PostgreSQL sharding overview.`
      };

      useStore.getState().setApplications([app2, app5]);
      useStore.getState().setActiveApplication(app2);

      render(<ApplicationViewerModal />);

      // 1. Click B-Trees & B+ Trees concept link (verifies + and & preservation)
      const bTreeBtn = screen.getByTestId('wiki-link-concept-B-Trees & B+ Trees');
      expect(bTreeBtn).toBeInTheDocument();
      fireEvent.click(bTreeBtn);

      expect(useStore.getState().selectedTopicId).toBe(bTreeTopic!.id);
      expect(useStore.getState().isInspectorOpen).toBe(true);

      // 2. Click Trie Prefix Trees concept link
      const trieBtn = screen.getByTestId('wiki-link-concept-Trie Prefix Trees');
      expect(trieBtn).toBeInTheDocument();
      fireEvent.click(trieBtn);

      expect(useStore.getState().selectedTopicId).toBe(trieTopic!.id);
      expect(useStore.getState().isInspectorOpen).toBe(true);

      // 3. Click app link to APP-005
      const app5Btn = screen.getByTestId('wiki-link-app-APP-005');
      expect(app5Btn).toBeInTheDocument();
      fireEvent.click(app5Btn);

      expect(useStore.getState().activeApplication?.id).toBe('APP-005');
    });

    it('verifies that all concept:// and app:// links across all seed applications resolve correctly', () => {
      useStore.getState().setApplications(SEED_APPLICATIONS);
      const allTopics = useStore.getState().topicNodes;

      for (const app of SEED_APPLICATIONS) {
        // Extract all concept links from content
        const conceptMatches = Array.from(
          app.content.matchAll(/\[([^\]]+)\]\((?:concept|concepts|topic|topics):\/\/([^\n\r\)]+)\)/gi)
        );

        for (const match of conceptMatches) {
          const rawTarget = decodeURIComponent(match[2]);
          // Verify that our topic matcher would find this topic
          const clean = rawTarget.trim().toLowerCase();
          const target = allTopics.find(
            (n) =>
              n.id.toLowerCase() === clean ||
              n.name.toLowerCase() === clean ||
              n.name.toLowerCase().includes(clean) ||
              clean.includes(n.name.toLowerCase()) ||
              (() => {
                const cleanTokens = clean.replace(/[^a-z0-9]/gi, ' ').split(/\s+/).filter(Boolean);
                const nodeTokens = `${n.id} ${n.name}`.toLowerCase().replace(/[^a-z0-9]/gi, ' ').split(/\s+/).filter(Boolean);
                return cleanTokens.length > 0 && cleanTokens.every((t) => nodeTokens.includes(t));
              })()
          );

          expect(
            target,
            `Expected concept link "${rawTarget}" in application "${app.id}" to resolve to a known topic node`
          ).toBeDefined();
        }

        // Extract all app links from content
        const appMatches = Array.from(
          app.content.matchAll(/\[([^\]]+)\]\((?:app|application|applications):\/\/([^\n\r\)]+)\)/gi)
        );

        for (const match of appMatches) {
          const rawTarget = decodeURIComponent(match[2]);
          const clean = rawTarget.trim().toLowerCase();
          const target = SEED_APPLICATIONS.find(
            (a: any) =>
              a.id.toLowerCase() === clean ||
              a.title.toLowerCase() === clean ||
              a.title.toLowerCase().includes(clean) ||
              clean.includes(a.id.toLowerCase())
          );

          expect(
            target,
            `Expected app link "${rawTarget}" in application "${app.id}" to resolve to a known application`
          ).toBeDefined();
        }
      }
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
