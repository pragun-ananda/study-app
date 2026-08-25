import { describe, it, expect } from 'vitest';
import { generateCelestialPlanetNodes } from '../../src/utils/celestialPlanetLayout';

describe('Perfect Geometric Sphere Layout (generateCelestialPlanetNodes)', () => {
  const nodes = generateCelestialPlanetNodes();

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

  it('maintains collision-free separation between all node pairs (min distance >= 3.2)', () => {
    const MIN_DISTANCE_THRESHOLD = 3.2;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const [x1, y1, z1] = nodes[i].coordinates;
        const [x2, y2, z2] = nodes[j].coordinates;
        const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
        expect(dist).toBeGreaterThanOrEqual(MIN_DISTANCE_THRESHOLD);
      }
    }
  });

  it('ensures every single node lies on the exact surface of a perfect sphere of radius 18.0', () => {
    const EXPECTED_RADIUS = 18.0;
    nodes.forEach((n) => {
      const [x, y, z] = n.coordinates;
      const radius = Math.sqrt(x * x + y * y + z * z);
      expect(Math.abs(radius - EXPECTED_RADIUS)).toBeLessThan(0.05);
    });
  });

  it('groups topics into contiguous continental regions by domain category', () => {
    const categories = ['MATH', 'ARCH', 'CS', 'PHYSICS', 'SYSTEMS', 'AI & ML', 'CYBERSECURITY'];
    categories.forEach((cat) => {
      const catNodes = nodes.filter((n) => n.category === cat);
      expect(catNodes.length).toBeGreaterThan(10);

      // Compute centroid of this continent
      let sx = 0, sy = 0, sz = 0;
      catNodes.forEach((n) => {
        sx += n.coordinates[0];
        sy += n.coordinates[1];
        sz += n.coordinates[2];
      });
      const avgX = sx / catNodes.length;
      const avgY = sy / catNodes.length;
      const avgZ = sz / catNodes.length;

      // Ensure nodes in this continent stay cohesive around their continental centroid
      catNodes.forEach((n) => {
        const d = Math.sqrt(
          (n.coordinates[0] - avgX) ** 2 +
          (n.coordinates[1] - avgY) ** 2 +
          (n.coordinates[2] - avgZ) ** 2
        );
        expect(d).toBeLessThan(19.0); // Sector radius bound on sphere of R=18
      });
    });
  });
});
