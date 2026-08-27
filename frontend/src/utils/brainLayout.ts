import { TopicNode, DomainCategory } from '../types/telemetry';
import { DOMAIN_DATA } from '../data/test';

interface LobeDefinition {
  hemisphere: 'LEFT' | 'RIGHT' | 'BILATERAL' | 'STEM';
  baseCenter: [number, number, number]; // [x, y, z]
  semiAxes: [number, number, number]; // [rx, ry, rz]
  thetaRange: [number, number]; // Azimuthal angle [min, max] in radians
  phiRange: [number, number]; // Polar angle [min, max] in radians (0 is top/superior, PI is bottom/inferior)
  coreRatio: number; // Ratio of nodes placed in subcortical core vs outer cortical mantle
}

// Anatomical region definitions aligned with domain categories
const DOMAIN_LOBE_MAP: Record<DomainCategory, LobeDefinition> = {
  // MATH: Left Frontal & Superior Parietal (Analytical, Formal Logic, Linear Algebra)
  MATH: {
    hemisphere: 'LEFT',
    baseCenter: [-5.2, 2.5, 4.0],
    semiAxes: [6.8, 6.2, 8.5],
    thetaRange: [Math.PI * 0.55, Math.PI * 1.05],
    phiRange: [Math.PI * 0.15, Math.PI * 0.55],
    coreRatio: 0.22
  },

  // AI & ML: Right Frontal, Prefrontal & Parieto-Occipital (Pattern Synthesis, Vision, Transformers)
  'AI & ML': {
    hemisphere: 'RIGHT',
    baseCenter: [5.2, 2.5, 4.0],
    semiAxes: [6.8, 6.2, 8.5],
    thetaRange: [-Math.PI * 0.05, Math.PI * 0.45],
    phiRange: [Math.PI * 0.15, Math.PI * 0.55],
    coreRatio: 0.2
  },

  // CS: Left Temporal Lobe & Sylvian Fissure (Algorithms, Data Structures, Compilers, Languages)
  CS: {
    hemisphere: 'LEFT',
    baseCenter: [-7.8, -0.8, -1.0],
    semiAxes: [6.0, 5.5, 7.5],
    thetaRange: [Math.PI * 0.65, Math.PI * 1.15],
    phiRange: [Math.PI * 0.4, Math.PI * 0.75],
    coreRatio: 0.25
  },

  // PHYSICS: Right Temporal & Lateral Parieto-Occipital (Field Theory, Mechanics, Quantum Space)
  PHYSICS: {
    hemisphere: 'RIGHT',
    baseCenter: [7.8, -0.5, -2.5],
    semiAxes: [6.0, 5.5, 7.5],
    thetaRange: [-Math.PI * 0.25, Math.PI * 0.35],
    phiRange: [Math.PI * 0.35, Math.PI * 0.75],
    coreRatio: 0.22
  },

  // SYSTEMS: Bilateral Superior Cortex & Inter-Hemispheric Dorsal Bridge (OS, Concurrency, Distributed Fabric)
  SYSTEMS: {
    hemisphere: 'BILATERAL',
    baseCenter: [0.0, 6.8, -1.0],
    semiAxes: [7.5, 4.5, 8.0],
    thetaRange: [-Math.PI * 0.5, Math.PI * 1.5],
    phiRange: [Math.PI * 0.05, Math.PI * 0.38],
    coreRatio: 0.28
  },

  // CYBERSECURITY: Cerebellum & Defensive Limbic Core (Defensive Primitives, Cryptography, Kernel Security)
  CYBERSECURITY: {
    hemisphere: 'BILATERAL',
    baseCenter: [0.0, -4.5, -7.5],
    semiAxes: [7.2, 4.2, 5.5],
    thetaRange: [Math.PI * 0.8, Math.PI * 2.2],
    phiRange: [Math.PI * 0.58, Math.PI * 0.88],
    coreRatio: 0.25
  },

  // ARCH: Cerebellar Peduncles & Brainstem / Medulla (Hardware Primitives, Microarchitecture, CPU/GPU Pipelines)
  ARCH: {
    hemisphere: 'STEM',
    baseCenter: [0.0, -7.8, -3.2],
    semiAxes: [4.0, 5.5, 4.0],
    thetaRange: [-Math.PI, Math.PI],
    phiRange: [Math.PI * 0.65, Math.PI * 0.95],
    coreRatio: 0.35
  }
};

/**
 * Calculates biological cortical folding (Gyri ridges and Sulci grooves).
 */
function getCorticalFoldDisplacement(x: number, y: number, z: number): number {
  const r = Math.sqrt(x * x + y * y + z * z) || 1.0;
  const theta = Math.atan2(z, x);
  const phi = Math.acos(Math.max(-1, Math.min(1, y / r)));

  // Multi-harmonic biological gyri waves
  const wave1 = Math.sin(5.5 * theta) * Math.cos(4.5 * phi);
  const wave2 = Math.cos(0.65 * z + 0.3 * x) * Math.sin(0.85 * y);
  const wave3 = Math.sin(3.0 * theta + 2.0 * phi) * 0.5;

  return (wave1 * 0.65 + wave2 * 0.55 + wave3 * 0.35);
}

/**
 * Generates all 187 Topic Nodes arranged in a high-fidelity 3D Human Brain Connectome layout.
 * Strictly maintains 100% of existing topic metadata, notes, prerequisites, and unlock edges.
 */
