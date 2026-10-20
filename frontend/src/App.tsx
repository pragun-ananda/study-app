import React, { useEffect } from 'react';
import SceneCanvas from './components/canvas/SceneCanvas';
import TelemetryHUD from './components/hud/TelemetryHUD';
import SolCompanion from './components/sol/SolCompanion';
import SolChatDrawer from './components/sol/SolChatDrawer';
import { useSolStore } from './store/useSolStore';
import { useStore, applyThemeToDocument } from './store/useStore';

export default function App() {
  const theme = useStore((state) => state.theme);
  const isOverloaded = useStore((state) => state.isOverloaded);
  const activeApplication = useStore((state) => state.activeApplication);
  const isSolOpen = useSolStore((state) => state.isOpen);

  useEffect(() => {
    document.title = 'Knowledge Graph';
    useStore.getState().loadInitialData();
  }, []);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  // Periodically synchronize theme based on time of day (EST) if not manually overridden
  useEffect(() => {
    const interval = setInterval(() => {
      useStore.getState().syncThemeWithTimeOfDay();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput =
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) ||
        Boolean(target?.isContentEditable);

      // Handle Escape globally to dismiss topmost active modal, overlay, or selection
      if (event.key === 'Escape' || event.code === 'Escape') {
        if (isInput) {
          target?.blur();
        }

        // If Sol Chat Drawer is open, dismiss it first on Escape
        if (useSolStore.getState().isOpen) {
          useSolStore.getState().setIsOpen(false);
          return;
        }

        const state = useStore.getState();
        // If CreateNodeModal is open, let CreateNodeModal manage its own dismissal
        // to respect its submission lock and prevent unmounting in-flight requests.
        if (state.isCreateNodeOpen) {
          return;
        }
        if (state.activeApplication) {
          state.setActiveApplication(null);
          return;
        }
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

      // Ignore if modifier keys are pressed (e.g. Cmd+N, Ctrl+N)
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      // 'N': Open Create Node Modal
      if (event.key === 'n' || event.key === 'N' || event.code === 'KeyN') {
        const state = useStore.getState();
        if (!state.isCreateNodeOpen && !state.activeNote && !state.activeDiffUpdateId) {
          event.preventDefault();
          state.setIsCreateNodeOpen(true);
          return;
        }
      }

      // '/': Focus Concept Search & Open Study Sidebar
      if (event.key === '/' || event.code === 'Slash') {
        event.preventDefault();
        useStore.getState().setIsSearchOpen(true);
        useStore.getState().setIsSidebarOpen(true);
        return;
      }

      // 'T': Toggle Light / Dark Theme
      if (event.code === 'KeyT') {
        useStore.getState().toggleTheme();
      } else if (event.code === 'KeyH') {
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
    <div
      className={`relative w-full h-screen overflow-hidden select-none transition-colors duration-200 ${
        theme === 'light' ? 'bg-slate-100 text-slate-900 light' : 'bg-[#050811] text-slate-100 dark'
      }`}
      data-testid="app-container"
      data-theme={theme}
    >
      {/* Layer z-0: 3D Scene Viewport & WebGL Post Processing (Persistent full-canvas to prevent WebGL resize lag) */}
      <div
        className={`absolute inset-y-0 right-0 z-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[left] ${
          activeApplication ? 'left-0 md:left-1/2' : 'left-0'
        }`}
        data-testid="scene-canvas-container"
      >
        <SceneCanvas />
      </div>

      {/* Main Website Content Area - Shifts left and resizes HUD & overlays when Sol Chat split opens */}
      <div
        className={`absolute inset-y-0 left-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden pointer-events-none ${
          isSolOpen ? 'right-full sm:right-[400px] md:right-[440px] lg:right-[460px]' : 'right-0'
        }`}
        data-testid="main-content-viewport"
      >
        {/* Layer z-10: CRT Scanlines, Screen Vignette & Grain Overlay */}
        <div
          className={`pointer-events-none absolute inset-0 w-full h-full z-10 crt-scanlines crt-vignette transition-opacity duration-300 ${
            theme === 'light' && !isOverloaded ? 'opacity-0' : 'opacity-80'
          }`}
        />

        {/* Layer z-20: HUD & Telemetry UI */}
        <TelemetryHUD />

        {/* Layer z-30: Sol AI Companion */}
        <SolCompanion />
      </div>

      {/* Layer z-40: Dedicated Right-Side Split AI Chat Drawer */}
      <SolChatDrawer />
    </div>
  );
}

