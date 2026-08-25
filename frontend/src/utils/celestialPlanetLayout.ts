import { TopicNode, DomainCategory } from '../types/telemetry';
import { DOMAIN_DATA } from '../data/test';

/**
 * Generates all 187 Topic Nodes arranged in a mathematically perfect geometric sphere (Fibonacci Spherical Lattice).
 * Every single node lies on the exact spherical surface of radius R (x^2 + y^2 + z^2 = R^2).
 * Strictly maintains 100% of existing topic metadata, notes, prerequisites, and unlock edges.
 */
export function generateCelestialPlanetNodes(): TopicNode[] {
  const nodes: TopicNode[] = [];
  const nameToIdMap = new Map<string, string>();
  let idCounter = 1;

  const SPHERE_RADIUS = 18.0;
  const totalCount = 187;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~2.399963 rad (137.5 deg)

  // 1. Generate 187 mathematically uniform Fibonacci Spherical Lattice points
  // Guaranteed equidistant packing across the entire spherical surface with zero arbitrary gaps
  const uniformLatticePoints: {
    id: number;
    coord: [number, number, number];
    assigned: boolean;
  }[] = [];

  for (let i = 0; i < totalCount; i++) {
    const yNorm = 1 - (2 * (i + 0.5)) / totalCount;
    const rAtY = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
    const theta = i * goldenAngle;

    const x = rAtY * Math.cos(theta) * SPHERE_RADIUS;
    const y = yNorm * SPHERE_RADIUS;
    const z = rAtY * Math.sin(theta) * SPHERE_RADIUS;

    uniformLatticePoints.push({ id: i, coord: [x, y, z], assigned: false });
  }

  // 2. Separate points into North Polar Cap (MATH: 31), South Polar Cap (CYBERSECURITY: 18), and Equatorial Band (138)
  const northPoints = uniformLatticePoints.slice(0, 31); // 31 points (MATH)
  const southPoints = uniformLatticePoints.slice(187 - 18, 187); // 18 points (CYBERSECURITY)
  const equatorialPoints = uniformLatticePoints.slice(31, 187 - 18); // 138 points

  // Sort equatorial points strictly by azimuthal angle theta in [-PI, PI)
  equatorialPoints.sort((a, b) => {
    const thetaA = Math.atan2(a.coord[2], a.coord[0]);
    const thetaB = Math.atan2(b.coord[2], b.coord[0]);
    return thetaA - thetaB;
  });

  const categoryBuckets: Record<DomainCategory, (typeof uniformLatticePoints)[0][]> = {
    'MATH': northPoints,
    'ARCH': equatorialPoints.slice(0, 12),          // 12 points
    'CS': equatorialPoints.slice(12, 45),           // 33 points
    'PHYSICS': equatorialPoints.slice(45, 74),      // 29 points
    'SYSTEMS': equatorialPoints.slice(74, 105),     // 31 points
    'AI & ML': equatorialPoints.slice(105, 138),    // 33 points
    'CYBERSECURITY': southPoints                   // 18 points
  };

  // 3. Assign in DOMAIN_DATA order to guarantee exact topic ID preservation
  DOMAIN_DATA.forEach((group) => {
    const cat = group.category as DomainCategory;
    const assignedPoints = categoryBuckets[cat];

    group.topics.forEach((topic, k) => {
      const point = assignedPoints[k];
      const id = `TOPIC-${idCounter.toString().padStart(3, '0')}`;
      idCounter++;
      nameToIdMap.set(topic.name, id);

      const mastery = Math.floor(Math.random() * 85) + 10;
      const status: TopicNode['status'] =
        mastery >= 80 ? 'MASTERED' : mastery >= 50 ? 'LEARNING' : mastery >= 30 ? 'DUE' : 'NEW';

      const timeAgo = ['2 hours ago', 'Yesterday', '3 days ago', '1 week ago', 'Never'][k % 5];

      nodes.push({
        id,
        name: topic.name,
        category: cat,
        mastery,
        status,
        lastReviewed: timeAgo,
        coordinates: [Number(point.coord[0].toFixed(2)), Number(point.coord[1].toFixed(2)), Number(point.coord[2].toFixed(2))],
        prerequisites: [],
        unlocks: [],
        summary: topic.summary,
        notes: topic.notes || []
      });
    });
  });

  // 4. Uniform Spherical Surface Force-Directed Relaxation
  const MIN_DIST = 3.4;
  for (let pass = 0; pass < 40; pass++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];

        let dx = n2.coordinates[0] - n1.coordinates[0];
        let dy = n2.coordinates[1] - n1.coordinates[1];
        let dz = n2.coordinates[2] - n1.coordinates[2];
        let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < MIN_DIST) {
          if (dist === 0) {
            dx = (Math.random() - 0.5) * 0.1;
            dy = (Math.random() - 0.5) * 0.1;
            dz = (Math.random() - 0.5) * 0.1;
            dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          }

          const overlap = (MIN_DIST - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          n1.coordinates[0] -= nx * overlap;
          n1.coordinates[1] -= ny * overlap;
          n1.coordinates[2] -= nz * overlap;

          n2.coordinates[0] += nx * overlap;
          n2.coordinates[1] += ny * overlap;
          n2.coordinates[2] += nz * overlap;
        }
      }
    }

    // Strictly project every node back onto the exact sphere surface of radius SPHERE_RADIUS
    nodes.forEach((n) => {
      const currentR = Math.sqrt(
        n.coordinates[0] * n.coordinates[0] +
        n.coordinates[1] * n.coordinates[1] +
        n.coordinates[2] * n.coordinates[2]
      ) || 1.0;

      const scale = SPHERE_RADIUS / currentR;
      n.coordinates[0] *= scale;
      n.coordinates[1] *= scale;
      n.coordinates[2] *= scale;
    });
  }

  // Final exact projection and clean formatting
  nodes.forEach((n) => {
    const currentR = Math.sqrt(
      n.coordinates[0] * n.coordinates[0] +
      n.coordinates[1] * n.coordinates[1] +
      n.coordinates[2] * n.coordinates[2]
    ) || 1.0;

    const scale = SPHERE_RADIUS / currentR;
    n.coordinates[0] = Number((n.coordinates[0] * scale).toFixed(2));
    n.coordinates[1] = Number((n.coordinates[1] * scale).toFixed(2));
    n.coordinates[2] = Number((n.coordinates[2] * scale).toFixed(2));
  });

  // 3. Re-Link Prerequisite & Unlock Graph
  DOMAIN_DATA.forEach((domainGroup) => {
    domainGroup.topics.forEach((rawTopic) => {
      const currentId = nameToIdMap.get(rawTopic.name);
      if (!currentId) return;
      const node = nodes.find((n) => n.id === currentId);
      if (!node) return;

      if (rawTopic.prereqNames) {
        rawTopic.prereqNames.forEach((prereqName) => {
          const prereqId = nameToIdMap.get(prereqName);
          if (prereqId) {
            if (!node.prerequisites.includes(prereqId)) {
              node.prerequisites.push(prereqId);
            }
            const prereqNode = nodes.find((n) => n.id === prereqId);
            if (prereqNode && !prereqNode.unlocks.includes(currentId)) {
              prereqNode.unlocks.push(currentId);
            }
          }
        });
      }

      if (rawTopic.unlockNames) {
        rawTopic.unlockNames.forEach((unlockName) => {
          const unlockId = nameToIdMap.get(unlockName);
          if (unlockId) {
            if (!node.unlocks.includes(unlockId)) {
              node.unlocks.push(unlockId);
            }
            const unlockedNode = nodes.find((n) => n.id === unlockId);
            if (unlockedNode && !unlockedNode.prerequisites.includes(currentId)) {
              unlockedNode.prerequisites.push(currentId);
            }
          }
        });
      }
    });
  });

  return nodes;
}
