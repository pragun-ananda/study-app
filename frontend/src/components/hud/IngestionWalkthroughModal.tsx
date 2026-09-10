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
  FolderGit2
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { GraphUpdate } from '../../types/telemetry';

export default function IngestionWalkthroughModal() {
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#080c16]/95 border border-[#00f0ff]/40 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.18)] backdrop-blur-2xl overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="walkthrough-modal-title"
          data-testid="ingestion-walkthrough-modal"
        >
          {/* Top Neon Accent */}
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent" />

          {/* Modal Header */}
          <div className="p-4 sm:p-5 bg-slate-950/90 border-b border-white/10 flex items-start justify-between gap-4 flex-shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/30 tracking-wider">
                  <Sparkles size={12} className="animate-spin-slow" />
                  AI WALKTHROUGH
                </span>
                {sourceMetadata?.domain && (
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-white/5">
                    {sourceMetadata.domain}
                  </span>
                )}
              </div>

              <h2
                id="walkthrough-modal-title"
                className="text-base sm:text-lg font-black text-slate-100 tracking-wide flex items-center gap-2 mt-1"
              >
                {sourceMetadata?.title || 'Ingested Source Walkthrough'}
                {queueItem.sourceUrl && (
                  <a
                    href={queueItem.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-500 hover:text-[#00f0ff] transition-colors"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00ff9d]/20 hover:bg-[#00ff9d]/30 text-[#00ff9d] border border-[#00ff9d]/40 text-xs font-bold transition-all shadow-[0_0_12px_rgba(0,255,157,0.2)] cursor-pointer"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff3366]/20 hover:bg-[#ff3366]/30 text-[#ff3366] border border-[#ff3366]/40 text-xs font-bold transition-all cursor-pointer"
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
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-white/10 transition-all cursor-pointer"
                aria-label="Close Walkthrough"
                data-testid="close-walkthrough-modal-btn"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Modal Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 overscroll-contain">
            {/* Executive Summary Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#00f0ff]/10 via-slate-950/60 to-transparent border border-[#00f0ff]/30 shadow-inner">
              <div className="flex items-center gap-2 mb-2">
                <Database size={15} className="text-[#00f0ff]" />
                <h3 className="text-xs font-extrabold text-[#00f0ff] uppercase tracking-wider">
                  Summary & Key Takeaways
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                {walkthrough?.executiveSummary ||
                  'Content was processed and organized into clear knowledge graph topics with complete study notes and quizzes.'}
              </p>
            </div>

            {/* Two-Column Grid: Extracted Concepts vs Omitted Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: What Was Extracted */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-[#00ff9d]/30 flex flex-col">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                  <ShieldCheck size={16} className="text-[#00ff9d]" />
                  <h4 className="text-xs font-black text-[#00ff9d] uppercase tracking-wider">
                    Core Content Extracted ({walkthrough?.extractedConcepts?.length || 0})
                  </h4>
                </div>

                <div className="space-y-3 flex-1">
                  {walkthrough?.extractedConcepts && walkthrough.extractedConcepts.length > 0 ? (
                    walkthrough.extractedConcepts.map((concept, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-900/70 border border-white/5 space-y-1 hover:border-[#00ff9d]/30 transition-all"
                      >
                        <p className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d]" />
                          {concept.name}
                        </p>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {concept.rationale}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">No specific concept breakdown available.</p>
                  )}
                </div>
              </div>

              {/* Right: What Was Omitted & Why */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-[#ffaa00]/30 flex flex-col">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                  <MinusCircle size={16} className="text-[#ffaa00]" />
                  <h4 className="text-xs font-black text-[#ffaa00] uppercase tracking-wider">
                    Deliberately Omitted / Pruned ({walkthrough?.omittedContent?.length || 0})
                  </h4>
                </div>

                <div className="space-y-3 flex-1">
                  {walkthrough?.omittedContent && walkthrough.omittedContent.length > 0 ? (
                    walkthrough.omittedContent.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-900/70 border border-white/5 space-y-1 hover:border-[#ffaa00]/30 transition-all"
                      >
                        <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ffaa00]" />
                          {item.contentSnippetOrTheme}
                        </p>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          <span className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider mr-1">
                            Reason:
                          </span>
                          {item.reason}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">No fluff or irrelevant themes pruned.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quiz Coverage Justification */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-purple-500/30 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <HelpCircle size={16} className="text-purple-400" />
                <h4 className="text-xs font-black text-purple-300 uppercase tracking-wider">
                  Quiz & Practice Questions
                </h4>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {walkthrough?.quizCoverageJustification?.completenessRationale ||
                  'Questions test your understanding of the core concepts, real-world trade-offs, and common pitfalls.'}
              </p>

              {walkthrough?.quizCoverageJustification?.testedFailureModes &&
                walkthrough.quizCoverageJustification.testedFailureModes.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <AlertTriangle size={11} className="text-[#ffaa00]" />
                      Tested Edge Cases & Failure Modes:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {walkthrough.quizCoverageJustification.testedFailureModes.map((mode, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[11px] bg-purple-500/10 text-purple-300 border border-purple-500/20"
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
                  <Layers size={15} className="text-[#00f0ff]" />
                  <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                    Proposed Knowledge Graph Updates ({itemUpdates.length})
                  </h4>
                </div>
                {groupedTopicUpdates.length > 1 && (
                  <span className="text-[10px] font-mono text-slate-400">
                    Across {groupedTopicUpdates.length} Topics
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {groupedTopicUpdates.map((group) => (
                  <div
                    key={group.topicKey}
                    className="rounded-xl bg-slate-950/70 border border-white/10 overflow-hidden shadow-lg"
                    data-testid={`walkthrough-topic-group-${group.topicKey}`}
                  >
                    {/* Topic Node Card Header */}
                    <div className="px-3.5 py-2 bg-slate-900/90 border-b border-white/5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderGit2 size={13} className="text-[#00f0ff] flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-100 truncate">
                          {group.topicName}
                        </span>
                        {group.category && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/5 text-slate-300 border border-white/10">
                            {group.category}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
                        {group.updates.length} {group.updates.length === 1 ? 'part' : 'parts'}
                      </span>
                    </div>

                    {/* Grouped Topic Updates (Topic Update, Note Update, Quiz Update, etc.) */}
                    <div className="p-2 space-y-2">
                      {group.updates.map((update) => (
                        <div
                          key={update.id}
                          className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5 hover:border-[#00f0ff]/30 transition-all flex items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                  update.type === 'TOPIC_UPDATE'
                                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                    : update.type === 'NOTE_UPDATE'
                                    ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                                    : update.type === 'QUIZ_UPDATE'
                                    ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                }`}
                              >
                                {update.type.replace('_', ' ')}
                              </span>
                              <span className="text-xs font-semibold text-slate-200 truncate">
                                {update.title}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">
                              {update.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {update.status === 'APPROVED' ? (
                              <span className="text-[10px] text-[#00ff9d] font-bold flex items-center gap-1">
                                <CheckCircle2 size={12} /> APPROVED
                              </span>
                            ) : update.status === 'REJECTED' ? (
                              <span className="text-[10px] text-[#ff3366] font-bold flex items-center gap-1">
                                <XCircle size={12} /> REJECTED
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDiffUpdateId(update.id);
                                  setActiveWalkthroughQueueId(null);
                                }}
                                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/15 text-[11px] font-bold transition-all cursor-pointer"
                              >
                                Review Diff
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-3 bg-slate-950/90 border-t border-white/10 flex items-center justify-end text-xs text-slate-500">
            <button
              type="button"
              onClick={() => setActiveWalkthroughQueueId(null)}
              className="px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
