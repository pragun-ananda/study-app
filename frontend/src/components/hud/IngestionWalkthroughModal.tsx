import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  MinusCircle,
  HelpCircle,
  Layers,
  Database,
  Check,
  FolderGit2,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { GraphUpdate } from '../../types/telemetry';
import { MarkdownContent } from './MarkdownContent';
import { QuizViewer } from './QuizViewer';

export default function IngestionWalkthroughModal() {
  const theme = useStore((state) => state.theme);
  const isLight = theme === 'light';

  const activeWalkthroughQueueId = useStore((state) => state.activeWalkthroughQueueId);
  const setActiveWalkthroughQueueId = useStore((state) => state.setActiveWalkthroughQueueId);
  const queueItems = useStore((state) => state.queueItems);
  const graphUpdates = useStore((state) => state.graphUpdates);
  const approveEntireQueueItem = useStore((state) => state.approveEntireQueueItem);
  const rejectEntireQueueItem = useStore((state) => state.rejectEntireQueueItem);
  const setActiveDiffUpdateId = useStore((state) => state.setActiveDiffUpdateId);

  // Find corresponding queue item
  const queueItem = useMemo(
    () => queueItems.find((q) => q.id === activeWalkthroughQueueId),
    [queueItems, activeWalkthroughQueueId]
  );

  const walkthrough = queueItem?.walkthrough;
  const sourceMetadata = queueItem?.sourceMetadata;
  const itemUpdates = useMemo(
    () =>
      queueItem?.updates?.length
        ? queueItem.updates
        : graphUpdates.filter((u) => u.queueId === activeWalkthroughQueueId),
    [queueItem, graphUpdates, activeWalkthroughQueueId]
  );

  const pendingCount = itemUpdates.filter((u) => u.status === 'PENDING').length;
  const [expandedPreviewUpdateId, setExpandedPreviewUpdateId] = React.useState<string | null>(null);

  const togglePreview = (updateId: string) => {
    setExpandedPreviewUpdateId((prev) => (prev === updateId ? null : updateId));
  };

  // Group updates by topic node
  const groupedTopicUpdates = useMemo(() => {
    const groupsMap = new Map<
      string,
      {
        topicKey: string;
        topicName: string;
        category?: string;
        updates: GraphUpdate[];
      }
    >();

    for (const update of itemUpdates) {
      const topicKey =
        update.payload?.topicId ||
        (update.type === 'TOPIC_UPDATE' || update.type === 'NOTE_UPDATE' || update.type === 'QUIZ_UPDATE'
          ? update.targetId
          : update.targetName || update.targetId || 'general');

      const topicName =
        update.targetName ||
        update.payload?.patch?.name ||
        (update.type === 'EDGE_UPDATE' ? 'Graph Relationships' : 'General Updates');

      if (!groupsMap.has(topicKey)) {
        groupsMap.set(topicKey, {
          topicKey,
          topicName,
          category: update.category,
          updates: []
        });
      }

      groupsMap.get(topicKey)!.updates.push(update);
    }

    return Array.from(groupsMap.values());
  }, [itemUpdates]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeWalkthroughQueueId) {
        setActiveWalkthroughQueueId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeWalkthroughQueueId, setActiveWalkthroughQueueId]);

  if (!activeWalkthroughQueueId || !queueItem) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col border rounded-2xl overflow-hidden backdrop-blur-2xl shadow-2xl ${
            isLight
              ? 'bg-white/95 border-slate-200 text-slate-900'
              : 'bg-[#080c16]/95 border-[#00f0ff]/40 text-slate-100 shadow-[0_0_50px_rgba(0,240,255,0.18)]'
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="walkthrough-modal-title"
          data-testid="ingestion-walkthrough-modal"
        >
          {/* Top Neon Accent */}
          <div className={`h-1 w-full bg-gradient-to-r from-transparent ${
            isLight ? 'via-sky-500' : 'via-[#00f0ff]'
          } to-transparent`} />

          {/* Modal Header */}
          <div className={`p-4 sm:p-5 border-b flex items-start justify-between gap-4 flex-shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/90 border-white/10'
          }`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold border tracking-wider ${
                  isLight
                    ? 'bg-sky-100 text-sky-800 border-sky-300'
                    : 'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/30'
                }`}>
                  <Sparkles size={12} className="animate-spin-slow" />
                  AI WALKTHROUGH
                </span>
                {sourceMetadata?.domain && (
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                    isLight
                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                      : 'bg-slate-900/80 text-slate-400 border-white/5'
                  }`}>
                    {sourceMetadata.domain}
                  </span>
                )}
              </div>

              <h2
                id="walkthrough-modal-title"
                className={`text-base sm:text-lg font-black tracking-wide flex items-center gap-2 mt-1 ${
                  isLight ? 'text-slate-900' : 'text-slate-100'
                }`}
              >
                {sourceMetadata?.title || 'Ingested Source Walkthrough'}
                {queueItem.sourceUrl && (
                  <a
                    href={queueItem.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`transition-colors ${isLight ? 'text-slate-400 hover:text-sky-600' : 'text-slate-500 hover:text-[#00f0ff]'}`}
                    title="Open original source URL"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </h2>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {pendingCount > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      approveEntireQueueItem(queueItem.id);
                      setActiveWalkthroughQueueId(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      isLight
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm'
                        : 'bg-[#00ff9d]/20 hover:bg-[#00ff9d]/30 text-[#00ff9d] border-[#00ff9d]/40 shadow-[0_0_12px_rgba(0,255,157,0.2)]'
                    }`}
                    data-testid="walkthrough-approve-all-btn"
                  >
                    <Check size={13} />
                    Approve All ({pendingCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      rejectEntireQueueItem(queueItem.id);
                      setActiveWalkthroughQueueId(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      isLight
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
                        : 'bg-[#ff3366]/20 hover:bg-[#ff3366]/30 text-[#ff3366] border-[#ff3366]/40'
                    }`}
                    data-testid="walkthrough-reject-all-btn"
                  >
                    <X size={13} />
                    Reject All
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setActiveWalkthroughQueueId(null)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  isLight
                    ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 border-transparent hover:border-slate-200'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border-transparent hover:border-white/10'
                }`}
                aria-label="Close Walkthrough"
                data-testid="close-walkthrough-modal-btn"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Modal Body - Scrollable */}
          <div className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 overscroll-contain ${
            isLight ? 'text-slate-800' : 'text-slate-200'
          }`}>
            {/* Executive Summary Card */}
            <div className={`p-4 rounded-xl border shadow-inner ${
              isLight
                ? 'bg-gradient-to-br from-sky-50 via-slate-50 to-white border-sky-200'
                : 'bg-gradient-to-br from-[#00f0ff]/10 via-slate-950/60 to-transparent border-[#00f0ff]/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Database size={15} className={isLight ? 'text-sky-600' : 'text-[#00f0ff]'} />
                <h3 className={`text-xs font-extrabold uppercase tracking-wider ${
                  isLight ? 'text-sky-800' : 'text-[#00f0ff]'
                }`}>
                  Summary & Key Takeaways
                </h3>
              </div>
              <p className={`text-xs sm:text-sm leading-relaxed font-sans ${
                isLight ? 'text-slate-700' : 'text-slate-200'
              }`}>
                {walkthrough?.executiveSummary ||
                  'Content was processed and organized into clear knowledge graph topics with complete study notes and quizzes.'}
              </p>
            </div>

            {/* Two-Column Grid: Extracted Concepts vs Omitted Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: What Was Extracted */}
              <div className={`p-4 rounded-xl border flex flex-col ${
                isLight ? 'bg-slate-50/70 border-emerald-300' : 'bg-slate-950/60 border-[#00ff9d]/30'
              }`}>
                <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${
                  isLight ? 'border-slate-200' : 'border-white/5'
                }`}>
                  <ShieldCheck size={16} className={isLight ? 'text-emerald-600' : 'text-[#00ff9d]'} />
                  <h4 className={`text-xs font-black uppercase tracking-wider ${
                    isLight ? 'text-emerald-800' : 'text-[#00ff9d]'
                  }`}>
                    Core Content Extracted ({walkthrough?.extractedConcepts?.length || 0})
                  </h4>
                </div>

                <div className="space-y-3 flex-1">
                  {walkthrough?.extractedConcepts && walkthrough.extractedConcepts.length > 0 ? (
                    walkthrough.extractedConcepts.map((concept, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border space-y-1 transition-all ${
                          isLight
                            ? 'bg-white border-slate-200 hover:border-emerald-400'
                            : 'bg-slate-900/70 border-white/5 hover:border-[#00ff9d]/30'
                        }`}
                      >
                        <p className={`text-xs font-bold flex items-center gap-1.5 ${
                          isLight ? 'text-slate-900' : 'text-slate-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-emerald-600' : 'bg-[#00ff9d]'}`} />
                          {concept.name}
                        </p>
                        <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          {concept.rationale}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className={`text-xs italic ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>No specific concept breakdown available.</p>
                  )}
                </div>
              </div>

              {/* Right: What Was Omitted & Why */}
              <div className={`p-4 rounded-xl border flex flex-col ${
                isLight ? 'bg-slate-50/70 border-amber-300' : 'bg-slate-950/60 border-[#ffaa00]/30'
              }`}>
                <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${
                  isLight ? 'border-slate-200' : 'border-white/5'
                }`}>
                  <MinusCircle size={16} className={isLight ? 'text-amber-600' : 'text-[#ffaa00]'} />
                  <h4 className={`text-xs font-black uppercase tracking-wider ${
                    isLight ? 'text-amber-800' : 'text-[#ffaa00]'
                  }`}>
                    Deliberately Omitted / Pruned ({walkthrough?.omittedContent?.length || 0})
                  </h4>
                </div>

                <div className="space-y-3 flex-1">
                  {walkthrough?.omittedContent && walkthrough.omittedContent.length > 0 ? (
                    walkthrough.omittedContent.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border space-y-1 transition-all ${
                          isLight
                            ? 'bg-white border-slate-200 hover:border-amber-400'
                            : 'bg-slate-900/70 border-white/5 hover:border-[#ffaa00]/30'
                        }`}
                      >
                        <p className={`text-xs font-bold flex items-center gap-1.5 ${
                          isLight ? 'text-slate-900' : 'text-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-amber-500' : 'bg-[#ffaa00]'}`} />
                          {item.contentSnippetOrTheme}
                        </p>
                        <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          <span className={`font-semibold uppercase text-[9px] tracking-wider mr-1 ${
                            isLight ? 'text-slate-500' : 'text-slate-500'
                          }`}>
                            Reason:
                          </span>
                          {item.reason}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className={`text-xs italic ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>No fluff or irrelevant themes pruned.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quiz Coverage Justification */}
            <div className={`p-4 rounded-xl border space-y-3 ${
              isLight ? 'bg-purple-50/60 border-purple-200' : 'bg-slate-950/70 border-purple-500/30'
            }`}>
              <div className={`flex items-center gap-2 pb-2 border-b ${
                isLight ? 'border-purple-200/60' : 'border-white/5'
              }`}>
                <HelpCircle size={16} className={isLight ? 'text-purple-600' : 'text-purple-400'} />
                <h4 className={`text-xs font-black uppercase tracking-wider ${
                  isLight ? 'text-purple-900' : 'text-purple-300'
                }`}>
                  Quiz & Practice Questions
                </h4>
              </div>

              <p className={`text-xs leading-relaxed ${
                isLight ? 'text-slate-700' : 'text-slate-300'
              }`}>
                {walkthrough?.quizCoverageJustification?.completenessRationale ||
                  'Questions test your understanding of the core concepts, real-world trade-offs, and common pitfalls.'}
              </p>

              {walkthrough?.quizCoverageJustification?.testedFailureModes &&
                walkthrough.quizCoverageJustification.testedFailureModes.length > 0 && (
                  <div className="pt-2">
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1 ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      <AlertTriangle size={11} className={isLight ? 'text-amber-600' : 'text-[#ffaa00]'} />
                      Tested Edge Cases & Failure Modes:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {walkthrough.quizCoverageJustification.testedFailureModes.map((mode, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 rounded text-[11px] border ${
                            isLight
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                          }`}
                        >
                          {mode}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Nested Staged Updates List Grouped by Topic Node */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={15} className={isLight ? 'text-sky-600' : 'text-[#00f0ff]'} />
                  <h4 className={`text-xs font-extrabold uppercase tracking-wider ${
                    isLight ? 'text-slate-800' : 'text-slate-200'
                  }`}>
                    Proposed Knowledge Graph Updates ({itemUpdates.length})
                  </h4>
                </div>
                {groupedTopicUpdates.length > 1 && (
                  <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Across {groupedTopicUpdates.length} Topics
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {groupedTopicUpdates.map((group) => (
                  <div
                    key={group.topicKey}
                    className={`rounded-xl border overflow-hidden shadow-sm ${
                      isLight ? 'bg-white border-slate-200' : 'bg-slate-950/70 border-white/10 shadow-lg'
                    }`}
                    data-testid={`walkthrough-topic-group-${group.topicKey}`}
                  >
                    {/* Topic Node Card Header */}
                    <div className={`px-3.5 py-2 border-b flex items-center justify-between gap-2 ${
                      isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-slate-900/90 border-white/5'
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderGit2 size={13} className={`flex-shrink-0 ${isLight ? 'text-sky-600' : 'text-[#00f0ff]'}`} />
                        <span className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                          {group.topicName}
                        </span>
                        {group.category && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                            isLight ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-white/5 text-slate-300 border border-white/10'
                          }`}>
                            {group.category}
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-mono flex-shrink-0 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        {group.updates.length} {group.updates.length === 1 ? 'part' : 'parts'}
                      </span>
                    </div>

                    {/* Grouped Topic Updates (Topic Update, Note Update, Quiz Update, etc.) */}
                    <div className="p-2 space-y-2">
                      {group.updates.map((update) => {
                        const isExpanded = expandedPreviewUpdateId === update.id;
                        const patchObj = (update.payload?.patch || update.payload?.notePatch || {}) as Record<string, any>;
                        const hasPreviewContent =
                          Boolean(update.newContent) ||
                          Boolean(patchObj.content) ||
                          Boolean(patchObj.summary) ||
                          Boolean(patchObj.description);

                        const previewText =
                          update.newContent ||
                          patchObj.content ||
                          patchObj.summary ||
                          patchObj.description ||
                          '';

                        return (
                          <div
                            key={update.id}
                            className={`rounded-lg border transition-all ${
                              isExpanded
                                ? isLight
                                  ? 'border-sky-400 bg-sky-50/30 shadow-xs'
                                  : 'border-[#00f0ff]/50 bg-slate-950/80 shadow-md'
                                : isLight
                                ? 'bg-slate-50/60 border-slate-200 hover:border-sky-300'
                                : 'bg-slate-950/60 border-white/5 hover:border-[#00f0ff]/30'
                            }`}
                          >
                            <div className="p-2.5 flex items-center justify-between gap-3">
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                      update.type === 'TOPIC_UPDATE'
                                        ? isLight ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                        : update.type === 'NOTE_UPDATE'
                                        ? isLight ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                                        : update.type === 'QUIZ_UPDATE'
                                        ? isLight ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                        : isLight ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                    }`}
                                  >
                                    {update.type.replace('_', ' ')}
                                  </span>
                                  <span className={`text-xs font-semibold truncate ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                                    {update.title}
                                  </span>
                                </div>
                                <p className={`text-[11px] truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                                  {update.description}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {hasPreviewContent && (
                                  <button
                                    type="button"
                                    onClick={() => togglePreview(update.id)}
                                    data-testid={`walkthrough-preview-btn-${update.id}`}
                                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                                      isExpanded
                                        ? isLight
                                          ? 'bg-sky-100 text-sky-800 border-sky-400'
                                          : 'bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/50'
                                        : isLight
                                        ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-white/10 hover:border-[#00f0ff]/30'
                                    }`}
                                  >
                                    <Eye size={12} />
                                    <span>{isExpanded ? 'Hide' : 'Preview'}</span>
                                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                  </button>
                                )}

                                {update.status === 'APPROVED' ? (
                                  <span className={`text-[10px] font-bold flex items-center gap-1 ${
                                    isLight ? 'text-emerald-700' : 'text-[#00ff9d]'
                                  }`}>
                                    <CheckCircle2 size={12} /> APPROVED
                                  </span>
                                ) : update.status === 'REJECTED' ? (
                                  <span className={`text-[10px] font-bold flex items-center gap-1 ${
                                    isLight ? 'text-rose-700' : 'text-[#ff3366]'
                                  }`}>
                                    <XCircle size={12} /> REJECTED
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveDiffUpdateId(update.id);
                                      setActiveWalkthroughQueueId(null);
                                    }}
                                    className={`px-2.5 py-1 rounded border text-[11px] font-bold transition-all cursor-pointer ${
                                      isLight
                                        ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                                        : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-white/15'
                                    }`}
                                  >
                                    Review Diff
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Inline Expandable Drawer */}
                            {isExpanded && (
                              <div
                                className={`border-t overflow-hidden ${
                                  isLight ? 'border-slate-200' : 'border-white/10'
                                }`}
                                data-testid={`walkthrough-inline-preview-${update.id}`}
                              >
                                <div className={`p-4 max-h-[500px] overflow-y-auto ${
                                  isLight ? 'bg-white' : 'bg-slate-950/90'
                                }`}>
                                  {update.type === 'QUIZ_UPDATE' ? (
                                    <QuizViewer
                                      questions={previewText}
                                      accentColor={isLight ? '#7c3aed' : '#a855f7'}
                                    />
                                  ) : (
                                    <MarkdownContent
                                      content={previewText}
                                      accentColor={isLight ? '#0284c7' : '#00f0ff'}
                                    />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className={`p-3 border-t flex items-center justify-end text-xs ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-950/90 border-white/10 text-slate-500'
          }`}>
            <button
              type="button"
              onClick={() => setActiveWalkthroughQueueId(null)}
              className={`px-3 py-1 rounded border text-xs transition-colors cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-white/10'
              }`}
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
