import { TopicNode } from '../types/telemetry';
import { getCategoryShade } from './theme';

export interface ConnectedGraphResult {
  activeId: string | null;
  activeNode: TopicNode | null;
  activeNodeColorHex: string | null;
  nodeMap: Map<string, TopicNode>;
  directIncomingKeys: Set<string>;
  directOutgoingKeys: Set<string>;
  transitiveIncomingKeys: Set<string>;
  transitiveOutgoingKeys: Set<string>;
  connectedNodeIds: Set<string>;
}

/**
 * Performs cycle-tolerant Kahn's Algorithm topological sort on all ancestor prerequisite
 * nodes leading up to targetId.
 */
export function getTopologicalPrerequisites(
  targetId: string,
  topicNodes: TopicNode[]
): TopicNode[] {
  const nodeMap = new Map<string, TopicNode>();
  topicNodes.forEach((node) => nodeMap.set(node.id, node));

  const targetNode = nodeMap.get(targetId);
  if (!targetNode) return [];

  // 1. Collect all ancestor node IDs (excluding targetId itself)
  const ancestorSet = new Set<string>();
  const queue = [...targetNode.prerequisites];

  while (queue.length > 0) {
    const currId = queue.shift()!;
    if (!ancestorSet.has(currId) && currId !== targetId) {
      ancestorSet.add(currId);
      const currNode = nodeMap.get(currId);
      if (currNode) {
        queue.push(...currNode.prerequisites);
      }
    }
  }

  if (ancestorSet.size === 0) return [];

  // 2. Build in-degree map for nodes within ancestorSet
  const inDegree = new Map<string, number>();
  ancestorSet.forEach((id) => inDegree.set(id, 0));

  ancestorSet.forEach((id) => {
    const node = nodeMap.get(id);
    if (node) {
      node.prerequisites.forEach((pId: string) => {
        if (ancestorSet.has(pId)) {
          inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
        }
      });
    }
  });

  // 3. Kahn's Algorithm
  const topoQueue: string[] = [];
  inDegree.forEach((degree, id) => {
    if (degree === 0) {
      topoQueue.push(id);
    }
  });

  const resultIds: string[] = [];
  while (topoQueue.length > 0) {
    const currId = topoQueue.shift()!;
    resultIds.push(currId);

    const currNode = nodeMap.get(currId);
    if (currNode) {
      currNode.unlocks.forEach((unlockId: string) => {
        if (ancestorSet.has(unlockId)) {
          const newDeg = (inDegree.get(unlockId) ?? 1) - 1;
          inDegree.set(unlockId, newDeg);
          if (newDeg === 0) {
            topoQueue.push(unlockId);
          }
        }
      });
    }
  }

  // 4. Fallback for cyclic dependencies: include any remaining unvisited ancestors
  ancestorSet.forEach((id) => {
    if (!resultIds.includes(id)) {
      resultIds.push(id);
    }
  });

  return resultIds.map((id) => nodeMap.get(id)!).filter(Boolean);
}

/**
 * Pure calculation of direct and transitive connected paths for an active node.
 * Guaranteed cycle-tolerant with visited set protection.
 */
