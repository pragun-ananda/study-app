import { describe, it, expect } from 'vitest';
import {
  getTopologicalPrerequisites,
  calculateConnectedGraph,
  calculateOverviewFramingDistance
} from '../../src/utils/graph';
import { TopicNode } from '../../src/types/telemetry';

const createMockNode = (
  id: string,
  name: string,
  prerequisites: string[] = [],
  unlocks: string[] = []
): TopicNode => ({
  id,
  name,
  category: 'CS',
  mastery: 50,
  status: 'LEARNING',
  lastReviewed: '2026-08-20',
  coordinates: [0, 0, 0],
  prerequisites,
  unlocks,
  summary: `Summary of ${name}`
});

describe('Graph Algorithms: getTopologicalPrerequisites', () => {
  it('returns empty array when target node has no prerequisites', () => {
    const nodes = [createMockNode('A', 'Node A')];
    const result = getTopologicalPrerequisites('A', nodes);
    expect(result).toEqual([]);
  });

  it('correctly sorts a linear chain: A -> B -> C', () => {
    const nodeA = createMockNode('A', 'A', [], ['B']);
    const nodeB = createMockNode('B', 'B', ['A'], ['C']);
    const nodeC = createMockNode('C', 'C', ['B'], []);
    const nodes = [nodeA, nodeB, nodeC];

    const result = getTopologicalPrerequisites('C', nodes);
    expect(result.map((n) => n.id)).toEqual(['A', 'B']);
  });

  it('correctly sorts a diamond DAG leading to D: A -> B, A -> C, B -> D, C -> D', () => {
    const nodeA = createMockNode('A', 'A', [], ['B', 'C']);
    const nodeB = createMockNode('B', 'B', ['A'], ['D']);
    const nodeC = createMockNode('C', 'C', ['A'], ['D']);
    const nodeD = createMockNode('D', 'D', ['B', 'C'], []);
    const nodes = [nodeA, nodeB, nodeC, nodeD];

    const result = getTopologicalPrerequisites('D', nodes);
    const resultIds = result.map((n) => n.id);

    expect(resultIds[0]).toBe('A');
    expect(resultIds.slice(1)).toEqual(expect.arrayContaining(['B', 'C']));
    expect(resultIds).not.toContain('D');
  });

  it('handles cyclic dependencies gracefully without infinite loop', () => {
    // A -> B -> A (Cycle) leading to C with prereq B
    const nodeA = createMockNode('A', 'A', ['B'], ['B']);
    const nodeB = createMockNode('B', 'B', ['A'], ['A', 'C']);
    const nodeC = createMockNode('C', 'C', ['B'], []);
    const nodes = [nodeA, nodeB, nodeC];

    const result = getTopologicalPrerequisites('C', nodes);
    const resultIds = result.map((n) => n.id);

    expect(resultIds).toEqual(expect.arrayContaining(['A', 'B']));
    expect(resultIds).not.toContain('C');
  });

  it('handles disconnected cyclic clusters in prerequisites fallback branch', () => {
    // Target D has prereq C; C has prereqs A and B which cycle together A <-> B
    const nodeA = createMockNode('A', 'A', ['B'], ['B']);
    const nodeB = createMockNode('B', 'B', ['A'], ['A']);
    const nodeC = createMockNode('C', 'C', ['A', 'B'], ['D']);
    const nodeD = createMockNode('D', 'D', ['C'], []);
    const nodes = [nodeA, nodeB, nodeC, nodeD];

    const result = getTopologicalPrerequisites('D', nodes);
    const resultIds = result.map((n) => n.id);

    expect(resultIds).toEqual(expect.arrayContaining(['A', 'B', 'C']));
  });

  it('returns empty array when targetId does not exist in graph', () => {
    const nodes = [createMockNode('A', 'A')];
    expect(getTopologicalPrerequisites('NON_EXISTENT', nodes)).toEqual([]);
  });

  it('ignores self-referential prerequisite loops on target node', () => {
    const nodeA = createMockNode('A', 'A', ['A'], []);
    const result = getTopologicalPrerequisites('A', [nodeA]);
    expect(result).toEqual([]);
  });
});

