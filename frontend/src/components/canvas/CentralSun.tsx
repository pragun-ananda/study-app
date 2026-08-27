import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function CentralSun() {
  const sunMeshRef = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (sunMeshRef.current) {
      sunMeshRef.current.rotation.y += delta * 0.35;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Central Star Omnidirectional Solar Light */}
      <pointLight position={[0, 0, 0]} intensity={5.5} distance={70} color="#ffaa00" />
      <pointLight position={[0, 0, 0]} intensity={3.5} distance={50} color="#fff2cc" />

      {/* Crisp Glowing Central Sun Sphere */}
      <mesh ref={sunMeshRef} frustumCulled={false}>
        <sphereGeometry args={[4.2, 48, 48]} />
        <meshStandardMaterial
          color="#fffdf0"
          emissive="#ff7700"
          emissiveIntensity={3.6}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
}
