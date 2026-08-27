import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Html, Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useStore } from '../../store/useStore';
import { TopicNode } from '../../types/telemetry';
import { getCategoryShade } from '../../utils/theme';
import { calculateConnectedGraph, ConnectedGraphResult } from '../../utils/graph';
import PostProcessing from './PostProcessing';
import CentralSun from './CentralSun';

// Derive distinct incoming (lighter/warmer) and outgoing (richer/electric) edge highlight shades correlated to the active node's color
const getIncomingEdgeColor = (activeColorHex: string): string => {
  const col = new THREE.Color(activeColorHex);
  const hsl = { h: 0, s: 0, l: 0 };
  col.getHSL(hsl);
  const incoming = new THREE.Color();
  incoming.setHSL((hsl.h + 0.04) % 1.0, Math.min(1.0, hsl.s * 0.9), Math.min(0.85, hsl.l + 0.22));
  return '#' + incoming.getHexString();
};

const getOutgoingEdgeColor = (activeColorHex: string): string => {
  const col = new THREE.Color(activeColorHex);
  const hsl = { h: 0, s: 0, l: 0 };
  col.getHSL(hsl);
  const outgoing = new THREE.Color();
  outgoing.setHSL((hsl.h - 0.04 + 1.0) % 1.0, Math.min(1.0, hsl.s * 1.05), Math.max(0.4, hsl.l - 0.06));
  return '#' + outgoing.getHexString();
};

// Calculate dynamic single-line font size to fit title perfectly without wrapping or extending past screen
const getSingleLineFontSize = (len: number): string => {
  if (len > 40) return 'text-[6.5px] tracking-normal';
  if (len > 30) return 'text-[7.5px] tracking-normal';
  if (len > 22) return 'text-[8.5px] tracking-wide';
  if (len > 14) return 'text-[9.5px] tracking-wider';
  return 'text-[10.5px] tracking-wider';
};

// Controller inside Canvas to manage Deep Space Fly-In intro animation timing safely
function IntroAnimationController({ introRef }: { introRef: React.MutableRefObject<number> }) {
  useFrame((_, delta) => {
    if (introRef.current < 1.0) {
      introRef.current = Math.min(1.0, introRef.current + delta * 0.45); // ~2.2s Deep Space Long-Range Swoop
    }
  });
  return null;
}

// Custom Hook: Full Transitive Connected Component Graph Traversal (Direct vs Transitive Paths)
const useConnectedGraph = (): ConnectedGraphResult => {
  const topicNodes = useStore((state) => state.topicNodes);
  const selectedTopicId = useStore((state) => state.selectedTopicId);
  const hoveredTopicId = useStore((state) => state.hoveredTopicId);

  const activeId = selectedTopicId || hoveredTopicId;

  return useMemo(() => {
    return calculateConnectedGraph(activeId, topicNodes);
  }, [topicNodes, activeId]);
};

const ConnectedGraphContext = React.createContext<ConnectedGraphResult>({
  activeId: null,
  activeNode: null,
  activeNodeColorHex: null,
  nodeMap: new Map(),
  directIncomingKeys: new Set(),
  directOutgoingKeys: new Set(),
  transitiveIncomingKeys: new Set(),
  transitiveOutgoingKeys: new Set(),
  connectedNodeIds: new Set()
});

// Shader for Solar Wind Edge Energy Flow Particles
const SolarWindShaderMaterial = {
  uniforms: {
    uTime: { value: 0 }
  },
  vertexShader: `
    uniform float uTime;
    attribute vec3 aStart;
    attribute vec3 aEnd;
    attribute float aSpeed;
    attribute float aOffset;
    attribute float aSize;
    attribute vec3 aColor;

    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      // Lerp progress along directed prerequisite vector (A -> B)
      float progress = fract(uTime * aSpeed + aOffset);
      vec3 currentPos = mix(aStart, aEnd, progress);

      vColor = aColor;

      // Soft parabolic alpha fade
      vAlpha = sin(progress * 3.14159265);

      vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      gl_PointSize = aSize * (160.0 / -mvPosition.z);
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;

      float intensity = smoothstep(0.5, 0.0, dist);
      gl_FragColor = vec4(vColor * 2.0, intensity * vAlpha * 0.95);
    }
  `
};

