import React, { useMemo, useState } from 'react';
import { TopicNode } from '../../types/telemetry';
import { useStore } from '../../store/useStore';
import { getCategoryShade } from '../../utils/theme';
import { Info, CheckCircle2, ChevronRight, Layers } from 'lucide-react';

interface ApplicationSubgraphProps {
  topicIds: string[];
  onSelectTopic?: (topicId: string) => void;
  selectedTopicId?: string | null;
  className?: string;
}

interface LayoutNode {
  node: TopicNode;
  x: number;
  y: number;
  layer: number;
  color: string;
}

interface SubgraphEdge {
  fromId: string;
  toId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function ApplicationSubgraph({
  topicIds,
  onSelectTopic,
  selectedTopicId: controlledSelectedTopicId,
  className = ''
}: ApplicationSubgraphProps) {
  const theme = useStore((state) => state.theme);
  const isLight = theme === 'light';
  const topicNodes = useStore((state) => state.topicNodes);

  const [internalSelectedTopicId, setInternalSelectedTopicId] = useState<string | null>(null);
  const activeSelectedId = controlledSelectedTopicId !== undefined ? controlledSelectedTopicId : internalSelectedTopicId;

  // Filter nodes to only those used in this application
  const relevantNodes = useMemo(() => {
    const idSet = new Set(topicIds);
    return topicNodes.filter((n) => idSet.has(n.id));
  }, [topicNodes, topicIds]);

  // Compute a DAG layered layout
  const { layoutNodes, edges, viewBox } = useMemo(() => {
    const n = relevantNodes.length;
    if (n === 0) {
      return { layoutNodes: [], edges: [], viewBox: '0 0 500 240' };
    }

    const idSet = new Set(relevantNodes.map((node) => node.id));
    const nodeMap = new Map<string, TopicNode>();
    relevantNodes.forEach((node) => nodeMap.set(node.id, node));

    // Calculate in-degree strictly within the subgraph
    const inDegree = new Map<string, number>();
    const outgoing = new Map<string, string[]>();

    relevantNodes.forEach((node) => {
      inDegree.set(node.id, 0);
      outgoing.set(node.id, []);
    });

    relevantNodes.forEach((node) => {
      node.prerequisites.forEach((pId) => {
        if (idSet.has(pId)) {
          inDegree.set(node.id, (inDegree.get(node.id) || 0) + 1);
          outgoing.get(pId)?.push(node.id);
        }
      });
    });

    // Assign layers (topological levels)
    const layerMap = new Map<string, number>();
    const queue: { id: string; layer: number }[] = [];

    inDegree.forEach((deg, id) => {
      if (deg === 0) {
        queue.push({ id, layer: 0 });
        layerMap.set(id, 0);
      }
    });

    while (queue.length > 0) {
      const { id, layer } = queue.shift()!;
      const nextNodes = outgoing.get(id) || [];
      nextNodes.forEach((nextId) => {
        const nextLayer = Math.max(layerMap.get(nextId) ?? 0, layer + 1);
        layerMap.set(nextId, nextLayer);
        queue.push({ id: nextId, layer: nextLayer });
      });
    }

    // Default any remaining unassigned (e.g. cycle-tolerated) nodes to layer 0
    relevantNodes.forEach((node) => {
      if (!layerMap.has(node.id)) {
        layerMap.set(node.id, 0);
      }
    });

    // Group nodes by layer
    const layerBuckets = new Map<number, TopicNode[]>();
    relevantNodes.forEach((node) => {
      const l = layerMap.get(node.id) ?? 0;
      if (!layerBuckets.has(l)) layerBuckets.set(l, []);
      layerBuckets.get(l)!.push(node);
    });

    const sortedLayers = Array.from(layerBuckets.keys()).sort((a, b) => a - b);
    const numLayers = Math.max(sortedLayers.length, 1);

    const width = 560;
    const height = 260;
    const paddingX = 75;
    const paddingY = 48;

    const layerStepX = numLayers > 1 ? (width - 2 * paddingX) / (numLayers - 1) : 0;

    const layoutList: LayoutNode[] = [];
    const coordMap = new Map<string, { x: number; y: number }>();

    sortedLayers.forEach((layerIdx, layerCol) => {
      const nodesInLayer = layerBuckets.get(layerIdx)!;
      const x = numLayers === 1 ? width / 2 : paddingX + layerCol * layerStepX;
      const layerCount = nodesInLayer.length;
      const layerStepY = layerCount > 1 ? (height - 2 * paddingY) / (layerCount - 1) : 0;

      nodesInLayer.forEach((node, rowIdx) => {
        const y = layerCount === 1 ? height / 2 : paddingY + rowIdx * layerStepY;
        const color = getCategoryShade(node.id, node.category, theme);
        layoutList.push({ node, x, y, layer: layerIdx, color });
        coordMap.set(node.id, { x, y });
      });
    });

    // Build edge coordinates
    const edgeList: SubgraphEdge[] = [];
    relevantNodes.forEach((node) => {
      const toPos = coordMap.get(node.id);
      if (!toPos) return;

      node.prerequisites.forEach((pId) => {
        if (idSet.has(pId)) {
          const fromPos = coordMap.get(pId);
          if (fromPos) {
            edgeList.push({
              fromId: pId,
              toId: node.id,
              x1: fromPos.x,
              y1: fromPos.y,
              x2: toPos.x,
              y2: toPos.y
            });
          }
        }
      });
    });

    return {
      layoutNodes: layoutList,
      edges: edgeList,
      viewBox: `0 0 ${width} ${height}`
    };
  }, [relevantNodes, theme]);

  const activeNode = useMemo(() => {
    if (!activeSelectedId) return null;
    return relevantNodes.find((n) => n.id === activeSelectedId) || null;
  }, [relevantNodes, activeSelectedId]);

  const handleNodeClick = (nodeId: string) => {
    if (controlledSelectedTopicId === undefined) {
      setInternalSelectedTopicId((prev) => (prev === nodeId ? null : nodeId));
    }
    onSelectTopic?.(nodeId);
  };

  if (relevantNodes.length === 0) {
    return (
      <div
        className={`p-6 rounded-xl border flex flex-col items-center justify-center text-center ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-900/40 border-white/10 text-slate-400'
        } ${className}`}
      >
        <Layers size={28} className="opacity-40 mb-2" />
        <p className="text-xs">No concepts connected to this application yet.</p>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl border flex flex-col overflow-hidden transition-colors ${
        isLight ? 'bg-white/80 border-slate-200 shadow-sm' : 'bg-slate-950/60 border-white/10'
      } ${className}`}
    >
      {/* Subgraph Header Bar */}
      <div
        className={`px-3.5 py-2 border-b flex items-center justify-between text-xs font-mono select-none ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-900/80 border-white/10 text-slate-400'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-semibold uppercase tracking-wider text-[11px]">
            Concept Subgraph ({relevantNodes.length} Nodes)
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] opacity-75">
          <span>{edges.length} Dependencies</span>
          <span>•</span>
          <span>Click node to inspect</span>
        </div>
      </div>

      {/* Interactive SVG Subgraph Canvas */}
      <div className="relative w-full h-[220px] overflow-hidden flex items-center justify-center">
        <svg
          viewBox={viewBox}
          className="w-full h-full select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Default Inactive Arrow Marker */}
            <marker
              id="subgraph-arrow-default"
              viewBox="0 0 10 10"
              refX="19"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 1.5 L 8 5 L 0 8.5 z"
                fill={isLight ? '#94a3b8' : 'rgba(255,255,255,0.3)'}
              />
            </marker>

            {/* Active Highlighted Arrow Marker */}
            <marker
              id="subgraph-arrow-active"
              viewBox="0 0 10 10"
              refX="19"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 1.5 L 8 5 L 0 8.5 z"
                fill={isLight ? '#0284c7' : '#00f0ff'}
              />
            </marker>

            {/* Subtle glow filter */}
            <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Directed Edges */}
          {edges.map((edge, idx) => {
            const dx = edge.x2 - edge.x1;
            const dy = edge.y2 - edge.y1;
            const curvature = Math.min(Math.abs(dx) * 0.35, 60);
            const pathData = `M ${edge.x1} ${edge.y1} C ${edge.x1 + curvature} ${edge.y1}, ${edge.x2 - curvature} ${edge.y2}, ${edge.x2} ${edge.y2}`;

            const isEdgeActive =
              activeSelectedId && (edge.fromId === activeSelectedId || edge.toId === activeSelectedId);

            return (
              <g key={`edge-${idx}`}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={
                    isEdgeActive
                      ? isLight
                        ? '#0284c7'
                        : '#00f0ff'
                      : isLight
                      ? '#cbd5e1'
                      : 'rgba(255,255,255,0.15)'
                  }
                  strokeWidth={isEdgeActive ? 2.2 : 1.4}
                  strokeDasharray={isEdgeActive ? 'none' : '3 3'}
                  markerEnd={isEdgeActive ? 'url(#subgraph-arrow-active)' : 'url(#subgraph-arrow-default)'}
                  className="transition-colors duration-200"
                />
              </g>
            );
          })}

          {/* Nodes */}
          {layoutNodes.map(({ node, x, y, color }) => {
            const isSelected = node.id === activeSelectedId;
            const radius = 18;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference * (1 - (node.mastery || 0) / 100);

            return (
              <g
                key={node.id}
                transform={`translate(${x}, ${y})`}
                onClick={() => handleNodeClick(node.id)}
                className="cursor-pointer group"
              >
                {/* Outer Selection Aura */}
                {isSelected && (
                  <circle
                    r={radius + 6}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    opacity={0.4}
                    strokeDasharray="4 2"
                    className="animate-spin-slow"
                  />
                )}

                {/* Node Background Base */}
                <circle
                  r={radius}
                  fill={isLight ? '#ffffff' : '#090d1a'}
                  stroke={isLight ? '#e2e8f0' : 'rgba(255,255,255,0.12)'}
                  strokeWidth={1}
                />

                {/* Mastery Progress Ring */}
                <circle
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.5}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform={`rotate(-90)`}
                  filter={isSelected ? 'url(#node-glow)' : undefined}
                  className="transition-all duration-300"
                />

                {/* Center Glyph / Category Badge */}
                <text
                  textAnchor="middle"
                  dy="0.32em"
                  fontSize="9px"
                  fontWeight="bold"
                  fill={isSelected ? color : isLight ? '#334155' : '#cbd5e1'}
                  fontFamily="monospace"
                >
                  {node.name.slice(0, 3).toUpperCase()}
                </text>

                {/* Node Label below */}
                <g transform="translate(0, 26)">
                  <rect
                    x={-Math.min(node.name.length * 3.4 + 8, 70)}
                    y={-7}
                    width={Math.min(node.name.length * 6.8 + 16, 140)}
                    height={14}
                    rx={4}
                    fill={isSelected ? (isLight ? '#0284c7' : '#00f0ff') : isLight ? '#f1f5f9' : '#0f172a'}
                    stroke={isSelected ? color : isLight ? '#cbd5e1' : 'rgba(255,255,255,0.08)'}
                    strokeWidth={0.8}
                    opacity={0.92}
                  />
                  <text
                    textAnchor="middle"
                    dy="3"
                    fontSize="8px"
                    fontWeight={isSelected ? '600' : '500'}
                    fill={isSelected ? (isLight ? '#ffffff' : '#020617') : isLight ? '#1e293b' : '#94a3b8'}
                    fontFamily="sans-serif"
                  >
                    {node.name.length > 20 ? `${node.name.slice(0, 18)}…` : node.name}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Active Node Quick Peek Strip */}
      {activeNode ? (
        <div
          className={`p-2.5 px-3 border-t text-xs flex items-start justify-between gap-3 ${
            isLight ? 'bg-sky-50/60 border-slate-200' : 'bg-cyan-950/20 border-cyan-500/20'
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold truncate text-slate-800 dark:text-slate-100 text-[11px]">
                {activeNode.name}
              </span>
              <span
                className="text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-medium"
                style={{
                  color: getCategoryShade(activeNode.id, activeNode.category, theme),
                  borderColor: `${getCategoryShade(activeNode.id, activeNode.category, theme)}40`
                }}
              >
                {activeNode.category}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {activeNode.mastery}% Mastery
              </span>
            </div>
            <p className="text-[10.5px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
              {activeNode.summary}
            </p>
          </div>
          <button
            onClick={() => handleNodeClick(activeNode.id)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-1.5 py-0.5"
            title="Dismiss detail"
          >
            ✕
          </button>
        </div>
      ) : (
        <div
          className={`py-1.5 px-3 border-t text-[10px] font-mono flex items-center justify-between text-slate-500 dark:text-slate-400 ${
            isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-900/40 border-white/5'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Info size={11} className="opacity-70" />
            Click any concept node above to preview definition and dependencies
          </span>
        </div>
      )}
    </div>
  );
}