export function calculateConnectedGraph(
  activeId: string | null,
  topicNodes: TopicNode[]
): ConnectedGraphResult {
  const nodeMap = new Map<string, TopicNode>();
  topicNodes.forEach((n) => nodeMap.set(n.id, n));

  const directIn = new Set<string>();
  const directOut = new Set<string>();
  const transIn = new Set<string>();
  const transOut = new Set<string>();
  const connectedNodeIds = new Set<string>();

  if (!activeId || !nodeMap.has(activeId)) {
    return {
      activeId,
      nodeMap,
      activeNode: null,
      activeNodeColorHex: null,
      directIncomingKeys: directIn,
      directOutgoingKeys: directOut,
      transitiveIncomingKeys: transIn,
      transitiveOutgoingKeys: transOut,
      connectedNodeIds
    };
  }

  const activeNode = nodeMap.get(activeId)!;
  const activeNodeColorHex = getCategoryShade(activeNode.id, activeNode.category);
  connectedNodeIds.add(activeId);

  // 1. Upstream Transitive Prerequisites (Ancestors)
  const ancestorQueue = [...activeNode.prerequisites];
  const visitedAncestors = new Set<string>([activeId]);

  ancestorQueue.forEach((prereqId) => {
    directIn.add(`${prereqId}->${activeId}`);
    visitedAncestors.add(prereqId);
    connectedNodeIds.add(prereqId);
  });

  let head = 0;
  while (head < ancestorQueue.length) {
    const currId = ancestorQueue[head++];
    const currNode = nodeMap.get(currId);
    if (!currNode) continue;

    currNode.prerequisites.forEach((parentPrereqId) => {
      const edgeKey = `${parentPrereqId}->${currId}`;
      if (!directIn.has(edgeKey) && !transIn.has(edgeKey)) {
        transIn.add(edgeKey);
      }
      if (!visitedAncestors.has(parentPrereqId)) {
        visitedAncestors.add(parentPrereqId);
        ancestorQueue.push(parentPrereqId);
        connectedNodeIds.add(parentPrereqId);
      }
    });
  }

  // 2. Downstream Transitive Unlocks (Descendants)
  const descendantQueue = [...activeNode.unlocks];
  const visitedDescendants = new Set<string>([activeId]);

  descendantQueue.forEach((unlockId) => {
    directOut.add(`${activeId}->${unlockId}`);
    visitedDescendants.add(unlockId);
    connectedNodeIds.add(unlockId);
  });

  head = 0;
  while (head < descendantQueue.length) {
    const currId = descendantQueue[head++];
    const currNode = nodeMap.get(currId);
    if (!currNode) continue;

    currNode.unlocks.forEach((childUnlockId) => {
      const edgeKey = `${currId}->${childUnlockId}`;
      if (!directOut.has(edgeKey) && !transOut.has(edgeKey)) {
        transOut.add(edgeKey);
      }
      if (!visitedDescendants.has(childUnlockId)) {
        visitedDescendants.add(childUnlockId);
        descendantQueue.push(childUnlockId);
        connectedNodeIds.add(childUnlockId);
      }
    });
  }

  return {
    activeId,
    activeNode,
    activeNodeColorHex,
    nodeMap,
    directIncomingKeys: directIn,
    directOutgoingKeys: directOut,
    transitiveIncomingKeys: transIn,
    transitiveOutgoingKeys: transOut,
    connectedNodeIds
  };
}

/**
 * Calculates optimal responsive camera distance so the entire 3D knowledge graph
 * fits snugly in view without clipping HUD overlays (top subgraphs bar, bottom mastery score).
 */
export function calculateOverviewFramingDistance(
  topicNodes: TopicNode[],
  viewportWidth: number = 1440,
  viewportHeight: number = 900,
  fov: number = 60
): number {
  if (!topicNodes || topicNodes.length === 0) return 56.0;

  let maxDist = 0;
  for (const n of topicNodes) {
    const [x, y, z] = n.coordinates;
    const d = Math.sqrt(x * x + y * y + z * z);
    if (d > maxDist) maxDist = d;
  }

  const paddedRadius = maxDist + 1.8;
  const aspect = viewportWidth && viewportHeight ? viewportWidth / viewportHeight : 16 / 9;
  const halfFovRad = (fov / 2) * (Math.PI / 180);
  const tanHalfFov = Math.tan(halfFovRad);

  // Provide snug headroom and footroom for top subgraphs bar and bottom mastery gauge
  const vertZ = paddedRadius / (tanHalfFov * 0.96);
  const horizZ = paddedRadius / (tanHalfFov * aspect * 0.94);

  const calculatedZ = Math.max(vertZ, horizZ);
  return Math.max(54.0, Math.min(75.0, Number(calculatedZ.toFixed(1))));
}

