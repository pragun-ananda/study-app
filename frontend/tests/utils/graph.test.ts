import { describe, it, expect } from 'vitest';
import {
  getTopologicalPrerequisites,
  calculateConnectedGraph,
  calculateOverviewFramingDistance,
  calculateNewNodeCoordinates,
  calculateTopological2DLayout
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

describe('Graph Spatial Layout: calculateNewNodeCoordinates', () => {
  it('places new node near existing category centroid with radial jitter', () => {
    const nodes: TopicNode[] = [
      { ...createMockNode('A', 'Node A'), category: 'AI & ML', coordinates: [10, 10, 0] },
      { ...createMockNode('B', 'Node B'), category: 'AI & ML', coordinates: [12, 8, 2] },
      { ...createMockNode('C', 'Node C'), category: 'CS', coordinates: [-15, -15, 0] }
    ];

    const coords = calculateNewNodeCoordinates('AI & ML', nodes);
    expect(coords).toHaveLength(3);
    expect(coords.every((c) => typeof c === 'number' && !isNaN(c) && isFinite(c))).toBe(true);

    // Centroid of AI & ML is (11, 9, 1). With jitter distance [3.5, 5.5], x should be roughly [5, 17], y in [3, 15]
    const [x, y, z] = coords;
    const distFromCentroid = Math.sqrt((x - 11) ** 2 + (y - 9) ** 2);
    expect(distFromCentroid).toBeGreaterThanOrEqual(3.0);
    expect(distFromCentroid).toBeLessThanOrEqual(6.0);
  });

  it('provides orbital coordinates when category has no existing nodes without returning NaN', () => {
    const nodes: TopicNode[] = [
      { ...createMockNode('A', 'Node A'), category: 'CS', coordinates: [10, 10, 0] }
    ];

    const coords = calculateNewNodeCoordinates('ARCH', nodes);
    expect(coords).toHaveLength(3);
    expect(coords.every((c) => typeof c === 'number' && !isNaN(c) && isFinite(c))).toBe(true);

    const [x, y] = coords;
    const radius = Math.sqrt(x * x + y * y);
    // Orbital fallback radius is 18.0
    expect(radius).toBeCloseTo(18.0, 1);
  });

  it('handles completely empty graph gracefully', () => {
    const coords = calculateNewNodeCoordinates('MATH', []);
    expect(coords).toHaveLength(3);
    expect(coords.every((c) => typeof c === 'number' && !isNaN(c) && isFinite(c))).toBe(true);
  });
});

describe('Graph 2D Topological Sort Layout: calculateTopological2DLayout', () => {
  it('returns empty result when targetId does not exist', () => {
    const result = calculateTopological2DLayout('UNKNOWN', []);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
    expect(result.needsCount).toBe(0);
    expect(result.parentsCount).toBe(0);
  });

  it('renders isolated node with CURRENT group in center', () => {
    const node = createMockNode('A', 'Node A');
    const result = calculateTopological2DLayout('A', [node]);

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('A');
    expect(result.nodes[0].group).toBe('CURRENT');
    expect(result.nodes[0].x).toBe(160); // Centered in 320px
    expect(result.edges).toHaveLength(0);
    expect(result.needsCount).toBe(0);
    expect(result.parentsCount).toBe(0);
  });

  it('correctly partitions and orders 3 groups for A -> B -> C with target B', () => {
    const nodeA = createMockNode('A', 'Node A', [], ['B']);
    const nodeB = createMockNode('B', 'Node B', ['A'], ['C']);
    const nodeC = createMockNode('C', 'Node C', ['B'], []);
    const nodes = [nodeA, nodeB, nodeC];

    const result = calculateTopological2DLayout('B', nodes);

    expect(result.needsCount).toBe(1);
    expect(result.parentsCount).toBe(1);
    expect(result.nodes).toHaveLength(3);

    const needNode = result.nodes.find((n) => n.id === 'A')!;
    const currentNode = result.nodes.find((n) => n.id === 'B')!;
    const parentNode = result.nodes.find((n) => n.id === 'C')!;

    expect(needNode.group).toBe('NEED');
    expect(needNode.step).toBe(1);
    expect(currentNode.group).toBe('CURRENT');
    expect(parentNode.group).toBe('PARENT');

    // Vertical top-down topological ordering: Needs -> Current -> Parents
    expect(needNode.y).toBeLessThan(currentNode.y);
    expect(currentNode.y).toBeLessThan(parentNode.y);

    // Edges
    expect(result.edges).toHaveLength(2);
    const edgeAB = result.edges.find((e) => e.fromId === 'A' && e.toId === 'B');
    const edgeBC = result.edges.find((e) => e.fromId === 'B' && e.toId === 'C');
    expect(edgeAB).toBeDefined();
    expect(edgeAB?.group).toBe('NEED');
    expect(edgeBC).toBeDefined();
    expect(edgeBC?.group).toBe('CURRENT');
  });

  it('correctly calculates topological layers for diamond DAG leading to target', () => {
    // A -> B, A -> C, B -> D, C -> D
    const nodeA = createMockNode('A', 'Node A', [], ['B', 'C']);
    const nodeB = createMockNode('B', 'Node B', ['A'], ['D']);
    const nodeC = createMockNode('C', 'Node C', ['A'], ['D']);
    const nodeD = createMockNode('D', 'Node D', ['B', 'C'], []);
    const nodes = [nodeA, nodeB, nodeC, nodeD];

    const result = calculateTopological2DLayout('D', nodes);

    expect(result.needsCount).toBe(3);
    expect(result.parentsCount).toBe(0);

    const aNode = result.nodes.find((n) => n.id === 'A')!;
    const bNode = result.nodes.find((n) => n.id === 'B')!;
    const cNode = result.nodes.find((n) => n.id === 'C')!;
    const dNode = result.nodes.find((n) => n.id === 'D')!;

    expect(aNode.group).toBe('NEED');
    expect(bNode.group).toBe('NEED');
    expect(cNode.group).toBe('NEED');
    expect(dNode.group).toBe('CURRENT');

    // A is root need (Layer 0)
    expect(aNode.y).toBeLessThan(bNode.y);
    expect(aNode.y).toBeLessThan(cNode.y);
    // B and C are side-by-side in Layer 1
    expect(bNode.y).toBe(cNode.y);
    expect(bNode.x).not.toBe(cNode.x);
    // D is below B and C
    expect(bNode.y).toBeLessThan(dNode.y);
  });

  it('ensures node coordinates fit within the popup width without negative margins or overflow', () => {
    const nodeA = createMockNode('A', 'Prereq 1', [], ['Target']);
    const nodeB = createMockNode('B', 'Prereq 2', [], ['Target']);
    const target = createMockNode('Target', 'Target Node', ['A', 'B'], ['Child1', 'Child2']);
    const child1 = createMockNode('Child1', 'Child 1', ['Target'], []);
    const child2 = createMockNode('Child2', 'Child 2', ['Target'], []);
    const nodes = [nodeA, nodeB, target, child1, child2];

    const result = calculateTopological2DLayout('Target', nodes);

    expect(result.width).toBe(320);
    result.nodes.forEach((n) => {
      const left = n.x - n.width / 2;
      const right = n.x + n.width / 2;
      expect(left).toBeGreaterThanOrEqual(10);
      expect(right).toBeLessThanOrEqual(310);
    });
  });
});


