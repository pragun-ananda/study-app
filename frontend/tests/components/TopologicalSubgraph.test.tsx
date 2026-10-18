import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TopologicalSubgraph } from '../../src/components/hud/TopologicalSubgraph';
import { TopicNode } from '../../src/types/telemetry';

const createMockNode = (
  id: string,
  name: string,
  prerequisites: string[] = [],
  unlocks: string[] = [],
  mastery: number = 75
): TopicNode => ({
  id,
  name,
  category: 'CS',
  mastery,
  status: 'LEARNING',
  lastReviewed: 'Yesterday',
  coordinates: [0, 0, 0],
  prerequisites,
  unlocks,
  summary: `Summary of ${name}`
});

describe('TopologicalSubgraph Component', () => {
  const nodeA = createMockNode('A', 'Foundations A', [], ['B'], 90);
  const nodeB = createMockNode('B', 'Intermediate B', ['A'], ['C'], 60);
  const nodeC = createMockNode('C', 'Advanced C', ['B'], [], 30);
  const mockNodes = [nodeA, nodeB, nodeC];

  it('renders 2D Flow view by default with header and legend', () => {
    const handleSelect = vi.fn();
    render(
      <TopologicalSubgraph
        targetTopicId="B"
        topicNodes={mockNodes}
        onSelectTopic={handleSelect}
      />
    );

    expect(screen.getByTestId('topological-subgraph-container')).toBeInTheDocument();
    expect(screen.getByText('Topological Flow', { exact: true })).toBeInTheDocument();
    expect(screen.getByTestId('topological-mode-flow-btn')).toBeInTheDocument();
    expect(screen.getByTestId('topological-mode-list-btn')).toBeInTheDocument();

    // Check legend items
    expect(screen.getByText(/Prerequisites \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText('Current', { exact: true })).toBeInTheDocument();
    expect(screen.getByText(/Learn Next \(1\)/i)).toBeInTheDocument();

    // SVG elements
    expect(screen.getByTestId('topo-node-A')).toBeInTheDocument();
    expect(screen.getByTestId('topo-node-B')).toBeInTheDocument();
    expect(screen.getByTestId('topo-node-C')).toBeInTheDocument();
  });

  it('invokes onSelectTopic when a node is clicked in 2D Flow view', () => {
    const handleSelect = vi.fn();
    render(
      <TopologicalSubgraph
        targetTopicId="B"
        topicNodes={mockNodes}
        onSelectTopic={handleSelect}
      />
    );

    const nodeACard = screen.getByTestId('topo-node-A');
    fireEvent.click(nodeACard);
    expect(handleSelect).toHaveBeenCalledWith('A');

    const nodeCCard = screen.getByTestId('topo-node-C');
    fireEvent.click(nodeCCard);
    expect(handleSelect).toHaveBeenCalledWith('C');
  });

  it('toggles to Step List view and displays partitioned 3-group breakdown', () => {
    const handleSelect = vi.fn();
    render(
      <TopologicalSubgraph
        targetTopicId="B"
        topicNodes={mockNodes}
        onSelectTopic={handleSelect}
      />
    );

    // Switch to list mode
    fireEvent.click(screen.getByTestId('topological-mode-list-btn'));

    expect(screen.getByTestId('topological-step-list')).toBeInTheDocument();
    expect(screen.getByText(/1\. PREREQUISITES/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. CURRENT ACTIVE TOPIC/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. LEARN NEXT/i)).toBeInTheDocument();

    // Items present in list
    expect(screen.getByText('Foundations A')).toBeInTheDocument();
    expect(screen.getByText(/Intermediate B/i)).toBeInTheDocument();
    expect(screen.getByText('Advanced C')).toBeInTheDocument();

    // Clicking prerequisite in list mode selects it
    fireEvent.click(screen.getByText('Foundations A'));
    expect(handleSelect).toHaveBeenCalledWith('A');
  });

  it('displays foundational banner when topic has zero prerequisites', () => {
    const handleSelect = vi.fn();
    render(
      <TopologicalSubgraph
        targetTopicId="A"
        topicNodes={mockNodes}
        onSelectTopic={handleSelect}
      />
    );

    expect(screen.getByText(/Foundational topic \(No prior prerequisites required\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Prerequisites \(0\)/i)).toBeInTheDocument();
  });

  it('displays end of branch banner when topic has zero downstream unlocks', () => {
    const handleSelect = vi.fn();
    render(
      <TopologicalSubgraph
        targetTopicId="C"
        topicNodes={mockNodes}
        onSelectTopic={handleSelect}
      />
    );

    expect(screen.getByText(/End of branch \(No downstream topics currently unlock from this node\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Learn Next \(0\)/i)).toBeInTheDocument();
  });
});
