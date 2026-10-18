import React, { useRef, useEffect, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useSolStore, SolMood } from '../../store/useSolStore';

interface RobotCompanionProps {
  mood: SolMood;
  isHovered: boolean;
  onClick?: () => void;
}

function RobotCompanion({ mood, isHovered, onClick }: RobotCompanionProps) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/models/robot.glb');
  const { actions, mixer } = useAnimations(animations, group);

  // Customize robot color palette to Sol's signature electric cyan theme
  useMemo(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const origMat = mesh.material as THREE.MeshStandardMaterial;
          mesh.material = origMat.clone();
          const mat = mesh.material as THREE.MeshStandardMaterial;

          if (origMat.name === 'Main') {
            // Modern, clean pearl white ceramic armor (like Astro Bot / EVE / Portal)
            mat.color = new THREE.Color('#f8fafc');
            mat.roughness = 0.15;
            mat.metalness = 0.05;
          } else if (origMat.name === 'Black' || mesh.name === 'Head_4') {
            // Glossy obsidian visor lenses with subtle blue LED catchlight
            mat.color = new THREE.Color('#090d16');
            mat.emissive = new THREE.Color('#00e5ff');
            mat.emissiveIntensity = 0.35;
            mat.roughness = 0.08;
            mat.metalness = 0.2;
          } else if (origMat.name === 'Grey') {
            // Sleek titanium-cyan joint accents
            mat.color = new THREE.Color('#94a3b8');
            mat.roughness = 0.3;
            mat.metalness = 0.4;
          }
        }
      }
    });
  }, [scene]);

  // Play Idle animation by default
  useEffect(() => {
    if (!actions) return;
    const idleAction = actions['Idle'];
    if (idleAction) {
      idleAction.reset().fadeIn(0.2).play();
    }
  }, [actions]);

  // React to mood changes
  useEffect(() => {
    if (!actions || !mixer) return;

    if (mood === 'thinking') {
      const danceAction = actions['Dance'] || actions['Jump'];
      const idleAction = actions['Idle'];
      if (danceAction && idleAction) {
        danceAction.reset().fadeIn(0.25).play();
        return () => {
          danceAction.fadeOut(0.25);
          idleAction.reset().fadeIn(0.25).play();
        };
      }
    } else if (mood === 'happy') {
      const thumbsUp = actions['ThumbsUp'];
      const idleAction = actions['Idle'];
      if (thumbsUp && idleAction) {
        thumbsUp.reset().setLoop(THREE.LoopOnce, 1);
        thumbsUp.clampWhenFinished = false;
        thumbsUp.fadeIn(0.2).play();
        idleAction.crossFadeTo(thumbsUp, 0.2, true);

        const onFinished = () => {
          mixer.removeEventListener('finished', onFinished);
          idleAction.reset().fadeIn(0.3).play();
        };
        mixer.addEventListener('finished', onFinished);
      }
    }
  }, [mood, actions, mixer]);

  // Click handler: trigger a cheerful Wave or ThumbsUp animation!
  const handleClick = (e: any) => {
    e.stopPropagation();
    if (actions && mixer) {
      const waveAction = actions['Wave'];
      const idleAction = actions['Idle'];
      if (waveAction && idleAction) {
        waveAction.reset().setLoop(THREE.LoopOnce, 1);
        waveAction.clampWhenFinished = false;
        waveAction.fadeIn(0.15).play();
        idleAction.crossFadeTo(waveAction, 0.15, true);

        const onFinished = () => {
          mixer.removeEventListener('finished', onFinished);
          idleAction.reset().fadeIn(0.3).play();
        };
        mixer.addEventListener('finished', onFinished);
      }
    }
    if (onClick) onClick();
  };

  // Hover effect: when hovering, make head/body lean forward slightly
  useFrame((state, delta) => {
    if (!group.current) return;

    const t = state.clock.getElapsedTime();

    // Gentle mechanical floating bob
    group.current.position.y = -1.35 + Math.sin(t * 2.2) * 0.06;

    // Smooth gaze tracking towards mouse cursor
    const targetRotY = state.pointer.x * 0.42;
    const targetRotX = -state.pointer.y * 0.16;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRotY, delta * 4);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetRotX, delta * 4);
  });

  return (
    <group
      ref={group}
      position={[0, -1.35, 0]}
      scale={[0.55, 0.55, 0.55]}
      onClick={handleClick}
    >
      <primitive object={scene} />
    </group>
  );
}

// Preload the robot model so it appears instantaneously
useGLTF.preload('/models/robot.glb');

// Orbiting Celestial Stardust Sparkles
function StardustParticles() {
  const count = 20;
  const particlesRef = useRef<THREE.Points>(null);

  const [positions, initialAngles, radii, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const angles = new Float32Array(count);
    const rads = new Float32Array(count);
    const spds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      angles[i] = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      rads[i] = 1.1 + Math.random() * 0.7;
      spds[i] = 0.4 + Math.random() * 0.6;

      pos[i * 3] = Math.cos(angles[i]) * rads[i];
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2.2;
      pos[i * 3 + 2] = Math.sin(angles[i]) * rads[i];
    }
    return [pos, angles, rads, spds];
  }, [count]);

  useFrame((state, delta) => {
    if (!particlesRef.current) return;
    const posAttr = particlesRef.current.geometry.attributes.position;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      initialAngles[i] += delta * speeds[i] * 0.8;
      const x = Math.cos(initialAngles[i]) * radii[i];
      const z = Math.sin(initialAngles[i]) * radii[i];
      let y = array[i * 3 + 1] + Math.sin(state.clock.elapsedTime * 2 + i) * 0.005;

      if (y > 1.5) y = -1.4;
      if (y < -1.4) y = 1.5;

      array[i * 3] = x;
      array[i * 3 + 1] = y;
      array[i * 3 + 2] = z;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#a5f3fc"
        size={0.07}
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Fallback placeholder while model loads
function LoadingPlaceholder() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 2;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.4, 24, 24]} />
      <meshStandardMaterial color="#00e5ff" emissive="#00b4d8" emissiveIntensity={0.6} wireframe />
    </mesh>
  );
}

interface SolAvatarProps {
  className?: string;
  isHovered?: boolean;
  onClick?: () => void;
}

export default function SolAvatar({ className = '', isHovered = false, onClick }: SolAvatarProps) {
  const mood = useSolStore((state) => state.solMood);

  return (
    <div className={`relative w-full h-full cursor-pointer select-none ${className}`}>
      {/* Outer Cyan Cosmic Aura Glow */}
      <div
        className={`absolute inset-0 rounded-full blur-xl transition-all duration-500 pointer-events-none ${
          mood === 'thinking'
            ? 'bg-cyan-400/50 scale-125 animate-pulse'
            : isHovered
            ? 'bg-cyan-400/40 scale-115'
            : 'bg-cyan-500/25 scale-100'
        }`}
      />

      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        className="w-full h-full"
      >
        <ambientLight intensity={1.3} />
        <directionalLight position={[3, 5, 4]} intensity={2.0} color="#ffffff" />
        <directionalLight position={[-3, -1, 2]} intensity={0.8} color="#00e5ff" />
        <directionalLight position={[0, -2, -3]} intensity={1.0} color="#38bdf8" />

        <Suspense fallback={<LoadingPlaceholder />}>
          {/* 🌟 Professional Animated Robot Companion */}
          <RobotCompanion mood={mood} isHovered={isHovered} onClick={onClick} />
        </Suspense>

        {/* Orbiting Stardust Particles */}
        <StardustParticles />
      </Canvas>
    </div>
  );
}