describe('Graph Algorithms: calculateConnectedGraph', () => {
  it('returns empty result when activeId is null', () => {
    const nodes = [createMockNode('A', 'Node A')];
    const graph = calculateConnectedGraph(null, nodes);
    expect(graph.activeNode).toBeNull();
    expect(graph.connectedNodeIds.size).toBe(0);
  });

  it('correctly identifies direct and transitive upstream and downstream edges', () => {
    const nodeA = createMockNode('A', 'A', [], ['B']);
    const nodeB = createMockNode('B', 'B', ['A'], ['C']);
    const nodeC = createMockNode('C', 'C', ['B'], []);
    const nodes = [nodeA, nodeB, nodeC];

    const graph = calculateConnectedGraph('B', nodes);

    expect(graph.activeNode?.id).toBe('B');
    expect(graph.directIncomingKeys.has('A->B')).toBe(true);
    expect(graph.directOutgoingKeys.has('B->C')).toBe(true);
    expect(graph.connectedNodeIds).toEqual(new Set(['A', 'B', 'C']));
  });

  it('handles multi-hop transitive paths for upstream ancestors', () => {
    const nodeA = createMockNode('A', 'A', [], ['B']);
    const nodeB = createMockNode('B', 'B', ['A'], ['C']);
    const nodeC = createMockNode('C', 'C', ['B'], ['D']);
    const nodeD = createMockNode('D', 'D', ['C'], []);
    const nodes = [nodeA, nodeB, nodeC, nodeD];

    const graph = calculateConnectedGraph('C', nodes);

    expect(graph.directIncomingKeys.has('B->C')).toBe(true);
    expect(graph.transitiveIncomingKeys.has('A->B')).toBe(true);
    expect(graph.directOutgoingKeys.has('C->D')).toBe(true);
    expect(graph.connectedNodeIds).toEqual(new Set(['A', 'B', 'C', 'D']));
  });

  it('correctly tracks multi-hop transitive outgoing (unlock) edges', () => {
    // A -> B -> C -> D
    const nodeA = createMockNode('A', 'A', [], ['B']);
    const nodeB = createMockNode('B', 'B', ['A'], ['C']);
    const nodeC = createMockNode('C', 'C', ['B'], ['D']);
    const nodeD = createMockNode('D', 'D', ['C'], []);
    const nodes = [nodeA, nodeB, nodeC, nodeD];

    const graph = calculateConnectedGraph('A', nodes);

    expect(graph.activeNode?.id).toBe('A');
    expect(graph.directOutgoingKeys.has('A->B')).toBe(true);
    expect(graph.transitiveOutgoingKeys.has('B->C')).toBe(true);
    expect(graph.transitiveOutgoingKeys.has('C->D')).toBe(true);
    expect(graph.connectedNodeIds).toEqual(new Set(['A', 'B', 'C', 'D']));
  });

  it('handles diamond paths with overlapping direct and transitive edges', () => {
    // Node C has direct prereqs A and B, where B also has prereq A
    const nodeA = createMockNode('A', 'A', [], ['B', 'C']);
    const nodeB = createMockNode('B', 'B', ['A'], ['C']);
    const nodeC = createMockNode('C', 'C', ['A', 'B'], []);
    const nodes = [nodeA, nodeB, nodeC];

    const graph = calculateConnectedGraph('C', nodes);

    expect(graph.directIncomingKeys.has('A->C')).toBe(true);
    expect(graph.directIncomingKeys.has('B->C')).toBe(true);
    expect(graph.transitiveIncomingKeys.has('A->B')).toBe(true);
    expect(graph.connectedNodeIds).toEqual(new Set(['A', 'B', 'C']));
  });

  it('handles cyclic unlock relationships without infinite recursion', () => {
    // A -> B -> C -> A
    const nodeA = createMockNode('A', 'A', ['C'], ['B']);
    const nodeB = createMockNode('B', 'B', ['A'], ['C']);
    const nodeC = createMockNode('C', 'C', ['B'], ['A']);
    const nodes = [nodeA, nodeB, nodeC];

    const graph = calculateConnectedGraph('A', nodes);

    expect(graph.directOutgoingKeys.has('A->B')).toBe(true);
    expect(graph.transitiveOutgoingKeys.has('B->C')).toBe(true);
    expect(graph.connectedNodeIds).toEqual(new Set(['A', 'B', 'C']));
  });

  it('safely skips non-existent unlock and prerequisite node references in graph', () => {
    const nodeA = createMockNode('A', 'A', ['NON_EXISTENT_PARENT'], ['NON_EXISTENT_CHILD']);
    const graph = calculateConnectedGraph('A', [nodeA]);

    expect(graph.directIncomingKeys.has('NON_EXISTENT_PARENT->A')).toBe(true);
    expect(graph.directOutgoingKeys.has('A->NON_EXISTENT_CHILD')).toBe(true);
    expect(graph.connectedNodeIds.has('NON_EXISTENT_PARENT')).toBe(true);
    expect(graph.connectedNodeIds.has('NON_EXISTENT_CHILD')).toBe(true);
  });
});

describe('Camera Framing: calculateOverviewFramingDistance', () => {
  it('returns default distance of 56.0 when topicNodes is empty', () => {
    const result = calculateOverviewFramingDistance([]);
    expect(result).toBe(56.0);
  });

  it('calculates snug overview distance for standard node cluster (~30 unit radius)', () => {
    const nodes: TopicNode[] = [
      { ...createMockNode('A', 'Node A'), coordinates: [20, 15, 5] },
      { ...createMockNode('B', 'Node B'), coordinates: [-25, -20, 10] },
      { ...createMockNode('C', 'Node C'), coordinates: [0, 25.7, -5] }
    ];

    const distance = calculateOverviewFramingDistance(nodes, 1440, 900);
    // Should provide snug overview (~54 - 65)
    expect(distance).toBeGreaterThanOrEqual(54.0);
    expect(distance).toBeLessThanOrEqual(65.0);
  });

  it('adapts camera distance for narrow viewports to avoid horizontal cutoff', () => {
    const nodes: TopicNode[] = [
      { ...createMockNode('A', 'Left'), coordinates: [-25, 0, 0] },
      { ...createMockNode('B', 'Right'), coordinates: [25, 0, 0] }
    ];

    const wideDistance = calculateOverviewFramingDistance(nodes, 1920, 1080);
    const narrowDistance = calculateOverviewFramingDistance(nodes, 600, 1000);

    // Narrow aspect ratio requires pulling camera back further horizontally
    expect(narrowDistance).toBeGreaterThan(wideDistance);
  });

  it('enforces min and max distance bounds (54.0 <= Z <= 75.0)', () => {
    // Very tiny cluster
    const tinyNodes: TopicNode[] = [
      { ...createMockNode('A', 'Tiny'), coordinates: [0.5, 0.5, 0.5] }
    ];
    expect(calculateOverviewFramingDistance(tinyNodes, 1440, 900)).toBe(54.0);

    // Huge spread cluster
    const hugeNodes: TopicNode[] = [
      { ...createMockNode('A', 'Huge'), coordinates: [150, 150, 150] }
    ];
    expect(calculateOverviewFramingDistance(hugeNodes, 1440, 900)).toBe(75.0);
  });
});