function SolarWindEnergyStreams() {
  const pointsRef = useRef<THREE.Points>(null!);
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const topicNodes = useStore((state) => state.topicNodes);
  const { activeId, activeNodeColorHex, nodeMap, directIncomingKeys, directOutgoingKeys, transitiveIncomingKeys, transitiveOutgoingKeys } = React.useContext(ConnectedGraphContext);

  const { starts, ends, speeds, offsets, sizes, colors, count } = useMemo(() => {
    const startList: number[] = [];
    const endList: number[] = [];
    const speedList: number[] = [];
    const offsetList: number[] = [];
    const sizeList: number[] = [];
    const colorList: number[] = [];

    const incomingCorrelatedCol = activeNodeColorHex ? new THREE.Color(getIncomingEdgeColor(activeNodeColorHex)) : null;
    const outgoingCorrelatedCol = activeNodeColorHex ? new THREE.Color(getOutgoingEdgeColor(activeNodeColorHex)) : null;

    topicNodes.forEach((source) => {
      const sourceColorHex = getCategoryShade(source.id, source.category);
      const sourceColor = new THREE.Color(sourceColorHex);

      source.unlocks.forEach((targetId) => {
        const target = nodeMap.get(targetId);
        if (target) {
          const edgeKey = `${source.id}->${target.id}`;
          const photonsPerEdge = 3;

          for (let p = 0; p < photonsPerEdge; p++) {
            startList.push(...source.coordinates);
            endList.push(...target.coordinates);

            // Deterministic hash based on edge and photon index to prevent particle teleporting on hover
            const seed = ((source.id.charCodeAt(source.id.length - 1) * 37 + target.id.charCodeAt(target.id.length - 1) * 19 + p * 13) % 1000) / 1000;
            speedList.push(0.35 + seed * 0.2);
            offsetList.push(p / photonsPerEdge + seed * 0.08);

            let col = sourceColor;
            let sz = 0.5 + seed * 0.3;

            if (activeId && activeNodeColorHex) {
              if (directOutgoingKeys.has(edgeKey)) {
                col = outgoingCorrelatedCol ?? sourceColor;
                sz = 1.1;
              } else if (directIncomingKeys.has(edgeKey)) {
                col = incomingCorrelatedCol ?? sourceColor;
                sz = 1.1;
              } else if (transitiveOutgoingKeys.has(edgeKey)) {
                col = outgoingCorrelatedCol ?? sourceColor;
                sz = 0.65;
              } else if (transitiveIncomingKeys.has(edgeKey)) {
                col = incomingCorrelatedCol ?? sourceColor;
                sz = 0.65;
              } else {
                col = sourceColor;
                sz = 0.25;
              }
            }

            sizeList.push(sz);
            colorList.push(col.r, col.g, col.b);
          }
        }
      });
    });

    return {
      starts: new Float32Array(startList),
      ends: new Float32Array(endList),
      speeds: new Float32Array(speedList),
      offsets: new Float32Array(offsetList),
      sizes: new Float32Array(sizeList),
      colors: new Float32Array(colorList),
      count: startList.length / 3
    };
  }, [topicNodes, nodeMap, activeId, activeNodeColorHex, directIncomingKeys, directOutgoingKeys, transitiveIncomingKeys, transitiveOutgoingKeys]);

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-aStart"
          count={count}
          array={starts}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aEnd"
          count={count}
          array={ends}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSpeed"
          count={count}
          array={speeds}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aOffset"
          count={count}
          array={offsets}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={count}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aColor"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        args={[SolarWindShaderMaterial]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Shader for Isotropic 360-Degree Radial Starlight Halo
const StarlightGlintShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#facc15') },
    uOpacity: { value: 0.85 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec2 vUv;

    void main() {
      // 100% isotropic radial starlight aura - completely symmetric in 360 degrees
      vec2 st = (vUv - vec2(0.5)) * 2.0;
      float dist = length(st); // 0.0 at center, 1.0 at outer edge

      if (dist >= 1.0) discard;

      float halo = exp(-dist * dist * 3.5);
      float core = exp(-dist * dist * 10.0) * 1.5;
      float glow = (halo + core) * smoothstep(1.0, 0.7, dist);

      if (glow <= 0.01) discard;

      float pulse = sin(uTime * 2.5) * 0.08 + 0.92;
      vec3 finalColor = uColor * (1.8 + core * 2.2);

      gl_FragColor = vec4(finalColor, glow * uOpacity * pulse);
    }
  `
};

const sharedPlaneGeometry = new THREE.PlaneGeometry(1, 1);

function AnamorphicStarGlint({ color, scale = 1.0, opacity = 0.95 }: { color: string; scale?: number; opacity?: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      ...StarlightGlintShaderMaterial,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }, []);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
      materialRef.current.uniforms.uOpacity.value = opacity;
      materialRef.current.uniforms.uColor.value.set(color);
    }
    if (meshRef.current) {
      // Correct world-space camera alignment regardless of parent rotation
      meshRef.current.lookAt(state.camera.position);
      const targetSize = scale * 3.8;
      meshRef.current.scale.lerp(new THREE.Vector3(targetSize, targetSize, 1), delta * 8.0);
    }
  });

  return (
    <mesh ref={meshRef} geometry={sharedPlaneGeometry} frustumCulled={false}>
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
}

// Shader for Deep Space Distant Starfield Background
const DeepSpaceShaderMaterial = {
  uniforms: {
    uTime: { value: 0 }
  },
  vertexShader: `
    uniform float uTime;
    attribute float aSize;
    attribute float aPhase;
    attribute vec3 aColor;

    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vColor = aColor;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Soft distance size attenuation with boosted point visibility
      gl_PointSize = aSize * (210.0 / -mvPosition.z);

      // Gentle deep-space twinkling
      float twinkle = sin(uTime * 1.8 + aPhase) * 0.22 + 0.78;
      vAlpha = twinkle;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;

      // Soft circular star point with crisp, brighter starlight
      float intensity = smoothstep(0.5, 0.0, dist);
      gl_FragColor = vec4(vColor * 1.35, intensity * vAlpha * 1.15);
    }
  `
};

// 3-Tier Parallax Starfield Depth Component (Far, Mid, Foreground differential motion)
function DeepSpaceStarfield() {
  const farRef = useRef<THREE.Points>(null!);
  const midRef = useRef<THREE.Points>(null!);
  const foreRef = useRef<THREE.Points>(null!);
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  // Tier 1: Far Background Stars (r = 90 - 140)
  const farData = useMemo(() => {
    const count = 3600;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const ph = new Float32Array(count);

    const palette = [new THREE.Color('#ffffff'), new THREE.Color('#fff4d6'), new THREE.Color('#ffe8a3')];

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 90.0 + Math.random() * 50.0;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const color = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;

      sz[i] = Math.random() * 0.5 + 0.25;
      ph[i] = Math.random() * Math.PI * 2;
    }
    return { positions: pos, colors: col, sizes: sz, phases: ph };
  }, []);

  // Tier 2: Mid-Ground Twinkling Stars (r = 45 - 85)
  const midData = useMemo(() => {
    const count = 1800;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const ph = new Float32Array(count);

    const palette = [new THREE.Color('#ffffff'), new THREE.Color('#fff4d6'), new THREE.Color('#ffcc00'), new THREE.Color('#ffaa44')];

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 45.0 + Math.random() * 40.0;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const color = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;

      sz[i] = Math.random() * 0.7 + 0.45;
      ph[i] = Math.random() * Math.PI * 2;
    }
    return { positions: pos, colors: col, sizes: sz, phases: ph };
  }, []);

  // Tier 3: Foreground Ambient Micro-Dust Stars (r = 18 - 40)
  const foreData = useMemo(() => {
    const count = 600;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const ph = new Float32Array(count);

    const palette = [new THREE.Color('#ffffff'), new THREE.Color('#fff4d6'), new THREE.Color('#fb923c'), new THREE.Color('#ffd066')];

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 18.0 + Math.random() * 22.0;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const color = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;

      sz[i] = Math.random() * 0.9 + 0.6;
      ph[i] = Math.random() * Math.PI * 2;
    }
    return { positions: pos, colors: col, sizes: sz, phases: ph };
  }, []);

  const farMatRef = useRef<THREE.ShaderMaterial>(null!);
  const midMatRef = useRef<THREE.ShaderMaterial>(null!);
  const foreMatRef = useRef<THREE.ShaderMaterial>(null!);

  useFrame((_, delta) => {
    if (farMatRef.current) farMatRef.current.uniforms.uTime.value += delta;
    if (midMatRef.current) midMatRef.current.uniforms.uTime.value += delta;
    if (foreMatRef.current) foreMatRef.current.uniforms.uTime.value += delta;

    // 3-Tier Parallax Differential Motion
    if (farRef.current) farRef.current.rotation.y += delta * 0.002;
    if (midRef.current) midRef.current.rotation.y += delta * 0.005;
    if (foreRef.current) foreRef.current.rotation.y += delta * 0.012;
  });

  return (
    <group>
      {/* Tier 1: Far Starfield */}
      <points ref={farRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={farData.positions.length / 3} array={farData.positions} itemSize={3} />
          <bufferAttribute attach="attributes-aColor" count={farData.colors.length / 3} array={farData.colors} itemSize={3} />
          <bufferAttribute attach="attributes-aSize" count={farData.sizes.length} array={farData.sizes} itemSize={1} />
          <bufferAttribute attach="attributes-aPhase" count={farData.phases.length} array={farData.phases} itemSize={1} />
        </bufferGeometry>
        <shaderMaterial ref={farMatRef} args={[DeepSpaceShaderMaterial]} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      {/* Tier 2: Mid-Ground Starfield */}
      <points ref={midRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={midData.positions.length / 3} array={midData.positions} itemSize={3} />
          <bufferAttribute attach="attributes-aColor" count={midData.colors.length / 3} array={midData.colors} itemSize={3} />
          <bufferAttribute attach="attributes-aSize" count={midData.sizes.length} array={midData.sizes} itemSize={1} />
          <bufferAttribute attach="attributes-aPhase" count={midData.phases.length} array={midData.phases} itemSize={1} />
        </bufferGeometry>
        <shaderMaterial ref={midMatRef} args={[DeepSpaceShaderMaterial]} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>

      {/* Tier 3: Foreground Starfield */}
      <points ref={foreRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={foreData.positions.length / 3} array={foreData.positions} itemSize={3} />
          <bufferAttribute attach="attributes-aColor" count={foreData.colors.length / 3} array={foreData.colors} itemSize={3} />
          <bufferAttribute attach="attributes-aSize" count={foreData.sizes.length} array={foreData.sizes} itemSize={1} />
          <bufferAttribute attach="attributes-aPhase" count={foreData.phases.length} array={foreData.phases} itemSize={1} />
        </bufferGeometry>
        <shaderMaterial ref={foreMatRef} args={[DeepSpaceShaderMaterial]} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

const sharedSphereGeometry = new THREE.SphereGeometry(0.38, 16, 16);
const sharedRingGeometry = new THREE.RingGeometry(0.5, 0.62, 24);

// Interactive Knowledge Node Component (Always fully formed and crisp during Deep Space Fly-In)
const KnowledgeNode = React.memo(({ node, isConnectedComponent }: { node: TopicNode; isConnectedComponent: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);

  const isSelected = useStore((state) => state.selectedTopicId === node.id);
  const isHovered = useStore((state) => state.hoveredTopicId === node.id);
  const setSelectedTopicId = useStore((state) => state.setSelectedTopicId);
  const setHoveredTopicId = useStore((state) => state.setHoveredTopicId);
  const selectedCategory = useStore((state) => state.selectedCategory);
  const searchQuery = useStore((state) => state.searchQuery);

  const isCategoryMatched = !selectedCategory || selectedCategory === 'ALL' || node.category === selectedCategory;
  const isSearchMatched = !searchQuery || node.name.toLowerCase().includes(searchQuery.toLowerCase());

  const showLabel = isSelected || isHovered || (searchQuery.length > 0 && isSearchMatched);

  const nodeColor = useMemo(() => {
    if (!isCategoryMatched || !isSearchMatched) return '#334155';
    return getCategoryShade(node.id, node.category);
  }, [node.id, node.category, isCategoryMatched, isSearchMatched]);

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 1.5;
    }
    if (meshRef.current) {
      const targetScale = isSelected ? 1.8 : isHovered ? 1.4 : isConnectedComponent ? 1.15 : 1.0;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 6.0);
    }
  });

  const handleNodeClick = (e: { stopPropagation?: () => void }) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setSelectedTopicId(node.id);
  };

  const glintScale = isSelected ? 0.85 : isHovered ? 0.70 : isConnectedComponent ? 0.52 : 0.35;
  const glintOpacity = isSelected ? 0.65 : isHovered ? 0.58 : isConnectedComponent ? 0.48 : 0.38;
  const emissiveVal = isSelected ? 1.25 : isHovered ? 1.05 : isConnectedComponent ? 0.82 : 0.65;

  return (
    <group position={node.coordinates}>
      {/* Slight Starlight Glow Halo around all topic nodes */}
      <AnamorphicStarGlint
        color={nodeColor}
        scale={glintScale}
        opacity={glintOpacity}
      />

      <mesh
        ref={meshRef}
        geometry={sharedSphereGeometry}
        frustumCulled={false}
        onClick={handleNodeClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredTopicId(node.id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHoveredTopicId(null);
          document.body.style.cursor = 'auto';
        }}
      >
        <meshStandardMaterial
          color={nodeColor}
          emissive={nodeColor}
          emissiveIntensity={emissiveVal}
          roughness={0.2}
          metalness={0.8}
          transparent={!isCategoryMatched || !isSearchMatched}
          opacity={!isCategoryMatched || !isSearchMatched ? 0.2 : 1.0}
        />
      </mesh>

      {/* Orbital ring for hovered or selected node */}
      {(isSelected || isHovered) && (
        <mesh ref={ringRef} geometry={sharedRingGeometry} frustumCulled={false}>
          <meshBasicMaterial color={nodeColor} side={THREE.DoubleSide} transparent opacity={0.85} />
        </mesh>
      )}

      {/* Well-Sized Single-Line HTML Label Tag (Never wraps, never cuts off) */}
      {showLabel && (
        <Html
          position={[0, 0.65, 0]}
          center
          distanceFactor={24}
          zIndexRange={[100, 0]}
          className="pointer-events-auto select-none cursor-pointer"
        >
          <div
            onClick={handleNodeClick}
            style={{
              backgroundColor: isSelected || isHovered ? nodeColor : undefined,
              borderColor: nodeColor,
              boxShadow: isSelected || isHovered ? `0 0 16px ${nodeColor}80` : undefined
            }}
            className={`px-2 py-0.5 rounded font-mono font-bold transition-all whitespace-nowrap overflow-hidden text-ellipsis shadow-lg ${getSingleLineFontSize(
              node.name.length
            )} ${
              isSelected || isHovered
                ? 'text-slate-950 border border-transparent scale-105'
                : 'text-slate-200 bg-slate-950/90 border border-white/20'
            }`}
          >
            {node.name}
          </div>
        </Html>
      )}
    </group>
  );
});

// Render 3D Directed Prerequisite & Unlocked Edges
function KnowledgeGraphEdges() {
  const topicNodes = useStore((state) => state.topicNodes);
  const { activeId, activeNodeColorHex, nodeMap, directIncomingKeys, directOutgoingKeys, transitiveIncomingKeys, transitiveOutgoingKeys } = React.useContext(ConnectedGraphContext);

  const edges = useMemo(() => {
    const edgeList: {
      start: [number, number, number];
      end: [number, number, number];
      color: string;
      lineWidth: number;
      baseOpacity: number;
    }[] = [];

    const visited = new Set<string>();

    const incomingCorrelatedCol = activeNodeColorHex ? getIncomingEdgeColor(activeNodeColorHex) : '#facc15';
    const outgoingCorrelatedCol = activeNodeColorHex ? getOutgoingEdgeColor(activeNodeColorHex) : '#f97316';

    topicNodes.forEach((source) => {
      source.unlocks.forEach((targetId) => {
        const target = nodeMap.get(targetId);
        if (target) {
          const key = `${source.id}->${target.id}`;
          if (!visited.has(key)) {
            visited.add(key);

            let color = 'rgba(254, 215, 170, 0.14)';
            let lineWidth = 0.7;
            let baseOpacity = 0.14;

            if (activeId && activeNodeColorHex) {
              if (directOutgoingKeys.has(key)) {
                color = outgoingCorrelatedCol;
                lineWidth = 2.8;
                baseOpacity = 0.98;
              } else if (directIncomingKeys.has(key)) {
                color = incomingCorrelatedCol;
                lineWidth = 2.8;
                baseOpacity = 0.98;
              } else if (transitiveOutgoingKeys.has(key)) {
                color = outgoingCorrelatedCol;
                lineWidth = 1.35;
                baseOpacity = 0.42;
              } else if (transitiveIncomingKeys.has(key)) {
                color = incomingCorrelatedCol;
                lineWidth = 1.35;
                baseOpacity = 0.42;
              }
            }

            edgeList.push({
              start: source.coordinates,
              end: target.coordinates,
              color,
              lineWidth,
              baseOpacity
            });
          }
        }
      });
    });

    return edgeList;
  }, [topicNodes, nodeMap, activeId, activeNodeColorHex, directIncomingKeys, directOutgoingKeys, transitiveIncomingKeys, transitiveOutgoingKeys]);

  return (
    <group>
      {edges.map((edge, idx) => (
        <Line
          key={idx}
          points={[edge.start, edge.end]}
          color={edge.color}
          lineWidth={edge.lineWidth}
          transparent
          opacity={edge.baseOpacity}
        />
      ))}
    </group>
  );
}

// Camera Rig: Deep Space Hyper-Drive Fly-In Swoop and cinematic node zoom
const Y_AXIS = new THREE.Vector3(0, 1, 0);

function CameraRig({
  controlsRef,
  introRef,
  orbitRef
}: {
  controlsRef: React.RefObject<OrbitControlsImpl>;
  introRef: React.MutableRefObject<number>;
  orbitRef: React.MutableRefObject<number>;
}) {
  const { camera } = useThree();
  const topicNodes = useStore((state) => state.topicNodes);
  const selectedTopicId = useStore((state) => state.selectedTopicId);

  const prevSelectedId = useRef<string | null>(null);
  const isAnimating = useRef<boolean>(false);

  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const camTargetPos = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (selectedTopicId !== prevSelectedId.current) {
      prevSelectedId.current = selectedTopicId;
      isAnimating.current = true;
    }
  }, [selectedTopicId]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // 1. Deep Space Hyper-Drive Swoop Sequence on page load/refresh (Starts at z = 450.0, lands at z = 48.0)
    if (introRef.current < 1.0) {
      const t = Math.min(1.0, introRef.current);
      const easedT = 1 - Math.pow(1 - t, 4); // Quartic Ease Out for hyper-drive deceleration

      const targetZ = 48.0;
      const startZ = 450.0;
      const currentZ = THREE.MathUtils.lerp(startZ, targetZ, easedT);

      camera.position.set(0, 0, currentZ);
      controls.target.set(0, 0, 0);
      controls.update();
      return;
    }

    // 2. Interactive Selection lerp (Close-up detail framing zoom into selected node)
    if (isAnimating.current) {
      const selectedNode = topicNodes.find((n) => n.id === selectedTopicId);

      if (selectedNode) {
        // Calculate exact 3D world position of the node in the rotating group using Three.js axis-angle transform
        const [nx, ny, nz] = selectedNode.coordinates;
        targetPos.set(nx, ny, nz).applyAxisAngle(Y_AXIS, orbitRef.current);

        const titleLen = selectedNode.name.length;
        const distOffset = titleLen > 30 ? 6.5 : titleLen > 20 ? 5.2 : 4.0;

        // Position camera directly along the outward radial vector from Sun through node to camera
        const radialDir = targetPos.clone().normalize();
        camTargetPos.copy(targetPos).addScaledVector(radialDir, distOffset);

        controls.target.lerp(targetPos, delta * 6.0);
        camera.position.lerp(camTargetPos, delta * 6.0);
        controls.update();

        if (controls.target.distanceTo(targetPos) < 0.02 && camera.position.distanceTo(camTargetPos) < 0.05) {
          controls.target.copy(targetPos);
          camera.position.copy(camTargetPos);
          controls.update();
          isAnimating.current = false;
        }
      } else {
        // Zoom out to homepage full spherical graph overview centered on Sun
        targetPos.set(0, 0, 0);
        camTargetPos.set(0, 0, 48.0);

        controls.target.lerp(targetPos, delta * 5.0);
        camera.position.lerp(camTargetPos, delta * 5.0);
        controls.update();

        if (controls.target.distanceTo(targetPos) < 0.05 && camera.position.distanceTo(camTargetPos) < 0.1) {
          controls.target.set(0, 0, 0);
          camera.position.set(0, 0, 48.0);
          controls.update();
          isAnimating.current = false;
        }
      }
    }
  });

  return null;
}

// Orbiting Graph System: Rotates all nodes, edges, and solar wind energy streams around the central star
function OrbitingGraphSystem({
  children,
  orbitRef
}: {
  children: React.ReactNode;
  orbitRef: React.MutableRefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const selectedTopicId = useStore((state) => state.selectedTopicId);
  const isInspectorOpen = useStore((state) => state.isInspectorOpen);

  useFrame((_, delta) => {
    // Only orbit when viewing overview (pauses smoothly when inspecting a topic)
    if (!selectedTopicId && !isInspectorOpen) {
      orbitRef.current += delta * 0.04;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = orbitRef.current;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

function SceneContent({ orbitRef }: { orbitRef: React.MutableRefObject<number> }) {
  const topicNodes = useStore((state) => state.topicNodes);
  const connectedGraph = useConnectedGraph();

  return (
    <ConnectedGraphContext.Provider value={connectedGraph}>
      {/* 3-Tier Deep Space Parallax Starfield Layer (Far, Mid, Foreground) */}
      <DeepSpaceStarfield />

      {/* Central Glowing Star */}
      <CentralSun />

      {/* Orbiting Planetary Topic Graph System */}
      <OrbitingGraphSystem orbitRef={orbitRef}>
        <KnowledgeGraphEdges />
        <SolarWindEnergyStreams />
        {topicNodes.map((node) => (
          <KnowledgeNode
            key={node.id}
            node={node}
            isConnectedComponent={connectedGraph.activeId ? connectedGraph.connectedNodeIds.has(node.id) : false}
          />
        ))}
      </OrbitingGraphSystem>

      <PostProcessing />
    </ConnectedGraphContext.Provider>
  );
}

export default function SceneCanvas() {
  const setSelectedTopicId = useStore((state) => state.setSelectedTopicId);
  const controlsRef = useRef<OrbitControlsImpl>(null!);
  const introRef = useRef(0);
  const orbitRef = useRef(0);

  useEffect(() => {
    introRef.current = 0;
    orbitRef.current = 0;
  }, []);

  return (
    <div
      id="canvas-viewport"
      className="w-full h-full relative cursor-grab active:cursor-grabbing"
    >
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onPointerMissed={() => setSelectedTopicId(null)}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 450.0]} fov={60} far={2000} />
        <OrbitControls
          makeDefault
          ref={controlsRef}
          enableDamping
          dampingFactor={0.06}
          rotateSpeed={0.8}
          panSpeed={1.0}
          zoomSpeed={0.5}
          minDistance={3.0}
          maxDistance={120.0}
          screenSpacePanning
        />
        <IntroAnimationController introRef={introRef} />
        <CameraRig controlsRef={controlsRef} introRef={introRef} orbitRef={orbitRef} />
        <ambientLight intensity={0.65} color="#fff7ed" />
        <pointLight position={[15, 15, 15]} intensity={2.0} color="#ffaa00" />
        <pointLight position={[-15, -15, -15]} intensity={1.5} color="#ff6600" />
        
        <SceneContent orbitRef={orbitRef} />
      </Canvas>
    </div>
  );
}
