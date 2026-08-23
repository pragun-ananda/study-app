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
