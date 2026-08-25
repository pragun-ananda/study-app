import { describe, it, expect } from 'vitest';
import { generateBrainConnectomeNodes } from '../../src/utils/brainLayout';

describe('Brain Connectome Layout (generateBrainConnectomeNodes)', () => {
  const nodes = generateBrainConnectomeNodes();

  it('generates all 187 nodes with valid 3D coordinates', () => {
    expect(nodes.length).toBe(187);
    nodes.forEach((node) => {
      expect(node.id).toMatch(/^TOPIC-\d{3}$/);
      expect(node.coordinates.length).toBe(3);
      expect(node.coordinates.every((c) => typeof c === 'number' && !isNaN(c))).toBe(true);
    });
  });

  it('preserves reciprocal prerequisite and unlock graph integrity', () => {
    let edgeCount = 0;
    nodes.forEach((node) => {
      node.prerequisites.forEach((prereqId) => {
        edgeCount++;
        const prereqNode = nodes.find((n) => n.id === prereqId);
        expect(prereqNode).toBeDefined();
        expect(prereqNode?.unlocks).toContain(node.id);
      });

      node.unlocks.forEach((unlockId) => {
        const unlockedNode = nodes.find((n) => n.id === unlockId);
        expect(unlockedNode).toBeDefined();
        expect(unlockedNode?.prerequisites).toContain(node.id);
      });
    });

    expect(edgeCount).toBeGreaterThan(50);
  });

  it('maintains collision-free separation between all node pairs (min distance >= 3.0)', () => {
    const MIN_DISTANCE_THRESHOLD = 3.0;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const [x1, y1, z1] = nodes[i].coordinates;
        const [x2, y2, z2] = nodes[j].coordinates;
        const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
        expect(dist).toBeGreaterThanOrEqual(MIN_DISTANCE_THRESHOLD);
      }
    }
  });

  it('exhibits realistic anatomical cranial bounding envelope and dual hemispheres', () => {
    const xs = nodes.map((n) => n.coordinates[0]);
    const ys = nodes.map((n) => n.coordinates[1]);
    const zs = nodes.map((n) => n.coordinates[2]);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);

    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const spanZ = maxZ - minZ;

    // Width (X), Height (Y), Length (Z)
    expect(spanX).toBeGreaterThan(20);
    expect(spanY).toBeGreaterThan(15);
    expect(spanZ).toBeGreaterThan(25);

    // Left hemisphere nodes and right hemisphere nodes exist
    const leftNodes = nodes.filter((n) => n.coordinates[0] < -1.0);
    const rightNodes = nodes.filter((n) => n.coordinates[0] > 1.0);
    expect(leftNodes.length).toBeGreaterThan(40);
    expect(rightNodes.length).toBeGreaterThan(40);

    // MATH nodes predominantly in left hemisphere
    const mathNodes = nodes.filter((n) => n.category === 'MATH');
    const leftMathNodes = mathNodes.filter((n) => n.coordinates[0] < 0);
    expect(leftMathNodes.length / mathNodes.length).toBeGreaterThan(0.75);

    // AI & ML nodes predominantly in right hemisphere
    const aimlNodes = nodes.filter((n) => n.category === 'AI & ML');
    const rightAimlNodes = aimlNodes.filter((n) => n.coordinates[0] > 0);
    expect(rightAimlNodes.length / aimlNodes.length).toBeGreaterThan(0.75);

    // ARCH & CYBERSECURITY nodes positioned basally/inferiorly
    const archNodes = nodes.filter((n) => n.category === 'ARCH');
    const basalArchNodes = archNodes.filter((n) => n.coordinates[1] < 0);
    expect(basalArchNodes.length / archNodes.length).toBeGreaterThan(0.8);
  });
});
