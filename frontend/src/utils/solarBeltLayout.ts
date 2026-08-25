import { TopicNode, DomainCategory } from '../types/telemetry';
import { DOMAIN_DATA } from '../data/test';

// Band definition for concentric 3D asteroid belts
interface OrbitBandDefinition {
  minRadius: number;
  maxRadius: number;
  heightSpread: number; // Vertical inclination variance (Y-axis)
  eccentricity: number; // Slight elliptical orbit stretch
}

// Domain categories mapped to orbital belt depths from Inner Star to Deep Space
const DOMAIN_ORBIT_MAP: Record<DomainCategory, OrbitBandDefinition> = {
  // Inner Belt (Foundational Logic & Primitives)
  MATH: { minRadius: 5.2, maxRadius: 8.8, heightSpread: 2.0, eccentricity: 0.05 },
  ARCH: { minRadius: 6.5, maxRadius: 10.2, heightSpread: 2.2, eccentricity: 0.06 },

  // Mid Belt (Core Systems, Physics & Computing)
  CS: { minRadius: 8.5, maxRadius: 12.8, heightSpread: 2.5, eccentricity: 0.07 },
  PHYSICS: { minRadius: 9.8, maxRadius: 14.2, heightSpread: 2.6, eccentricity: 0.07 },
  SYSTEMS: { minRadius: 11.2, maxRadius: 15.8, heightSpread: 2.8, eccentricity: 0.08 },

  // Outer Belt (Advanced Intelligence & Security Perimeter)
  'AI & ML': { minRadius: 13.0, maxRadius: 17.5, heightSpread: 3.0, eccentricity: 0.09 },
  CYBERSECURITY: { minRadius: 13.8, maxRadius: 18.5, heightSpread: 3.2, eccentricity: 0.1 }
};

/**
 * Generates all 187 Topic Nodes arranged in a 3D Asteroid Field / Keplerian Orbit system around a central Sun.
 * Strictly maintains 100% of existing topic metadata, notes, prerequisites, and unlock edges.
 */
export function generateSolarBeltNodes(): TopicNode[] {
  const nodes: TopicNode[] = [];
  const nameToIdMap = new Map<string, string>();
  let idCounter = 1;

  // Flatten domain topics directly in original DOMAIN_DATA order to guarantee exact ID preservation
  DOMAIN_DATA.forEach((group) => {
    const category = group.category as DomainCategory;
    const band = DOMAIN_ORBIT_MAP[category] || DOMAIN_ORBIT_MAP.CS;
    const topicCount = group.topics.length;

    group.topics.forEach((topic, idx) => {
      const id = `TOPIC-${idCounter.toString().padStart(3, '0')}`;
      idCounter++;
      nameToIdMap.set(topic.name, id);

      // Golden ratio orbital angle distribution around the star
      const angle = (idx / topicCount) * Math.PI * 2 + ((idx * 1.61803398875) % 1.0) * 0.8;

      // Radial position interpolated within category orbital band
      const radiusRatio = (idx + 0.5) / topicCount;
      const baseR = band.minRadius + (band.maxRadius - band.minRadius) * radiusRatio;

      // Vertical 3D asteroid thickness (slight sine oscillation + random height spread)
      const height = Math.sin(angle * 3.0 + idx) * band.heightSpread * 0.6 + ((idx % 5) - 2) * 0.35;

      // 3D Cartesian coordinates with slight Keplerian orbital eccentricity
      const x = Math.cos(angle) * baseR * (1.0 + band.eccentricity * Math.sin(angle));
      const y = height;
      const z = Math.sin(angle) * baseR;

      const mastery = Math.floor(Math.random() * 85) + 10;
      const status: TopicNode['status'] =
        mastery >= 80 ? 'MASTERED' : mastery >= 50 ? 'LEARNING' : mastery >= 30 ? 'DUE' : 'NEW';

      const timeAgo = ['2 hours ago', 'Yesterday', '3 days ago', '1 week ago', 'Never'][idx % 5];

      nodes.push({
        id,
        name: topic.name,
        category,
        mastery,
        status,
        lastReviewed: timeAgo,
        coordinates: [x, y, z],
        prerequisites: [],
        unlocks: [],
        summary: topic.summary,
        notes: topic.notes || []
      });
    });
  });

  // Force-Directed Collision Relaxation on the 3D Asteroid Belt
  const MIN_DIST = 2.85;
  for (let pass = 0; pass < 60; pass++) {
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

    // Keep all nodes outside the central sun radius (>= 4.6) and within the outer boundary (<= 19.5)
    nodes.forEach((n) => {
      const pr = Math.sqrt(n.coordinates[0] * n.coordinates[0] + n.coordinates[2] * n.coordinates[2]);
      if (pr < 4.6) {
        const scale = 4.6 / (pr || 1.0);
        n.coordinates[0] *= scale;
        n.coordinates[2] *= scale;
      } else if (pr > 19.5) {
        const scale = 19.5 / pr;
        n.coordinates[0] *= scale;
        n.coordinates[2] *= scale;
      }
    });
  }

  // Format clean coordinates
  nodes.forEach((n) => {
    n.coordinates[0] = Number(n.coordinates[0].toFixed(2));
    n.coordinates[1] = Number(n.coordinates[1].toFixed(2));
    n.coordinates[2] = Number(n.coordinates[2].toFixed(2));
  });

  // Re-Link Prerequisite & Unlock Graph
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
