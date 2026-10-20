import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Server,
  HardDrive,
  Layers,
  Cpu,
  Radio,
  Database,
  Trash2,
  Maximize2,
  Sparkles,
  ShieldCheck,
  Zap,
  LucideIcon
} from 'lucide-react';
import { Excalidraw, convertToExcalidrawElements } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

export type ArchitecturePresetType =
  | 'load_balancer'
  | 'api_gateway'
  | 'microservice'
  | 'cache'
  | 'stream'
  | 'database';

export interface ArchitecturePresetConfig {
  type: ArchitecturePresetType;
  label: string;
  shortName: string;
  componentText: string;
  shapeType: 'rectangle' | 'ellipse' | 'diamond';
  icon: LucideIcon;
  lightStroke: string;
  lightBg: string;
  darkStroke: string;
  darkBg: string;
}

export const ARCHITECTURE_PRESETS: ArchitecturePresetConfig[] = [
  {
    type: 'load_balancer',
    label: 'Load Balancer (ALB / Nginx)',
    shortName: 'Load Balancer',
    componentText: 'Load Balancer\n(AWS ALB / Nginx)',
    shapeType: 'rectangle',
    icon: Server,
    lightStroke: '#2563eb',
    lightBg: '#eff6ff',
    darkStroke: '#60a5fa',
    darkBg: '#1e293b'
  },
  {
    type: 'api_gateway',
    label: 'API Gateway (Envoy / Kong)',
    shortName: 'API Gateway',
    componentText: 'API Gateway\n(Envoy / Kong Proxy)',
    shapeType: 'rectangle',
    icon: ShieldCheck,
    lightStroke: '#7c3aed',
    lightBg: '#f5f3ff',
    darkStroke: '#a78bfa',
    darkBg: '#2e1065'
  },
  {
    type: 'microservice',
    label: 'Worker Microservice (Go / gRPC)',
    shortName: 'Microservice',
    componentText: 'Worker Service\n(Go / gRPC Pods)',
    shapeType: 'rectangle',
    icon: Cpu,
    lightStroke: '#059669',
    lightBg: '#ecfdf5',
    darkStroke: '#34d399',
    darkBg: '#064e3b'
  },
  {
    type: 'cache',
    label: 'Redis Cache (Cluster)',
    shortName: 'Redis Cache',
    componentText: 'Redis Cache\n(In-Memory Cluster)',
    shapeType: 'ellipse',
    icon: Zap,
    lightStroke: '#d97706',
    lightBg: '#fffbeb',
    darkStroke: '#fbbf24',
    darkBg: '#451a03'
  },
  {
    type: 'stream',
    label: 'Kafka Stream (Partitioned)',
    shortName: 'Kafka Stream',
    componentText: 'Kafka Event Stream\n(Partitioned Topic)',
    shapeType: 'rectangle',
    icon: Radio,
    lightStroke: '#db2777',
    lightBg: '#fdf2f8',
    darkStroke: '#f472b6',
    darkBg: '#500724'
  },
  {
    type: 'database',
    label: 'PostgreSQL (Multi-AZ HA)',
    shortName: 'Database',
    componentText: 'PostgreSQL Primary\n(Multi-AZ HA Replica)',
    shapeType: 'rectangle',
    icon: Database,
    lightStroke: '#0891b2',
    lightBg: '#ecfeff',
    darkStroke: '#22d3ee',
    darkBg: '#083344'
  }
];

export interface ExcalidrawCanvasProps {
  initialData?: any;
  onChange?: (diagramData: any) => void;
  onReady?: (api: any) => void;
  isLight?: boolean;
  className?: string;
  height?: string | number;
}

