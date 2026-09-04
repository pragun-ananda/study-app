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
      const isInput = ['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName);

      // Handle Escape globally to dismiss topmost active modal, overlay, or selection
      if (event.key === 'Escape' || event.code === 'Escape') {
        if (isInput) {
          (event.target as HTMLElement)?.blur();
        }

        const state = useStore.getState();
        if (state.activeNote) {
          state.setActiveNote(null);
          return;
        }
        if (state.activeDiffUpdateId) {
          state.setActiveDiffUpdateId(null);
          return;
        }
        if (state.isNotificationsOpen) {
          state.setIsNotificationsOpen(false);
          return;
        }
        if (state.isInspectorOpen) {
          state.setIsInspectorOpen(false);
          return;
        }
        if (state.isSearchOpen || state.searchQuery || state.isSidebarOpen) {
          state.setIsSearchOpen(false);
          state.setSearchQuery('');
          state.setIsSidebarOpen(false);
          return;
        }
        if (state.selectedTopicId) {
          state.setSelectedTopicId(null);
          return;
        }
        return;
      }

      // Avoid triggering typing shortcuts when focused inside input elements
      if (isInput) {
        return;
      }

      // '/': Focus Concept Search & Open Study Sidebar
      if (event.key === '/' || event.code === 'Slash') {
        event.preventDefault();
        useStore.getState().setIsSearchOpen(true);
        useStore.getState().setIsSidebarOpen(true);
        return;
      }



      // 'H': Toggle HUD Visibility
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

      {/* Layer z-10: CRT Scanlines, Screen Vignette & Grain Overlay */}
      <div className="pointer-events-none absolute inset-0 z-10 crt-scanlines crt-vignette opacity-80" />

      {/* Layer z-20: HUD & Telemetry UI */}
      <TelemetryHUD />
    </div>
  );
}

