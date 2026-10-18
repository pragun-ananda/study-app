import React, { useMemo, useState } from 'react';
import { TopicNode } from '../../types/telemetry';
import { useStore } from '../../store/useStore';
import {
  calculateTopological2DLayout,
  TopologicalLayoutNode,
  TopologicalNodeGroup
} from '../../utils/graph';
import { Network, List, ArrowDown, ShieldAlert, Target, Zap, ArrowRight } from 'lucide-react';

interface TopologicalSubgraphProps {
  targetTopicId: string;
  topicNodes: TopicNode[];
  onSelectTopic: (topicId: string) => void;
  className?: string;
}

export function TopologicalSubgraph({
  targetTopicId,
  topicNodes,
  onSelectTopic,
  className = ''
}: TopologicalSubgraphProps) {
  const theme = useStore((state) => state.theme);
  const isLight = theme === 'light';

  const [viewMode, setViewMode] = useState<'FLOW' | 'LIST'>('FLOW');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Compute 2D top-down topological layout
  const layout = useMemo(() => {
    return calculateTopological2DLayout(targetTopicId, topicNodes, {
      svgWidth: 320,
      layerGap: 56,
      nodeHeight: 34
    });
  }, [targetTopicId, topicNodes]);

  // Color mappings based on group and theme
  const getGroupPalette = (group: TopologicalNodeGroup, isHovered: boolean = false) => {
    switch (group) {
      case 'NEED':
        return {
          stroke: isHovered
            ? (isLight ? '#b45309' : '#ffc44d')
            : (isLight ? '#d97706' : '#ffaa00'),
          fill: isLight ? '#fef3c7' : '#1f1606',
          text: isLight ? '#92400e' : '#fde68a',
          badgeBg: isLight ? '#fde68a' : 'rgba(255, 170, 0, 0.25)',
          badgeText: isLight ? '#78350f' : '#ffaa00',
          edgeStroke: isLight ? '#d97706' : '#ffaa00',
          glow: 'rgba(255, 170, 0, 0.4)'
        };
      case 'CURRENT':
        return {
          stroke: isHovered
            ? (isLight ? '#0369a1' : '#67e8f9')
            : (isLight ? '#0284c7' : '#00f0ff'),
          fill: isLight ? '#e0f2fe' : '#041f2d',
          text: isLight ? '#0369a1' : '#e0f2fe',
          badgeBg: isLight ? '#bae6fd' : 'rgba(0, 240, 255, 0.25)',
          badgeText: isLight ? '#0284c7' : '#00f0ff',
          edgeStroke: isLight ? '#0284c7' : '#00f0ff',
          glow: 'rgba(0, 240, 255, 0.5)'
        };
      case 'PARENT':
        return {
          stroke: isHovered
            ? (isLight ? '#047857' : '#4ade80')
            : (isLight ? '#059669' : '#00ff9d'),
          fill: isLight ? '#d1fae5' : '#042217',
          text: isLight ? '#065f46' : '#a7f3d0',
          badgeBg: isLight ? '#a7f3d0' : 'rgba(0, 255, 157, 0.25)',
          badgeText: isLight ? '#065f46' : '#00ff9d',
          edgeStroke: isLight ? '#059669' : '#00ff9d',
          glow: 'rgba(0, 255, 157, 0.4)'
        };
    }
  };

  const targetNode = layout.nodes.find((n) => n.id === targetTopicId);

  return (
    <div
      data-testid="topological-subgraph-container"
      className={`rounded-lg border text-xs overflow-hidden transition-all ${
        isLight
          ? 'bg-slate-50/90 border-slate-200 text-slate-800'
          : 'bg-slate-950/70 border-white/10 text-slate-200'
      } ${className}`}
    >
      {/* Header bar with Mode Switcher */}
      <div
        className={`px-3 py-2 border-b flex items-center justify-between gap-2 ${
          isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-900/80 border-white/10'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Network size={13} className={isLight ? 'text-amber-600' : 'text-[#ffaa00]'} />
          <span className="font-sans font-bold text-[11px] uppercase tracking-wider truncate">
            Topological Flow
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('FLOW')}
            title="2D Flow Graph"
            data-testid="topological-mode-flow-btn"
            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === 'FLOW'
                ? isLight
                  ? 'bg-white shadow-xs text-slate-900 border border-slate-300'
                  : 'bg-white/15 text-white border border-white/25'
                : isLight
                ? 'text-slate-500 hover:text-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network size={11} />
            <span>2D Flow</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('LIST')}
            title="Step-by-Step List"
            data-testid="topological-mode-list-btn"
            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === 'LIST'
                ? isLight
                  ? 'bg-white shadow-xs text-slate-900 border border-slate-300'
                  : 'bg-white/15 text-white border border-white/25'
                : isLight
                ? 'text-slate-500 hover:text-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <List size={11} />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* 2D Top-Down Topological Flow Mode */}
      {viewMode === 'FLOW' ? (
        <div className="p-2 space-y-2">
          {/* Legend Badges */}
          <div
            className={`flex items-center justify-between px-2 py-1.5 rounded text-[10px] border ${
              isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-slate-900/60 border-white/5 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-1" title="Prerequisites needed before this node">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                Needs ({layout.needsCount})
              </span>
            </div>
            <div className="flex items-center gap-1" title="Currently selected topic">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="font-semibold text-sky-600 dark:text-cyan-400">
                Current
              </span>
            </div>
            <div className="flex items-center gap-1" title="Downstream concepts that require this node">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Parents ({layout.parentsCount})
              </span>
            </div>
          </div>

          {/* SVG Diagram Canvas */}
          <div className="relative overflow-x-hidden rounded bg-transparent">
            {layout.needsCount === 0 && (
              <div
                className={`text-[10px] text-center py-1 px-2 border border-dashed rounded mb-1 ${
                  isLight ? 'border-amber-300 text-amber-700 bg-amber-50/50' : 'border-amber-500/30 text-amber-300/80 bg-amber-950/20'
                }`}
              >
                ✦ Foundational topic (No prior prerequisites required)
              </div>
            )}

            <svg
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              className="w-full h-auto max-h-[360px] overflow-visible select-none"
              role="img"
              aria-label="2D Topological Sorting Subgraph"
            >
              <defs>
                {/* Arrow markers for each group */}
                <marker
                  id="arrow-NEED"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill={isLight ? '#d97706' : '#ffaa00'} />
                </marker>
                <marker
                  id="arrow-CURRENT"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill={isLight ? '#0284c7' : '#00f0ff'} />
                </marker>
                <marker
                  id="arrow-PARENT"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill={isLight ? '#059669' : '#00ff9d'} />
                </marker>

                {/* Glow filter for active/hovered nodes */}
                <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Directed Edges */}
              <g className="edges">
                {layout.edges.map((edge) => {
                  const palette = getGroupPalette(edge.group);
                  return (
                    <path
                      key={edge.id}
                      d={edge.path}
                      fill="none"
                      stroke={palette.edgeStroke}
                      strokeWidth={1.75}
                      strokeOpacity={0.75}
                      strokeDasharray={edge.group === 'CURRENT' ? '4 2' : undefined}
                      markerEnd={`url(#arrow-${edge.group})`}
                      className="transition-all"
                    />
                  );
                })}
              </g>

              {/* Node Cards */}
              <g className="nodes">
                {layout.nodes.map((layoutNode) => {
                  const isHovered = hoveredNodeId === layoutNode.id;
                  const isCurrent = layoutNode.group === 'CURRENT';
                  const palette = getGroupPalette(layoutNode.group, isHovered);

                  const cardX = layoutNode.x - layoutNode.width / 2;
                  const cardY = layoutNode.y - layoutNode.height / 2;

                  return (
                    <g
                      key={layoutNode.id}
                      onClick={() => onSelectTopic(layoutNode.id)}
                      onMouseEnter={() => setHoveredNodeId(layoutNode.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      className="cursor-pointer group"
                      data-testid={`topo-node-${layoutNode.id}`}
                    >
                      <title>
                        {layoutNode.name} • {layoutNode.category} • {layoutNode.group} ({layoutNode.mastery}% mastery)
                      </title>

                      {/* Halo ring for active/current node or hovered node */}
                      {(isCurrent || isHovered) && (
                        <rect
                          x={cardX - 2}
                          y={cardY - 2}
                          width={layoutNode.width + 4}
                          height={layoutNode.height + 4}
                          rx={8}
                          fill="none"
                          stroke={palette.stroke}
                          strokeWidth={isCurrent ? 2 : 1.5}
                          strokeOpacity={0.6}
                          filter="url(#node-glow)"
                        />
                      )}

                      {/* Node Card Rectangle */}
                      <rect
                        x={cardX}
                        y={cardY}
                        width={layoutNode.width}
                        height={layoutNode.height}
                        rx={6}
                        fill={palette.fill}
                        stroke={palette.stroke}
                        strokeWidth={isCurrent ? 2 : 1.25}
                        className="transition-all"
                      />

                      {/* Step Badge (for Needs: 1..N) or Group Dot */}
                      {layoutNode.step !== undefined ? (
                        <g>
                          <rect
                            x={cardX + 5}
                            y={cardY + (layoutNode.height - 16) / 2}
                            width={16}
                            height={16}
                            rx={4}
                            fill={palette.badgeBg}
                          />
                          <text
                            x={cardX + 13}
                            y={cardY + layoutNode.height / 2 + 3.5}
                            textAnchor="middle"
                            fontSize="9"
                            fontWeight="bold"
                            fontFamily="monospace"
                            fill={palette.badgeText}
                          >
                            {layoutNode.step}
                          </text>
                        </g>
                      ) : isCurrent ? (
                        <circle
                          cx={cardX + 12}
                          cy={cardY + layoutNode.height / 2}
                          r={4}
                          fill={palette.stroke}
                        />
                      ) : (
                        <polygon
                          points={`${cardX + 9},${cardY + layoutNode.height / 2 - 4} ${cardX + 15},${cardY + layoutNode.height / 2} ${cardX + 9},${cardY + layoutNode.height / 2 + 4}`}
                          fill={palette.stroke}
                        />
                      )}

                      {/* Topic Name */}
                      <text
                        x={cardX + (layoutNode.step !== undefined ? 25 : 20)}
                        y={cardY + layoutNode.height / 2 + 3.5}
                        fontSize={isCurrent ? '10' : '9.5'}
                        fontWeight={isCurrent ? 'bold' : '600'}
                        fill={palette.text}
                        className="font-sans"
                      >
                        {layoutNode.name.length > (layoutNode.width < 120 ? 10 : 14)
                          ? `${layoutNode.name.substring(0, layoutNode.width < 120 ? 8 : 12)}…`
                          : layoutNode.name}
                      </text>

                      {/* Mastery / Status Pill on right side */}
                      <g>
                        <text
                          x={cardX + layoutNode.width - 6}
                          y={cardY + layoutNode.height / 2 + 3}
                          textAnchor="end"
                          fontSize="8.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                          fill={palette.stroke}
                        >
                          {layoutNode.mastery}%
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            </svg>

            {layout.parentsCount === 0 && (
              <div
                className={`text-[10px] text-center py-1 px-2 border border-dashed rounded mt-1 ${
                  isLight ? 'border-emerald-300 text-emerald-700 bg-emerald-50/50' : 'border-emerald-500/30 text-emerald-300/80 bg-emerald-950/20'
                }`}
              >
                ✦ End of branch (No downstream topics currently unlock from this node)
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Step-by-Step List Mode */
        <div className="p-2.5 space-y-3" data-testid="topological-step-list">
          {/* 1. Needs Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-amber-600">
              <span className="flex items-center gap-1">
                <ShieldAlert size={12} />
                <span>1. PREREQUISITES / NEEDS</span>
              </span>
              <span>{layout.needsCount} STEPS</span>
            </div>

            {layout.needsCount > 0 ? (
              layout.nodes
                .filter((n) => n.group === 'NEED')
                .map((n) => (
                  <div
                    key={n.id}
                    onClick={() => onSelectTopic(n.id)}
                    className={`p-2 rounded border text-[11px] cursor-pointer transition-all flex items-center justify-between group ${
                      isLight
                        ? 'bg-white border-amber-500/30 hover:border-amber-500 text-slate-800'
                        : 'bg-slate-900/80 border-[#ffaa00]/30 hover:border-[#ffaa00] text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                        isLight ? 'text-amber-700 bg-amber-100' : 'text-[#ffaa00] bg-[#ffaa00]/20'
                      }`}>
                        {n.step}
                      </span>
                      <span className="truncate font-semibold group-hover:text-amber-600">
                        {n.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-600 ml-2 flex-shrink-0">
                      {n.mastery}%
                    </span>
                  </div>
                ))
            ) : (
              <div className="text-[10px] text-slate-400 italic p-1">
                No prerequisites required.
              </div>
            )}
          </div>

          {/* 2. Current Node Section */}
          {targetNode && (
            <div className="space-y-1.5 pt-1 border-t border-dashed border-white/10">
              <div className="flex items-center justify-between text-[10px] font-bold text-sky-600 dark:text-[#00f0ff]">
                <span className="flex items-center gap-1">
                  <Target size={12} />
                  <span>2. CURRENT ACTIVE TOPIC</span>
                </span>
                <span className="font-mono">{targetNode.mastery}%</span>
              </div>
              <div
                className={`p-2.5 rounded border text-[11px] font-bold flex items-center justify-between ${
                  isLight
                    ? 'bg-sky-50 border-sky-400 text-sky-900 shadow-xs'
                    : 'bg-[#00f0ff]/10 border-[#00f0ff] text-slate-100 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                }`}
              >
                <span className="truncate uppercase tracking-wider">{targetNode.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                  isLight ? 'bg-sky-200/80 text-sky-800' : 'bg-[#00f0ff]/20 text-[#00f0ff]'
                }`}>
                  FOCUSED
                </span>
              </div>
            </div>
          )}

          {/* 3. Parent / Unlocks Section */}
          <div className="space-y-1.5 pt-1 border-t border-dashed border-white/10">
            <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600 dark:text-[#00ff9d]">
              <span className="flex items-center gap-1">
                <Zap size={12} />
                <span>3. PARENT TOPICS / UNLOCKS</span>
              </span>
              <span>{layout.parentsCount} TOPICS</span>
            </div>

            {layout.parentsCount > 0 ? (
              layout.nodes
                .filter((n) => n.group === 'PARENT')
                .map((n) => (
                  <div
                    key={n.id}
                    onClick={() => onSelectTopic(n.id)}
                    className={`p-2 rounded border text-[11px] cursor-pointer transition-all flex items-center justify-between group ${
                      isLight
                        ? 'bg-white border-emerald-500/30 hover:border-emerald-500 text-slate-800'
                        : 'bg-slate-900/80 border-[#00ff9d]/30 hover:border-[#00ff9d] text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <ArrowRight size={12} className="text-emerald-500 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      <span className="truncate font-semibold group-hover:text-emerald-500">
                        {n.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-[#00ff9d] ml-2 flex-shrink-0">
                      {n.mastery}%
                    </span>
                  </div>
                ))
            ) : (
              <div className="text-[10px] text-slate-400 italic p-1">
                End of branch (no downstream topics).
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer hint */}
      <div
        className={`px-3 py-1.5 border-t text-[9px] flex items-center justify-between ${
          isLight ? 'bg-slate-100/60 border-slate-200 text-slate-500' : 'bg-slate-900/40 border-white/5 text-slate-400'
        }`}
      >
        <span className="flex items-center gap-1">
          <ArrowDown size={10} />
          <span>Top-down topological flow</span>
        </span>
        <span>Click node to inspect</span>
      </div>
    </div>
  );
}