/**
 * Calculates responsive 3D Cartesian coordinates [x, y, z] for a newly created topic node.
 * Automatically clusters the node near existing peers in the same domain category,
 * or positions it on a radial orbit for empty / emergent categories.
 */
export function calculateNewNodeCoordinates(
  category: string,
  existingNodes: TopicNode[]
): [number, number, number] {
  const categoryNodes = existingNodes.filter((n) => n.category === category);

  if (categoryNodes.length > 0) {
    const sumX = categoryNodes.reduce((acc, n) => acc + (Number(n.coordinates[0]) || 0), 0);
    const sumY = categoryNodes.reduce((acc, n) => acc + (Number(n.coordinates[1]) || 0), 0);
    const sumZ = categoryNodes.reduce((acc, n) => acc + (Number(n.coordinates[2]) || 0), 0);

    const avgX = sumX / categoryNodes.length;
    const avgY = sumY / categoryNodes.length;
    const avgZ = sumZ / categoryNodes.length;

    // Radial jitter around cluster centroid
    const angle = Math.random() * Math.PI * 2;
    const distance = 3.5 + Math.random() * 2.0;
    const newX = avgX + Math.cos(angle) * distance;
    const newY = avgY + Math.sin(angle) * distance;
    const newZ = avgZ + (Math.random() - 0.5) * 2.5;

    return [
      Number(newX.toFixed(2)),
      Number(newY.toFixed(2)),
      Number(newZ.toFixed(2))
    ];
  }

  // Fallback for empty/emergent categories or empty graph
  const angle = Math.random() * Math.PI * 2;
  const radius = 18.0;
  const newX = Math.cos(angle) * radius;
  const newY = Math.sin(angle) * radius;
  const newZ = (Math.random() - 0.5) * 5.0;

  return [
    Number(newX.toFixed(2)),
    Number(newY.toFixed(2)),
    Number(newZ.toFixed(2))
  ];
}

export type TopologicalNodeGroup = 'NEED' | 'CURRENT' | 'PARENT';

export interface TopologicalLayoutNode {
  id: string;
  name: string;
  category: string;
  mastery: number;
  group: TopologicalNodeGroup;
  layer: number;
  step?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  node: TopicNode;
}

