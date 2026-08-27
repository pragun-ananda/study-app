import React from 'react';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useStore } from '../../store/useStore';

export default function PostProcessing() {
  const isOverloaded = useStore((state) => state.isOverloaded);
  const bloomIntensity = useStore((state) => state.bloomIntensity);

  // Dynamic values driven by overload state
  const currentBloom = isOverloaded ? bloomIntensity * 1.5 : bloomIntensity * 0.7;

  return (
    <EffectComposer enableNormalPass={false}>
      <Bloom
        intensity={currentBloom * 0.95}
        luminanceThreshold={0.46}
        luminanceSmoothing={0.3}
        mipmapBlur={false}
      />
    </EffectComposer>
  );
}
