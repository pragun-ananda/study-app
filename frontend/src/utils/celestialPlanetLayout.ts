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

  const categorySectorMap: Record<DomainCategory, number> = {
    'MATH': 0,          // North Polar Cap
    'ARCH': 1,          // Equatorial Wedge 0
    'CS': 2,            // Equatorial Wedge 1
    'PHYSICS': 3,       // Equatorial Wedge 2
    'SYSTEMS': 4,       // Equatorial Wedge 3
    'AI & ML': 5,       // Equatorial Wedge 4
    'CYBERSECURITY': 6  // South Polar Cap
  };

  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~2.399963 rad (137.5 deg)

  // 2. Map topics directly into 7 contiguous spherical continental sectors in DOMAIN_DATA order
  DOMAIN_DATA.forEach((group) => {
    const cat = group.category as DomainCategory;
    const sIdx = categorySectorMap[cat] ?? 1;
    const topics = group.topics;
    const N = topics.length;

    topics.forEach((topic, k) => {
      let x = 0, y = 0, z = 0;

      if (sIdx === 0) {
        // MATH: North Polar Cap
        const yNorm = 1 - (0.42 * (k + 0.5)) / N;
        const rAtY = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
        const theta = k * goldenAngle;
        x = rAtY * Math.cos(theta) * SPHERE_RADIUS;
        y = yNorm * SPHERE_RADIUS;
        z = rAtY * Math.sin(theta) * SPHERE_RADIUS;
      } else if (sIdx === 6) {
        // CYBERSECURITY: South Polar Cap
        const yNorm = -1 + (0.42 * (k + 0.5)) / N;
        const rAtY = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
        const theta = k * goldenAngle;
        x = rAtY * Math.cos(theta) * SPHERE_RADIUS;
        y = yNorm * SPHERE_RADIUS;
        z = rAtY * Math.sin(theta) * SPHERE_RADIUS;
      } else {
        // Equatorial Sectors (ARCH, CS, PHYSICS, SYSTEMS, AI & ML)
        const eqIdx = sIdx - 1; // 0 to 4
        const wedgeWidth = (2 * Math.PI) / 5;
        const baseTheta = eqIdx * wedgeWidth;

        const yNorm = 0.55 - (1.10 * (k + 0.5)) / N;
        const rAtY = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
        const subFrac = ((k * goldenAngle) / (2 * Math.PI)) % 1.0;
        const theta = baseTheta + (subFrac < 0 ? subFrac + 1.0 : subFrac) * (wedgeWidth * 0.88) + wedgeWidth * 0.06;

        x = rAtY * Math.cos(theta) * SPHERE_RADIUS;
        y = yNorm * SPHERE_RADIUS;
        z = rAtY * Math.sin(theta) * SPHERE_RADIUS;
      }

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
        coordinates: [Number(x.toFixed(2)), Number(y.toFixed(2)), Number(z.toFixed(2))],
        prerequisites: [],
        unlocks: [],
        summary: topic.summary,
        notes: topic.notes || []
      });
    });
  });

  // 5. Spherical Surface Force-Directed Smoothing (maintains strict global spherical manifold and spacing)
  const MIN_DIST = 3.2;
  for (let pass = 0; pass < 45; pass++) {
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
