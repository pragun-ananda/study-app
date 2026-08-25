import { describe, it, expect } from 'vitest';
import { generateSolarBeltNodes } from '../../src/utils/solarBeltLayout';

describe('3D Asteroid Field / Solar System Layout (generateSolarBeltNodes)', () => {
  const nodes = generateSolarBeltNodes();

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

  it('maintains collision-free separation between all node pairs (min distance >= 2.8)', () => {
    const MIN_DISTANCE_THRESHOLD = 2.8;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const [x1, y1, z1] = nodes[i].coordinates;
        const [x2, y2, z2] = nodes[j].coordinates;
        const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
        expect(dist).toBeGreaterThanOrEqual(MIN_DISTANCE_THRESHOLD);
      }
    }
  });

  it('distributes nodes in a compressed 3D toroidal belt around the central star (R between 4.5 and 20.0)', () => {
    nodes.forEach((n) => {
      const [x, y, z] = n.coordinates;
      const planarRadius = Math.sqrt(x * x + z * z);
      // All nodes orbit outside the central sun core (r >= 4.5) and within the compressed outer belt (r <= 20.0)
      expect(planarRadius).toBeGreaterThan(4.4);
      expect(planarRadius).toBeLessThan(20.0);

      // Toroidal vertical thickness
      expect(Math.abs(y)).toBeLessThan(5.0);
    });
  });
});