export function ExcalidrawCanvas({
  initialData,
  onChange,
  onReady,
  isLight = false,
  className = '',
  height = '480px'
}: ExcalidrawCanvasProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const elementIndexRef = useRef<number>(0);
  const lastEmittedRef = useRef<string>('');

  const handleAPIReady = useCallback(
    (api: any) => {
      setExcalidrawAPI(api);
      if (onReady) {
        onReady(api);
      }

      // If initial data is provided, load scene
      if (initialData && initialData.elements && initialData.elements.length > 0) {
        try {
          api.updateScene({
            elements: initialData.elements,
            appState: initialData.appState || {}
          });
          elementIndexRef.current = initialData.elements.length;
        } catch (err) {
          console.warn('[EXCALIDRAW_LOAD_WARN]:', err);
        }
      }
    },
    [initialData, onReady]
  );

  // Sync external initialData updates (e.g. switching follow-up challenges)
  useEffect(() => {
    if (excalidrawAPI) {
      if (initialData && initialData.elements && initialData.elements.length > 0) {
        try {
          excalidrawAPI.updateScene({
            elements: initialData.elements,
            appState: initialData.appState || {}
          });
          elementIndexRef.current = initialData.elements.length;
        } catch (err) {
          console.warn('[EXCALIDRAW_SYNC_WARN]:', err);
        }
      } else {
        // Clear scene if no initial diagram
        excalidrawAPI.resetScene();
        elementIndexRef.current = 0;
      }
    }
  }, [initialData, excalidrawAPI]);

  const handleSceneChange = useCallback(
    (elements: readonly any[], appState: any) => {
      if (!onChange) return;
      const nonDeleted = elements.filter((el) => !el.isDeleted);
      const serialized = JSON.stringify({ count: nonDeleted.length });

      if (serialized !== lastEmittedRef.current) {
        lastEmittedRef.current = serialized;
        onChange({
          elements: Array.from(elements),
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            zoom: appState.zoom,
            scrollX: appState.scrollX,
            scrollY: appState.scrollY
          }
        });
      }
    },
    [onChange]
  );

  const addPresetComponent = (preset: ArchitecturePresetConfig) => {
    if (!excalidrawAPI) return;

    const currentElements = excalidrawAPI.getSceneElements() || [];
    const idx = elementIndexRef.current;
    elementIndexRef.current += 1;

    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = 80 + col * 250;
    const y = 80 + row * 150;

    const strokeColor = isLight ? preset.lightStroke : preset.darkStroke;
    const backgroundColor = isLight ? preset.lightBg : preset.darkBg;

    try {
      const converted = convertToExcalidrawElements([
        {
          type: preset.shapeType,
          x,
          y,
          width: 200,
          height: 80,
          strokeColor,
          backgroundColor,
          fillStyle: 'solid',
          strokeWidth: 2,
          roundness: { type: 3 },
          label: {
            text: preset.componentText,
            fontSize: 14,
            textAlign: 'center',
            verticalAlign: 'middle'
          }
        }
      ]);

      const updated = [...currentElements, ...converted];
      excalidrawAPI.updateScene({ elements: updated });

      if (onChange) {
        onChange({
          elements: updated,
          appState: excalidrawAPI.getAppState()
        });
      }
    } catch (err) {
      console.warn('[ADD_PRESET_COMPONENT_WARN]:', err);
    }
  };

  const handleClearCanvas = () => {
    if (!excalidrawAPI) return;
    excalidrawAPI.resetScene();
    elementIndexRef.current = 0;
    if (onChange) {
      onChange({
        elements: [],
        appState: excalidrawAPI.getAppState()
      });
    }
  };

  const handleZoomToFit = () => {
    if (!excalidrawAPI) return;
    try {
      excalidrawAPI.scrollToContent();
    } catch (err) {
      console.warn('[ZOOM_TO_FIT_WARN]:', err);
    }
  };

  return (
    <div
      className={`relative flex flex-col rounded-xl border overflow-hidden ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-950 border-slate-800'
      } ${className}`}
      data-testid="excalidraw-canvas-wrapper"
    >
      {/* QUICK PRESETS ARCHITECTURAL TOOLBAR */}
      <div
        className={`px-3 py-2 border-b flex items-center justify-between gap-2 flex-wrap text-xs ${
          isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-slate-900/90 border-slate-800'
        }`}
        data-testid="excalidraw-preset-toolbar"
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Layers size={13} className="text-purple-400" />
            Quick Presets:
          </span>

          {ARCHITECTURE_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.type}
                type="button"
                onClick={() => addPresetComponent(preset)}
                data-testid={`add-preset-${preset.type}`}
                title={preset.label}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isLight
                    ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                <Icon size={12} className="text-purple-400" />
                <span>{preset.shortName}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={handleZoomToFit}
            data-testid="canvas-zoom-to-fit-btn"
            title="Fit diagram to screen"
            className={`p-1.5 rounded-md transition-colors cursor-pointer border ${
              isLight
                ? 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Maximize2 size={13} />
          </button>

          <button
            type="button"
            onClick={handleClearCanvas}
            data-testid="canvas-clear-btn"
            title="Clear all whiteboard elements"
            className={`p-1.5 rounded-md transition-colors cursor-pointer border ${
              isLight
                ? 'bg-white hover:bg-rose-50 text-rose-600 border-slate-200'
                : 'bg-slate-800 hover:bg-rose-950/40 text-rose-400 border-slate-700'
            }`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* EXCALIDRAW CANVAS HOST CONTAINER */}
      <div
        className="w-full relative"
        style={{ height }}
        data-testid="excalidraw-container-host"
      >
        <Excalidraw
          excalidrawAPI={handleAPIReady}
          onChange={handleSceneChange}
          theme={isLight ? 'light' : 'dark'}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: true,
              clearCanvas: false,
              saveToActiveFile: false,
              toggleTheme: false
            }
          }}
        />
      </div>
    </div>
  );
}

export default ExcalidrawCanvas;
