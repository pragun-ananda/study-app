import React from 'react';
import { EffectComposer, Bloom, ChromaticAberration, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';

export default function PostProcessing() {
  const isOverloaded = useStore((state) => state.isOverloaded);
  const bloomIntensity = useStore((state) => state.bloomIntensity);
  const theme = useStore((state) => state.theme);

  const isLight = theme === 'light';

  // Dynamic values driven by overload state & theme
  const currentBloom = isLight
    ? (isOverloaded ? bloomIntensity * 0.8 : bloomIntensity * 0.4)
    : (isOverloaded ? bloomIntensity * 2.2 : bloomIntensity);

  const chromaOffset = new THREE.Vector2(
    isOverloaded ? 0.005 : (isLight ? 0.0 : 0.0015),
    isOverloaded ? 0.005 : (isLight ? 0.0 : 0.0015)
  );

  return (
    <EffectComposer enableNormalPass={false}>
      <Bloom
        intensity={currentBloom}
        luminanceThreshold={isLight ? 0.65 : 0.2}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={chromaOffset}
        radialModulation={false}
        modulationOffset={0}
      />
      <Vignette
        eskil={false}
        offset={0.25}
        darkness={isLight ? 0.15 : 0.8}
      />
      <Noise
        opacity={isOverloaded ? 0.12 : (isLight ? 0.0 : 0.04)}
        blendFunction={BlendFunction.OVERLAY}
      />
    </EffectComposer>
  );
}
