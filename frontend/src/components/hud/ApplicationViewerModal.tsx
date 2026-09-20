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
  HelpCircle,
  Compass,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getCategoryShade } from '../../utils/theme';
import { MarkdownContent } from './MarkdownContent';
import { ApplicationSubgraph } from './ApplicationSubgraph';
import { QuizViewer } from './QuizViewer';
import { ApplicationDifficulty, ApplicationType, ApplicationItem } from '../../types/telemetry';

export default function ApplicationViewerModal() {
  const theme = useStore((state) => state.theme);
  const isLight = theme === 'light';

  const activeApplication = useStore((state) => state.activeApplication);
  const setActiveApplication = useStore((state) => state.setActiveApplication);
  const applications = useStore((state) => state.applications);
  const topicNodes = useStore((state) => state.topicNodes);
  const setActiveNote = useStore((state) => state.setActiveNote);
  const selectedTopicId = useStore((state) => state.selectedTopicId);
  const setSelectedTopicId = useStore((state) => state.setSelectedTopicId);
  const setIsInspectorOpen = useStore((state) => state.setIsInspectorOpen);

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'QUIZ'>('OVERVIEW');
  const [selectedSubgraphTopicId, setSelectedSubgraphTopicId] = useState<string | null>(null);
  const [navHistory, setNavHistory] = useState<ApplicationItem[]>([]);

  // Reset tab and selected subgraph node when active application changes
  useEffect(() => {
    setActiveTab('OVERVIEW');
    setSelectedSubgraphTopicId(null);
  }, [activeApplication?.id]);

  // Reset history when viewer is closed
  useEffect(() => {
    if (!activeApplication) {
      setNavHistory([]);
    }
  }, [activeApplication]);

  const handleNavigateApplication = (appIdentifier: string) => {
    if (!activeApplication) return;
    let clean = appIdentifier;
    try {
      clean = decodeURIComponent(appIdentifier);
    } catch {
      // Keep as-is if malformed
    }
    clean = clean.trim().toLowerCase();

    // 1. Exact ID or Title match
    let target = applications.find(
      (app) => app.id.toLowerCase() === clean || app.title.toLowerCase() === clean
    );

    // 2. Substring inclusion match
    if (!target) {
      target = applications.find(
        (app) =>
          app.title.toLowerCase().includes(clean) ||
          clean.includes(app.title.toLowerCase())
      );
    }

    // 3. Token-based matching
    if (!target) {
      const cleanTokens = clean.replace(/[^a-z0-9]/gi, ' ').split(/\s+/).filter(Boolean);
      target = applications.find((app) => {
        const appTokens = `${app.id} ${app.title}`.toLowerCase().replace(/[^a-z0-9]/gi, ' ').split(/\s+/).filter(Boolean);
        return cleanTokens.length > 0 && cleanTokens.every((token) => appTokens.includes(token));
      });
    }

    if (target && target.id !== activeApplication.id) {
      setNavHistory((prev) => [...prev, activeApplication]);
      setActiveApplication(target);
    }
  };

  const handleGoBack = () => {
    if (navHistory.length === 0) return;
    const prevApp = navHistory[navHistory.length - 1];
    setNavHistory((prev) => prev.slice(0, -1));
    setActiveApplication(prevApp);
  };

  const handleNavigateConcept = (topicIdentifier: string) => {
    let clean = topicIdentifier;
    try {
      clean = decodeURIComponent(topicIdentifier);
    } catch {
      // Keep as-is if malformed
    }
    clean = clean.trim().toLowerCase();

    // 1. Exact ID or Name match
    let target = topicNodes.find(
      (n) => n.id.toLowerCase() === clean || n.name.toLowerCase() === clean
    );

    // 2. Substring inclusion match (e.g. "B-Trees" in "B-Trees & B+ Trees")
    if (!target) {
      target = topicNodes.find(
        (n) =>
          n.name.toLowerCase().includes(clean) ||
          clean.includes(n.name.toLowerCase())
      );
    }

    // 3. Token-based matching (e.g. ignoring special characters like & or + or parentheses)
    if (!target) {
      const cleanTokens = clean.replace(/[^a-z0-9]/gi, ' ').split(/\s+/).filter(Boolean);
      target = topicNodes.find((n) => {
        const nodeTokens = `${n.id} ${n.name}`.toLowerCase().replace(/[^a-z0-9]/gi, ' ').split(/\s+/).filter(Boolean);
        return cleanTokens.length > 0 && cleanTokens.every((token) => nodeTokens.includes(token));
      });
    }

    if (target) {
      setSelectedSubgraphTopicId(target.id);
      setSelectedTopicId(target.id);
      setIsInspectorOpen(true);
    }
  };

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
              {navHistory.length > 0 && (
                <button
                  type="button"
                  data-testid="application-back-button"
                  onClick={handleGoBack}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold border transition-all cursor-pointer select-none ${
                    isLight
                      ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200 shadow-2xs'
                      : 'bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border-cyan-500/30 shadow-[0_0_8px_rgba(0,240,255,0.15)]'
                  }`}
                  title={`Go back to ${navHistory[navHistory.length - 1]?.title}`}
                >
                  <ArrowLeft size={11} />
                  <span>Back</span>
                </button>
              )}
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

          {/* Action Buttons & Tab Switchers */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Tab switchers if application has quizzes */}
            {activeApplication.quizzes && activeApplication.quizzes.length > 0 && (
              <div
                className={`flex items-center p-0.5 rounded-lg border text-[11px] font-mono ${
                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800/90 border-white/10'
                }`}
                data-testid="application-tab-switcher"
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('OVERVIEW')}
                  style={{
                    backgroundColor: activeTab === 'OVERVIEW' ? `${accentColor}22` : 'transparent',
                    color: activeTab === 'OVERVIEW' ? accentColor : isLight ? '#475569' : '#94a3b8'
                  }}
                  className="px-2.5 py-1 rounded font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  data-testid="application-tab-overview"
                >
                  <FileText size={12} />
                  <span>OVERVIEW</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('QUIZ')}
                  style={{
                    backgroundColor: activeTab === 'QUIZ' ? `${accentColor}22` : 'transparent',
                    color: activeTab === 'QUIZ' ? accentColor : isLight ? '#475569' : '#94a3b8'
                  }}
                  className="px-2.5 py-1 rounded font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  data-testid="application-tab-quiz"
                >
                  <HelpCircle size={12} />
                  <span>QUIZ ({activeApplication.quizzes[0].questions.length})</span>
                </button>
              </div>
            )}

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

        {/* Breadcrumbs trail when user has navigated across applications */}
        {navHistory.length > 0 && (
          <div
            data-testid="application-breadcrumbs"
            className={`px-5 py-1.5 border-b text-[10.5px] font-mono flex items-center gap-1.5 overflow-x-auto shrink-0 select-none ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-950/60 border-white/5 text-slate-400'
            }`}
          >
            <span className="text-slate-400 dark:text-slate-500 shrink-0">TRAIL:</span>
            {navHistory.map((item, idx) => (
              <React.Fragment key={item.id + idx}>
                <button
                  type="button"
                  onClick={() => {
                    const newHistory = navHistory.slice(0, idx);
                    setNavHistory(newHistory);
                    setActiveApplication(item);
                  }}
                  className="hover:underline truncate max-w-[130px] shrink-0 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  title={item.title}
                >
                  {item.title}
                </button>
                <ChevronRight size={10} className="shrink-0 text-slate-400" />
              </React.Fragment>
            ))}
            <span className={`font-semibold truncate max-w-[150px] shrink-0 ${isLight ? 'text-sky-700' : 'text-cyan-300'}`}>
              {activeApplication.title}
            </span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 overscroll-contain flex flex-col">
          {activeTab === 'QUIZ' && activeApplication.quizzes && activeApplication.quizzes.length > 0 ? (
            /* QUIZ VIEW TAB */
            <div className="flex-1 space-y-6" data-testid="application-quiz-container">
              <QuizViewer
                questions={activeApplication.quizzes[0].questions}
                accentColor={accentColor}
                topicTitle={activeApplication.title}
              />

              {/* Connected Concepts Quick-Reference Bar */}
              <div className={`pt-5 border-t space-y-3 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Layers size={13} className="text-cyan-500" />
                    <span>Relevant Concept Nodes ({relevantNodes.length})</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    Cross-reference with 3D graph
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                          isSelected
                            ? isLight
                              ? 'bg-white border-sky-400 shadow-md ring-1 ring-sky-300'
                              : 'bg-slate-900 border-cyan-400/80 shadow-lg shadow-cyan-950/50'
                            : isLight
                            ? 'bg-white/90 hover:bg-white border-slate-200 shadow-sm'
                            : 'bg-slate-900/60 hover:bg-slate-900 border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: nodeColor }} />
                          <span className="font-semibold truncate text-slate-900 dark:text-slate-100">
                            {node.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-2">
                          {node.mastery}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* OVERVIEW TAB (DEFAULT) */
            <>
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
                  onNavigateApplication={handleNavigateApplication}
                  onNavigateConcept={handleNavigateConcept}
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
                    setIsInspectorOpen(true);
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
                          setIsInspectorOpen(true);
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
            </>
          )}
        </div>
      </motion.aside>
      )}
    </AnimatePresence>
  );
}