export interface TopologicalLayoutEdge {
  id: string;
  fromId: string;
  toId: string;
  group: TopologicalNodeGroup;
  path: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Topological2DLayoutResult {
  nodes: TopologicalLayoutNode[];
  edges: TopologicalLayoutEdge[];
  width: number;
  height: number;
  needsCount: number;
  parentsCount: number;
}

/**
 * Computes a 2-D top-down topological layout for a node's local neighborhood:
 * 1. Ancestor prerequisite nodes (Needs) flow downwards in topological rank.
 * 2. Current node sits prominently in the middle focal layer.
 * 3. Downstream parent/unlock nodes flow downward from the current node.
 * Uses bounded 2-column wrapping to ensure node cards fit comfortably in narrow popup sidebars.
 */
export function calculateTopological2DLayout(
  targetId: string,
  topicNodes: TopicNode[],
  options: {
    svgWidth?: number;
    layerGap?: number;
    nodeHeight?: number;
  } = {}
): Topological2DLayoutResult {
  const svgWidth = options.svgWidth ?? 320;
  const layerGap = options.layerGap ?? 56;
  const standardHeight = options.nodeHeight ?? 34;
  const currentHeight = standardHeight + 4;

  const nodeMap = new Map<string, TopicNode>();
  topicNodes.forEach((n) => nodeMap.set(n.id, n));

  const targetNode = nodeMap.get(targetId);
  if (!targetNode) {
    return {
      nodes: [],
      edges: [],
      width: svgWidth,
      height: 120,
      needsCount: 0,
      parentsCount: 0
    };
  }

  // 1. Ancestor Prerequisites (Needs) in Topological Order
  const ancestorPrereqs = getTopologicalPrerequisites(targetId, topicNodes);
  const ancestorIdSet = new Set(ancestorPrereqs.map((n) => n.id));

  // Compute topological rank / layer within ancestors
  const ancestorLayerMap = new Map<string, number>();
  ancestorPrereqs.forEach((node) => {
    let maxPrereqLayer = -1;
    node.prerequisites.forEach((pId) => {
      if (ancestorLayerMap.has(pId)) {
        maxPrereqLayer = Math.max(maxPrereqLayer, ancestorLayerMap.get(pId)!);
      }
    });
    ancestorLayerMap.set(node.id, maxPrereqLayer + 1);
  });

  const maxAncestorLayer = ancestorPrereqs.length > 0
    ? Math.max(...Array.from(ancestorLayerMap.values()))
    : -1;

  // 2. Current Node Layer
  const currentLayer = maxAncestorLayer + 1;

  // 3. Parent / Unlocked Nodes
  const parentIdSet = new Set<string>();
  targetNode.unlocks.forEach((uId) => parentIdSet.add(uId));
  topicNodes.forEach((node) => {
    if (node.prerequisites.includes(targetId)) {
      parentIdSet.add(node.id);
    }
  });
  // Exclude target itself and any ancestor nodes
  parentIdSet.delete(targetId);
  ancestorIdSet.forEach((aId) => parentIdSet.delete(aId));

  const parentNodes: TopicNode[] = [];
  parentIdSet.forEach((pId) => {
    const pNode = nodeMap.get(pId);
    if (pNode) parentNodes.push(pNode);
  });

  // Assign layers to parent nodes (starting from currentLayer + 1)
  const parentLayerMap = new Map<string, number>();
  parentNodes.forEach((pNode) => {
    parentLayerMap.set(pNode.id, currentLayer + 1);
  });

  for (let iter = 0; iter < parentNodes.length; iter++) {
    let changed = false;
    parentNodes.forEach((pNode) => {
      pNode.prerequisites.forEach((prereqId) => {
        if (parentIdSet.has(prereqId)) {
          const prereqLayer = parentLayerMap.get(prereqId) ?? (currentLayer + 1);
          const currL = parentLayerMap.get(pNode.id) ?? (currentLayer + 1);
          if (currL <= prereqLayer) {
            parentLayerMap.set(pNode.id, prereqLayer + 1);
            changed = true;
          }
        }
      });
    });
    if (!changed) break;
  }

  // 4. Organize nodes into layer buckets
  interface RawLayoutItem {
    node: TopicNode;
    group: TopologicalNodeGroup;
    layer: number;
    step?: number;
  }

  const layerBuckets = new Map<number, RawLayoutItem[]>();

  const addToLayer = (layer: number, item: RawLayoutItem) => {
    if (!layerBuckets.has(layer)) {
      layerBuckets.set(layer, []);
    }
    layerBuckets.get(layer)!.push(item);
  };

  ancestorPrereqs.forEach((node, idx) => {
    const l = ancestorLayerMap.get(node.id) ?? 0;
    addToLayer(l, {
      node,
      group: 'NEED',
      layer: l,
      step: idx + 1
    });
  });

  addToLayer(currentLayer, {
    node: targetNode,
    group: 'CURRENT',
    layer: currentLayer
  });

  parentNodes.forEach((node) => {
    const l = parentLayerMap.get(node.id) ?? (currentLayer + 1);
    addToLayer(l, {
      node,
      group: 'PARENT',
      layer: l
    });
  });

  // 5. Position nodes with bounded sub-row wrapping to fit within popup width
  const sortedLayers = Array.from(layerBuckets.keys()).sort((a, b) => a - b);
  const layoutNodes: TopologicalLayoutNode[] = [];
  const coordMap = new Map<string, TopologicalLayoutNode>();

  const PADDING_TOP = 24;
  const PADDING_BOTTOM = 24;
  let currentY = PADDING_TOP;

  sortedLayers.forEach((l) => {
    const items = layerBuckets.get(l)!;
    // Chunk items into rows of at most 2 nodes to avoid overcrowding in narrow popup
    const chunkSize = items.length <= 2 ? items.length : 2;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const isCurrent = chunk.some((it) => it.group === 'CURRENT');
      const h = isCurrent ? currentHeight : standardHeight;

      if (chunk.length === 1) {
        const item = chunk[0];
        const w = item.group === 'CURRENT' ? 160 : 138;
        const x = svgWidth / 2;
        const y = currentY + h / 2;
        const layoutNode: TopologicalLayoutNode = {
          id: item.node.id,
          name: item.node.name,
          category: item.node.category,
          mastery: item.node.mastery,
          group: item.group,
          layer: item.layer,
          step: item.step,
          x,
          y,
          width: w,
          height: h,
          node: item.node
        };
        layoutNodes.push(layoutNode);
        coordMap.set(item.node.id, layoutNode);
      } else {
        const w = 120;
        const col1X = 85;
        const col2X = 235;
        chunk.forEach((item, colIdx) => {
          const x = colIdx === 0 ? col1X : col2X;
          const y = currentY + h / 2;
          const layoutNode: TopologicalLayoutNode = {
            id: item.node.id,
            name: item.node.name,
            category: item.node.category,
            mastery: item.node.mastery,
            group: item.group,
            layer: item.layer,
            step: item.step,
            x,
            y,
            width: w,
            height: h,
            node: item.node
          };
          layoutNodes.push(layoutNode);
          coordMap.set(item.node.id, layoutNode);
        });
      }

      currentY += layerGap;
    }
  });

