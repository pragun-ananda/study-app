import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCode,
  X,
  Check,
  AlertCircle,
  Eye,
  Columns,
  MessageSquare,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  CornerDownRight,
  Sparkles
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { computeLineDiff } from '../../utils/diff';
import { LineReviewComment, DomainCategory } from '../../types/telemetry';
import { DOMAIN_BASE_COLORS, DOMAIN_LIGHT_COLORS, getCategoryShade } from '../../utils/theme';
import { MarkdownContent } from './MarkdownContent';
import { QuizViewer } from './QuizViewer';

export default function DiffViewerModal() {
  const theme = useStore((state) => state.theme);
  const isLight = theme === 'light';

  const activeDiffUpdateId = useStore((state) => state.activeDiffUpdateId);
  const setActiveDiffUpdateId = useStore((state) => state.setActiveDiffUpdateId);
  const setActiveWalkthroughQueueId = useStore((state) => state.setActiveWalkthroughQueueId);
  const graphUpdates = useStore((state) => state.graphUpdates);
  const approveGraphUpdate = useStore((state) => state.approveGraphUpdate);
  const rejectGraphUpdate = useStore((state) => state.rejectGraphUpdate);
  const requestChangesGraphUpdate = useStore((state) => state.requestChangesGraphUpdate);
  const addCommentToUpdate = useStore((state) => state.addCommentToUpdate);
  const deleteCommentFromUpdate = useStore((state) => state.deleteCommentFromUpdate);

  const [viewMode, setViewMode] = useState<'DIFF' | 'PREVIEW'>('DIFF');
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [draftComment, setDraftComment] = useState('');
  const [draftQuote, setDraftQuote] = useState<string | undefined>(undefined);
  const [generalFeedback, setGeneralFeedback] = useState('');

  const activeUpdate = useMemo(
    () => graphUpdates.find((u) => u.id === activeDiffUpdateId),
    [graphUpdates, activeDiffUpdateId]
  );

  // Sync state when active update changes
  useEffect(() => {
    if (activeUpdate) {
      setViewMode('DIFF');
      setActiveRowIndex(null);
      setDraftComment('');
      setDraftQuote(undefined);
      setGeneralFeedback(activeUpdate.generalFeedback || '');
    }
  }, [activeUpdate?.id]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeDiffUpdateId) {
        if (activeRowIndex !== null) {
          setActiveRowIndex(null);
        } else {
          setActiveDiffUpdateId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDiffUpdateId, activeRowIndex, setActiveDiffUpdateId]);

  // Compute diff lines
  const diffLines = useMemo(() => {
    if (!activeUpdate) return [];
    return computeLineDiff(activeUpdate.oldContent, activeUpdate.newContent);
  }, [activeUpdate?.oldContent, activeUpdate?.newContent]);

  const catColor = useMemo(() => {
    if (!activeUpdate) return isLight ? '#0284c7' : '#00f0ff';
    return getCategoryShade(activeUpdate.id || '', activeUpdate.category as DomainCategory, theme);
  }, [activeUpdate, theme, isLight]);

  if (!activeUpdate) return null;

  const comments = activeUpdate.comments || [];
  const commentsCount = comments.length;

  const handleTextSelection = (rowIndex: number) => {
    const selection = window.getSelection();
    const selected = selection ? selection.toString().trim() : '';
    if (selected) {
      setDraftQuote(selected);
      setActiveRowIndex(rowIndex);
    }
  };

  const handleSaveComment = (lineNum: number) => {
    if (!draftComment.trim()) return;
    addCommentToUpdate(activeUpdate.id, {
      lineNumber: lineNum,
      selectedText: draftQuote,
      comment: draftComment.trim()
    });
    setDraftComment('');
    setDraftQuote(undefined);
    setActiveRowIndex(null);
  };

  const handleRequestChanges = () => {
    requestChangesGraphUpdate(activeUpdate.id, comments, generalFeedback.trim() || undefined);
  };

  return (
    <AnimatePresence>
      {activeDiffUpdateId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 md:p-8 pointer-events-auto font-mono">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setActiveDiffUpdateId(null)}
            className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
          />

          {/* Glowing Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              borderColor: `${catColor}60`,
              boxShadow: isLight
                ? `0 10px 40px rgba(0, 0, 0, 0.15)`
                : `0 0 50px ${catColor}30, 0 0 20px ${catColor}15, inset 0 0 20px ${catColor}08`
            }}
            className={`relative w-full max-w-4xl max-h-[88vh] flex flex-col border rounded-2xl overflow-hidden z-50 shadow-2xl ${
              isLight ? 'bg-white/95 border-slate-200 text-slate-900' : 'bg-[#080c16]/95 border-white/10 text-slate-100'
            }`}
          >
            {/* Top Accent Scanline */}
            <div
              className="h-1 w-full opacity-90"
              style={{
                background: `linear-gradient(90deg, transparent, ${catColor}, transparent)`
              }}
            />

            {/* Modal Header */}
            <div className={`flex items-center justify-between px-5 py-3 border-b flex-shrink-0 gap-3 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'border-white/10 bg-slate-950/80'
            }`}>
              <div className="flex items-center gap-3 truncate">
                <div
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{
                    backgroundColor: `${catColor}18`,
                    borderColor: `${catColor}45`,
                    borderWidth: '1px',
                    color: catColor,
                    boxShadow: isLight ? 'none' : `0 0 12px ${catColor}35`
                  }}
                >
                  <FileCode size={16} />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        backgroundColor: `${catColor}20`,
                        color: catColor,
                        borderColor: `${catColor}40`
                      }}
                      className="px-1.5 py-0.2 rounded text-[10px] font-bold border uppercase"
                    >
                      {activeUpdate.type.replace('_', ' ')}
                    </span>
                    <span className={`text-xs truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Target: {activeUpdate.targetName}
                    </span>
                  </div>
                  <h2 className={`font-bold text-xs uppercase tracking-wider truncate mt-0.5 ${
                    isLight ? 'text-slate-900' : 'text-slate-100'
                  }`}>
                    {activeUpdate.title}
                  </h2>
                </div>
              </div>

              {/* View Switcher & Close */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={`flex items-center p-0.5 rounded-lg border text-[10px] ${
                  isLight ? 'bg-slate-200/70 border-slate-300' : 'bg-slate-900/90 border-white/10'
                }`}>
                  <button
                    type="button"
                    onClick={() => setViewMode('DIFF')}
                    style={{
                      backgroundColor: viewMode === 'DIFF' ? (isLight ? '#ffffff' : `${catColor}25`) : 'transparent',
                      color: viewMode === 'DIFF' ? catColor : (isLight ? '#64748b' : '#94a3b8'),
                      boxShadow: viewMode === 'DIFF' && isLight ? '0 1px 2px rgba(0,0,0,0.06)' : undefined
                    }}
                    className="px-2 py-1 rounded font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Columns size={11} />
                    <span>DIFF VIEW</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('PREVIEW')}
                    style={{
                      backgroundColor: viewMode === 'PREVIEW' ? (isLight ? '#ffffff' : `${catColor}25`) : 'transparent',
                      color: viewMode === 'PREVIEW' ? catColor : (isLight ? '#64748b' : '#94a3b8'),
                      boxShadow: viewMode === 'PREVIEW' && isLight ? '0 1px 2px rgba(0,0,0,0.06)' : undefined
                    }}
                    className="px-2 py-1 rounded font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Eye size={11} />
                    <span>RENDERED PREVIEW</span>
                  </button>
                </div>

                {activeUpdate.queueId && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveWalkthroughQueueId(activeUpdate.queueId!);
                      setActiveDiffUpdateId(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg border font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer ${
                      isLight
                        ? 'border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-700'
                        : 'border-[#00f0ff]/40 bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff]'
                    }`}
                    title="View Pedagogical Source Walkthrough"
                    data-testid="diff-view-walkthrough-btn"
                  >
                    <Sparkles size={11} />
                    <span>WALKTHROUGH</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveDiffUpdateId(null)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isLight
                      ? 'border-slate-200 hover:border-rose-300 text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50'
                      : 'border-white/10 hover:border-[#ff3366]/50 text-slate-400 hover:text-[#ff3366] bg-slate-900/60 hover:bg-[#ff3366]/10'
                  }`}
                  title="Close (ESC)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className={`flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain min-h-[380px] flex flex-col ${
              isLight ? 'text-slate-800' : 'text-slate-200'
            }`}>
              {viewMode === 'DIFF' ? (
                /* 1. Line-by-Line Diff View with Inline Commenting */
                <div className="flex-1 flex flex-col space-y-1">
                  <div className={`text-[10px] flex items-center justify-between px-1 pb-1 ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    <span>Hover over any line to add inline review feedback:</span>
                    <span className="flex items-center gap-3">
                      <span className={`font-bold ${isLight ? 'text-emerald-700' : 'text-[#00ff9d]'}`}>+ Additions</span>
                      <span className={`font-bold ${isLight ? 'text-rose-700' : 'text-[#ff3366]'}`}>- Deletions</span>
                    </span>
                  </div>

                  <div className={`rounded-xl border overflow-hidden text-xs ${
                    isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#060a14]'
                  }`}>
                    {diffLines.map((line, idx) => {
                      const targetLineNum = line.newLineNumber || line.oldLineNumber || idx + 1;
                      const isComposerOpen = activeRowIndex === idx;

                      // Match comments to this specific row without duplicate rendering
                      const lineComments = comments.filter((c) => {
                        if (line.newLineNumber) {
                          return c.lineNumber === line.newLineNumber;
                        }
                        if (line.oldLineNumber) {
                          const hasAddedLineWithSameNum = diffLines.some(
                            (l) => l.type === 'added' && l.newLineNumber === line.oldLineNumber
                          );
                          return !hasAddedLineWithSameNum && c.lineNumber === line.oldLineNumber;
                        }
                        return false;
                      });

                      return (
                        <div
                          key={idx}
                          onMouseUp={() => handleTextSelection(idx)}
                          className={`group flex flex-col transition-colors border-b ${
                            isLight ? 'border-slate-100' : 'border-white/5'
                          } ${
                            line.type === 'added'
                              ? isLight
                                ? 'bg-emerald-50 hover:bg-emerald-100/70 text-emerald-900'
                                : 'bg-[#00ff9d]/10 hover:bg-[#00ff9d]/15 text-[#00ff9d]'
                              : line.type === 'removed'
                              ? isLight
                                ? 'bg-rose-50 hover:bg-rose-100/70 text-rose-900'
                                : 'bg-[#ff3366]/10 hover:bg-[#ff3366]/15 text-[#ff3366]'
                              : isLight
                              ? 'hover:bg-slate-50 text-slate-700'
                              : 'hover:bg-white/[0.02] text-slate-300'
                          }`}
                        >
                          {/* Diff Line Row */}
                          <div className="flex items-start px-2 py-0.5 leading-relaxed font-mono">
                            {/* Line Numbers Gutter */}
                            <div className={`flex items-center select-none text-[10px] w-16 flex-shrink-0 gap-1 font-mono ${
                              isLight ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              <span className="w-6 text-right opacity-60">
                                {line.oldLineNumber || ''}
                              </span>
                              <span className="w-6 text-right opacity-80">
                                {line.newLineNumber || ''}
                              </span>
                              <span className="w-3 text-center font-bold">
                                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                              </span>
                            </div>

                            {/* Line Content */}
                            <div className="flex-1 whitespace-pre-wrap break-all font-mono text-[11.5px] pr-2">
                              {line.content || ' '}
                            </div>

                            {/* Gutter Comment Button on Hover */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveRowIndex(isComposerOpen ? null : idx);
                              }}
                              className={`p-0.5 rounded transition-all flex-shrink-0 cursor-pointer ${
                                isLight
                                  ? 'text-slate-400 hover:text-cyan-700 hover:bg-slate-100'
                                  : 'text-slate-400 hover:text-[#00f0ff] hover:bg-slate-800'
                              } ${
                                isComposerOpen || lineComments.length > 0
                                  ? isLight ? 'opacity-100 text-cyan-700' : 'opacity-100 text-[#00f0ff]'
                                  : 'opacity-0 group-hover:opacity-100'
                              }`}
                              title="Add comment to line"
                            >
                              <Plus size={13} />
                            </button>
                          </div>

                          {/* Rendered Inline Comments for this Line */}
                          {lineComments.length > 0 && (
                            <div className="ml-16 mr-3 my-1.5 space-y-1.5">
                              {lineComments.map((c) => (
                                <div
                                  key={c.id}
                                  className={`p-2.5 rounded-lg border text-xs shadow-md space-y-1 ${
                                    isLight
                                      ? 'bg-amber-50/90 border-amber-300 text-slate-800'
                                      : 'bg-slate-950/90 border-[#ffaa00]/40 text-slate-200'
                                  }`}
                                >
                                  {c.selectedText && (
                                    <div className={`text-[10px] border-l-2 pl-2 italic ${
                                      isLight ? 'text-amber-800 border-amber-400' : 'text-slate-400 border-[#ffaa00]'
                                    }`}>
                                      "{c.selectedText}"
                                    </div>
                                  )}
                                  <div className="flex items-start justify-between gap-2">
                                    <p className={`text-[11px] font-sans leading-relaxed ${
                                      isLight ? 'text-slate-800' : 'text-slate-100'
                                    }`}>
                                      {c.comment}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => deleteCommentFromUpdate(activeUpdate.id, c.id)}
                                      className={`transition-colors p-0.5 flex-shrink-0 cursor-pointer ${
                                        isLight ? 'text-slate-400 hover:text-rose-600' : 'text-slate-500 hover:text-[#ff3366]'
                                      }`}
                                      title="Delete comment"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                  <div className={`text-[9px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {c.createdAt}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Inline Comment Composer */}
                          {isComposerOpen && (
                            <div className={`ml-16 mr-3 my-2 p-2.5 rounded-lg border shadow-xl space-y-2 ${
                              isLight ? 'bg-white border-sky-400' : 'bg-slate-950 border-[#00f0ff]/40'
                            }`}>
                              {draftQuote && (
                                <div className={`text-[10px] border-l-2 pl-2 flex items-center justify-between ${
                                  isLight ? 'text-sky-700 border-sky-500' : 'text-[#00f0ff] border-[#00f0ff]'
                                }`}>
                                  <span className="italic truncate">"{draftQuote}"</span>
                                  <button
                                    type="button"
                                    onClick={() => setDraftQuote(undefined)}
                                    className={`ml-2 cursor-pointer ${isLight ? 'text-slate-400 hover:text-slate-600' : 'text-slate-500 hover:text-slate-300'}`}
                                  >
                                    <X size={11} />
                                  </button>
                                </div>
                              )}
                              <textarea
                                autoFocus
                                value={draftComment}
                                onChange={(e) => setDraftComment(e.target.value)}
                                onKeyDown={(e) => {
                                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                    handleSaveComment(targetLineNum);
                                  }
                                }}
                                placeholder="Add review feedback for this line... (Cmd+Enter to save)"
                                className={`w-full h-16 p-2 rounded border text-xs resize-none font-mono focus:outline-none ${
                                  isLight
                                    ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sky-500'
                                    : 'bg-slate-900/90 border-white/10 text-slate-100 focus:border-[#00f0ff]'
                                }`}
                              />
                              <div className="flex items-center justify-end gap-2 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowIndex(null);
                                    setDraftComment('');
                                    setDraftQuote(undefined);
                                  }}
                                  className={`px-2.5 py-1 rounded border cursor-pointer ${
                                    isLight ? 'border-slate-200 text-slate-600 hover:text-slate-900' : 'border-white/10 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveComment(targetLineNum)}
                                  className={`px-3 py-1 rounded font-bold transition-colors cursor-pointer ${
                                    isLight
                                      ? 'bg-sky-600 text-white hover:bg-sky-700'
                                      : 'bg-[#00f0ff] text-slate-950 hover:bg-[#00f0ff]/80'
                                  }`}
                                >
                                  Save Comment
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* 2. Rendered Preview: Quiz Question Cards for QUIZ_UPDATE or Markdown Note */
                <div className={`flex-1 p-4 rounded-xl border overflow-y-auto min-h-[350px] ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-950/80 border-white/10'
                }`}>
                  {activeUpdate.type === 'QUIZ_UPDATE' || activeUpdate.title?.toLowerCase().includes('quiz') ? (
                    <QuizViewer
                      questions={activeUpdate.newContent}
                      accentColor={catColor}
                      topicTitle={activeUpdate.targetName}
                    />
                  ) : (
                    <MarkdownContent
                      content={activeUpdate.newContent}
                      accentColor={catColor}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer with 3-Way Decision Actions */}
            <div className={`px-5 py-3 border-t flex items-center justify-between text-xs flex-shrink-0 gap-3 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'border-white/10 bg-slate-950/80'
            }`}>
              {/* Left Side: Status / Comments Summary */}
              <div className={`flex items-center gap-3 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {activeUpdate.status === 'APPROVED' && (
                  <span className={`flex items-center gap-1.5 font-bold ${isLight ? 'text-emerald-700' : 'text-[#00ff9d]'}`}>
                    <CheckCircle2 size={14} /> Update Approved & Merged
                  </span>
                )}
                {activeUpdate.status === 'REJECTED' && (
                  <span className={`flex items-center gap-1.5 font-bold ${isLight ? 'text-rose-700' : 'text-[#ff3366]'}`}>
                    <XCircle size={14} /> Update Rejected
                  </span>
                )}
                {activeUpdate.status === 'CHANGES_REQUESTED' && (
                  <span className={`flex items-center gap-1.5 font-bold ${isLight ? 'text-amber-700' : 'text-[#ffaa00]'}`}>
                    <AlertCircle size={14} /> Feedback Sent ({commentsCount} notes)
                  </span>
                )}
                {activeUpdate.status === 'PENDING' && commentsCount > 0 && (
                  <span className={`flex items-center gap-1.5 ${isLight ? 'text-amber-700' : 'text-[#ffaa00]'}`}>
                    <MessageSquare size={14} /> {commentsCount} line feedback item{commentsCount > 1 ? 's' : ''} drafted
                  </span>
                )}
              </div>

              {/* Right Side: 3 Action Decision Buttons */}
              <div className="flex items-center gap-2">
                {/* 1. Reject Button */}
                <button
                  type="button"
                  onClick={() => rejectGraphUpdate(activeUpdate.id)}
                  className={`px-3.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 font-bold cursor-pointer ${
                    isLight
                      ? 'border-rose-300 text-rose-700 hover:bg-rose-50'
                      : 'border-[#ff3366]/40 text-[#ff3366] hover:bg-[#ff3366]/15 hover:border-[#ff3366]'
                  }`}
                >
                  <X size={14} />
                  <span>REJECT</span>
                </button>

                {/* 2. Request Changes / Submit Feedback Button */}
                <button
                  type="button"
                  onClick={handleRequestChanges}
                  className={`px-3.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 font-bold cursor-pointer ${
                    isLight
                      ? 'border-amber-300 text-amber-800 hover:bg-amber-50'
                      : 'border-[#ffaa00]/40 text-[#ffaa00] hover:bg-[#ffaa00]/15 hover:border-[#ffaa00]'
                  }`}
                >
                  <CornerDownRight size={14} />
                  <span>REQUEST CHANGES {commentsCount > 0 ? `(${commentsCount})` : ''}</span>
                </button>

                {/* 3. Approve & Merge Button */}
                <button
                  type="button"
                  onClick={() => approveGraphUpdate(activeUpdate.id)}
                  style={{
                    backgroundColor: isLight ? '#059669' : '#00ff9d',
                    boxShadow: isLight ? '0 2px 8px rgba(5, 150, 105, 0.25)' : '0 0 15px rgba(0, 255, 157, 0.4)'
                  }}
                  className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 hover:opacity-90 active:scale-95 cursor-pointer ${
                    isLight ? 'text-white' : 'text-slate-950'
                  }`}
                >
                  <Check size={14} />
                  <span>APPROVE & MERGE</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
