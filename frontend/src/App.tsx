import React, { useEffect } from 'react';
import SceneCanvas from './components/canvas/SceneCanvas';
import TelemetryHUD from './components/hud/TelemetryHUD';
import { useStore } from './store/useStore';

export default function App() {
  useEffect(() => {
    document.title = 'Knowledge Graph';
    useStore.getState().loadInitialData();
  }, []);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Avoid triggering when focused inside input elements
      if (['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) {
        return;
      }

      if (event.code === 'KeyH') {
        useStore.getState().toggleHudVisibility();
      } else if (event.code === 'KeyO') {
        const nextState = !useStore.getState().isOverloaded;
        useStore.getState().setIsOverloaded(nextState);
        useStore.getState().setSystemStatus(nextState ? 'OVERLOADED' : 'OPTIMAL');
      } else if (event.code === 'KeyR') {
        useStore.getState().resetState();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#050811] overflow-hidden select-none">
      {/* Layer z-0: 3D Scene Viewport & WebGL Post Processing */}
      <div className="absolute inset-0 z-0">
        <SceneCanvas />
      </div>

      {/* Layer z-20: HUD & Telemetry UI */}
      <TelemetryHUD />
    </div>
  );
}