export function generateBrainConnectomeNodes(): TopicNode[] {
  const nodes: TopicNode[] = [];
  const nameToIdMap = new Map<string, string>();
  let idCounter = 1;

  // 1. Initial Anatomical Placement
  DOMAIN_DATA.forEach((domainGroup) => {
    const category = domainGroup.category as DomainCategory;
    const lobe = DOMAIN_LOBE_MAP[category] || DOMAIN_LOBE_MAP.CS;
    const topicCount = domainGroup.topics.length;

    domainGroup.topics.forEach((topic, idx) => {
      const id = `TOPIC-${idCounter.toString().padStart(3, '0')}`;
      idCounter++;
      nameToIdMap.set(topic.name, id);

      // Deterministic golden spiral distribution across lobe surface & core
      const isCoreNode = idx < Math.floor(topicCount * lobe.coreRatio);
      const normalizedIdx = (idx + 0.5) / topicCount;

      // Golden ratio phi/theta distribution within lobe angular bounds
      const phiFrac = normalizedIdx;
      const phi = lobe.phiRange[0] + (lobe.phiRange[1] - lobe.phiRange[0]) * phiFrac;
      const theta = lobe.thetaRange[0] + (lobe.thetaRange[1] - lobe.thetaRange[0]) * ((idx * 1.61803398875) % 1.0);

      // Radial depth (Cortex shell vs Subcortical core)
      const radialFactor = isCoreNode
        ? 0.35 + (idx % 3) * 0.12
        : 0.88 + (idx % 4) * 0.05;

      // Ellipsoidal base positioning
      let lx = lobe.semiAxes[0] * Math.sin(phi) * Math.cos(theta) * radialFactor;
      let ly = lobe.semiAxes[1] * Math.cos(phi) * radialFactor;
      let lz = lobe.semiAxes[2] * Math.sin(phi) * Math.sin(theta) * radialFactor;

      // Add biological gyri / sulci surface folds for cortical mantle nodes
      if (!isCoreNode) {
        const foldOffset = getCorticalFoldDisplacement(lx, ly, lz);
        const foldScale = 0.85;
        lx += (lx / (lobe.semiAxes[0] || 1)) * foldOffset * foldScale;
        ly += (ly / (lobe.semiAxes[1] || 1)) * foldOffset * foldScale;
        lz += (lz / (lobe.semiAxes[2] || 1)) * foldOffset * foldScale;
      }

      // Translate to anatomical lobe center
      let worldX = lobe.baseCenter[0] + lx;
      let worldY = lobe.baseCenter[1] + ly;
      let worldZ = lobe.baseCenter[2] + lz;

      // 2. Specific Anatomical Structure Tuning:
      // A. Medial Sagittal Fissure (Longitudinal separation between Left & Right hemispheres)
      if (lobe.hemisphere === 'LEFT') {
        worldX = Math.min(-1.5, worldX);
      } else if (lobe.hemisphere === 'RIGHT') {
        worldX = Math.max(1.5, worldX);
      } else if (lobe.hemisphere === 'BILATERAL' && Math.abs(worldX) < 1.3) {
        // Slight bilateral bifurcation unless near corpus callosum center
        const sideSign = idx % 2 === 0 ? 1 : -1;
        worldX += sideSign * 0.8;
      }

      // B. Frontal Pole Tapering & Rounding (+Z)
      if (worldZ > 8.0) {
        const frontalRatio = (worldZ - 8.0) / 9.0;
        worldX *= 1.0 - frontalRatio * 0.22;
        worldY *= 1.0 - frontalRatio * 0.18;
      }

      // C. Occipital Pole Curvature (-Z)
      if (worldZ < -8.0) {
        const occipitalRatio = (-worldZ - 8.0) / 8.0;
        worldX *= 1.0 - occipitalRatio * 0.25;
        worldY += occipitalRatio * 0.8;
      }

      // D. Temporal Lobe Hooks (Lateral-Inferior anterior curving)
      if ((category === 'CS' || category === 'PHYSICS') && worldY < 1.0 && worldZ > -2.0) {
        const hookFactor = Math.sin((worldZ + 2.0) / 8.0 * Math.PI);
        worldX += (worldX > 0 ? 1 : -1) * hookFactor * 1.8;
        worldY -= hookFactor * 1.2;
      }

      // E. Brainstem & Medullary Stalk (Vertical tapering)
      if (lobe.hemisphere === 'STEM') {
        const stemTaper = Math.max(0, (-worldY - 3.0) / 7.0);
        worldX *= 1.0 - stemTaper * 0.45;
        worldZ = -3.2 + (stemTaper * 0.5);
      }

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
        coordinates: [Number(worldX.toFixed(2)), Number(worldY.toFixed(2)), Number(worldZ.toFixed(2))],
        prerequisites: [],
        unlocks: [],
        summary: topic.summary,
        notes: topic.notes || []
      });
    });
  });

  // 3. Force-Directed Collision Relaxation (Ensures no two nodes overlap)
  const MIN_DIST = 3.2;
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
            dx = (Math.random() - 0.5) * 0.2;
            dy = (Math.random() - 0.5) * 0.2;
            dz = (Math.random() - 0.5) * 0.2;
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
  }

  // Format coordinate values cleanly
  nodes.forEach((n) => {
    n.coordinates[0] = Number(n.coordinates[0].toFixed(2));
    n.coordinates[1] = Number(n.coordinates[1].toFixed(2));
    n.coordinates[2] = Number(n.coordinates[2].toFixed(2));
  });

  // 4. Strict Prerequisite & Unlock Graph Re-Linking
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