  const totalHeight = Math.max(160, currentY - layerGap + standardHeight / 2 + PADDING_BOTTOM);

  // 6. Generate Directed Edges
  const edgeList: TopologicalLayoutEdge[] = [];
  const addedEdgeKeys = new Set<string>();

  const addEdge = (fromId: string, toId: string, group: TopologicalNodeGroup) => {
    const edgeKey = `${fromId}->${toId}`;
    if (addedEdgeKeys.has(edgeKey)) return;
    addedEdgeKeys.add(edgeKey);

    const fromNode = coordMap.get(fromId);
    const toNode = coordMap.get(toId);
    if (!fromNode || !toNode) return;

    const x1 = fromNode.x;
    const y1 = fromNode.y + fromNode.height / 2;
    const x2 = toNode.x;
    const y2 = toNode.y - toNode.height / 2;

    const midY = (y1 + y2) / 2;
    const path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2 - 2}`;

    edgeList.push({
      id: edgeKey,
      fromId,
      toId,
      group,
      path,
      x1,
      y1,
      x2,
      y2
    });
  };

  // Edges within Ancestors
  ancestorPrereqs.forEach((aNode) => {
    aNode.prerequisites.forEach((pId) => {
      if (ancestorIdSet.has(pId)) {
        addEdge(pId, aNode.id, 'NEED');
      }
    });
  });

  // Edges from immediate prerequisites to Current Node
  targetNode.prerequisites.forEach((pId) => {
    if (ancestorIdSet.has(pId)) {
      addEdge(pId, targetId, 'NEED');
    }
  });

  // Edges from Current Node to Parent Nodes
  parentNodes.forEach((pNode) => {
    if (pNode.prerequisites.includes(targetId) || targetNode.unlocks.includes(pNode.id)) {
      addEdge(targetId, pNode.id, 'CURRENT');
    }
  });

  // Edges between Parent Nodes
  parentNodes.forEach((pNode) => {
    pNode.prerequisites.forEach((prereqId) => {
      if (parentIdSet.has(prereqId)) {
        addEdge(prereqId, pNode.id, 'PARENT');
      }
    });
  });

  return {
    nodes: layoutNodes,
    edges: edgeList,
    width: svgWidth,
    height: totalHeight,
    needsCount: ancestorPrereqs.length,
    parentsCount: parentNodes.length
  };
}


