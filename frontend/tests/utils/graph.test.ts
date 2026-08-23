import { describe, it, expect } from 'vitest';
import { getTopologicalPrerequisites, calculateConnectedGraph } from '../../src/utils/graph';
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

  it('safely skips non-existent unlock node references in graph', () => {
    const nodeA = createMockNode('A', 'A', [], ['NON_EXISTENT_CHILD']);
    const graph = calculateConnectedGraph('A', [nodeA]);

    expect(graph.directOutgoingKeys.has('A->NON_EXISTENT_CHILD')).toBe(true);
    expect(graph.connectedNodeIds.has('NON_EXISTENT_CHILD')).toBe(true);
  });
});
