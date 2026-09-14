import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ExternalLink,
  Clock,
  Building,
  Sparkles,
  Layers,
  FileText,
  Compass
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getCategoryShade } from '../../utils/theme';
import { MarkdownContent } from './MarkdownContent';
import { ApplicationSubgraph } from './ApplicationSubgraph';
import { ApplicationDifficulty, ApplicationType } from '../../types/telemetry';

export default function ApplicationViewerModal() {
  const theme = useStore((state) => state.theme);
  const isLight = theme === 'light';

  const activeApplication = useStore((state) => state.activeApplication);
  const setActiveApplication = useStore((state) => state.setActiveApplication);
  const topicNodes = useStore((state) => state.topicNodes);
  const setActiveNote = useStore((state) => state.setActiveNote);
  const selectedTopicId = useStore((state) => state.selectedTopicId);
  const setSelectedTopicId = useStore((state) => state.setSelectedTopicId);

  const [selectedSubgraphTopicId, setSelectedSubgraphTopicId] = useState<string | null>(null);

  // Reset selected subgraph node when active application changes
  useEffect(() => {
    setSelectedSubgraphTopicId(null);
  }, [activeApplication?.id]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeApplication) {
        setActiveApplication(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeApplication, setActiveApplication]);

  const relevantNodes = useMemo(() => {
    if (!activeApplication) return [];
    const idSet = new Set(activeApplication.topicIds);
    return topicNodes.filter((n) => idSet.has(n.id));
  }, [topicNodes, activeApplication]);

  const accentColor = useMemo(() => {
    return isLight ? '#0284c7' : '#00f0ff';
  }, [isLight]);

  const difficultyBadge = (diff: ApplicationDifficulty) => {
    const colorMap: Record<ApplicationDifficulty, { bg: string; text: string; border: string }> = {
      BEGINNER: {
        bg: isLight ? 'bg-emerald-50' : 'bg-emerald-950/40',
        text: isLight ? 'text-emerald-700' : 'text-emerald-400',
        border: isLight ? 'border-emerald-200' : 'border-emerald-500/30'
      },
      INTERMEDIATE: {
        bg: isLight ? 'bg-amber-50' : 'bg-amber-950/40',
        text: isLight ? 'text-amber-700' : 'text-amber-400',
        border: isLight ? 'border-amber-200' : 'border-amber-500/30'
      },
      ADVANCED: {
        bg: isLight ? 'bg-rose-50' : 'bg-rose-950/40',
        text: isLight ? 'text-rose-700' : 'text-rose-400',
        border: isLight ? 'border-rose-200' : 'border-rose-500/30'
      }
    };
    const c = colorMap[diff] || colorMap.INTERMEDIATE;
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${c.bg} ${c.text} ${c.border}`}>
        {diff}
      </span>
    );
  };

  const typeBadge = (type: ApplicationType) => {
    const labels: Record<ApplicationType, string> = {
      CASE_STUDY: 'Case Study',
      INTERVIEW_PROBLEM: 'Interview Problem',
      PROJECT_BLUEPRINT: 'Project Blueprint'
    };
    return (
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border ${
          isLight
            ? 'bg-sky-50 text-sky-700 border-sky-200'
            : 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30'
        }`}
      >
        {labels[type] || type}
      </span>
    );
  };

  const handleOpenConceptNote = (topicId: string) => {
    const node = topicNodes.find((n) => n.id === topicId);
    if (!node) return;
    setSelectedTopicId(node.id);
    if (node.notes && node.notes.length > 0) {
      setActiveApplication(null);
      setActiveNote(node.notes[0]);
    }
  };

  return (
    <AnimatePresence>
      {activeApplication && (
        <motion.aside
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '-100%', opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          data-testid="application-viewer-modal"
          className={`fixed top-0 bottom-0 left-0 w-full md:w-1/2 z-30 flex flex-col border-r shadow-2xl overflow-hidden backdrop-blur-xl transition-colors pointer-events-auto ${
            isLight
              ? 'bg-white/95 border-slate-300 text-slate-900'
              : 'bg-[#070b16]/95 border-white/10 text-slate-100'
          }`}
        >
        {/* Top Header Bar */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 select-none shrink-0 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-white/10'
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {typeBadge(activeApplication.type)}
              {difficultyBadge(activeApplication.difficulty)}
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-medium ${
                  isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-800 border-white/10 text-slate-300'
                }`}
              >
                {activeApplication.domain}
              </span>
              {activeApplication.organization && (
                <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <Building size={11} className="opacity-70" />
                  <span>{activeApplication.organization}</span>
                </span>
              )}
              <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Clock size={11} className="opacity-70" />
                <span>{activeApplication.readTimeMinutes} min read</span>
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate text-slate-900 dark:text-white">
              {activeApplication.title}
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {activeApplication.externalUrl && (
              <a
                href={activeApplication.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-1.5 px-2.5 rounded-lg border transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    : 'bg-slate-800 hover:bg-slate-700 border-white/10 text-slate-300'
                }`}
                title="Open original source"
              >
                <ExternalLink size={13} />
                <span className="hidden sm:inline text-[11px]">Source</span>
              </a>
            )}
            <button
              onClick={() => setActiveApplication(null)}
              className={`p-1.5 px-2.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium ${
                isLight
                  ? 'bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border-slate-300 text-slate-700'
                  : 'bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 border-white/10 text-slate-300'
              }`}
              title="Close viewer (Esc)"
            >
              <X size={15} />
              <span className="text-[11px]">Close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 overscroll-contain">
          {/* Executive Context */}
          <div
            className={`p-3.5 rounded-xl border mb-5 text-xs leading-relaxed ${
              isLight
                ? 'bg-sky-50/70 border-sky-200 text-sky-900'
                : 'bg-cyan-950/20 border-cyan-500/20 text-cyan-200'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-[10.5px] uppercase font-mono mb-1">
              <Sparkles size={12} />
              <span>Executive Context</span>
            </div>
            <p>{activeApplication.summary}</p>
          </div>

          {/* Rendered Markdown Body */}
          <div className="max-w-none mb-8">
            <MarkdownContent
              content={activeApplication.content}
              accentColor={accentColor}
            />
          </div>

          {/* Connected Concepts Section */}
          <div className={`pt-5 border-t space-y-3 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Layers size={13} className="text-cyan-500" />
                <span>Connected Concepts ({relevantNodes.length})</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                Highlighted in right 3D graph
              </span>
            </div>

            {/* Visual Subgraph Overview */}
            <ApplicationSubgraph
              topicIds={activeApplication.topicIds}
              selectedTopicId={selectedSubgraphTopicId || selectedTopicId}
              onSelectTopic={(id) => {
                setSelectedSubgraphTopicId(id);
                setSelectedTopicId(id);
              }}
            />

            {/* Concept Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {relevantNodes.map((node) => {
                const nodeColor = getCategoryShade(node.id, node.category, theme);
                const isSelected = selectedSubgraphTopicId === node.id || selectedTopicId === node.id;

                return (
                  <div
                    key={node.id}
                    onClick={() => {
                      setSelectedSubgraphTopicId(node.id);
                      setSelectedTopicId(node.id);
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? isLight
                          ? 'bg-white border-sky-400 shadow-md ring-1 ring-sky-300'
                          : 'bg-slate-900 border-cyan-400/80 shadow-lg shadow-cyan-950/50'
                        : isLight
                        ? 'bg-white/90 hover:bg-white border-slate-200 shadow-sm'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: nodeColor }}
                        />
                        <span className="font-bold text-xs truncate text-slate-900 dark:text-slate-100">
                          {node.name}
                        </span>
                      </div>
                      <span
                        className="text-[9.5px] font-mono px-1 py-0.2 rounded font-medium shrink-0"
                        style={{
                          color: nodeColor,
                          backgroundColor: `${nodeColor}15`
                        }}
                      >
                        {node.mastery}%
                      </span>
                    </div>

                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-2 leading-snug">
                      {node.summary}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5 text-[10px] font-mono">
                      <span className="text-slate-400 uppercase text-[9px]">{node.category}</span>
                      {node.notes && node.notes.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenConceptNote(node.id);
                          }}
                          className="flex items-center gap-1 text-sky-600 dark:text-cyan-400 hover:underline cursor-pointer"
                          title="Open concept study notes"
                        >
                          <FileText size={10} />
                          <span>Study Note</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.aside>
      )}
    </AnimatePresence>
  );
}
