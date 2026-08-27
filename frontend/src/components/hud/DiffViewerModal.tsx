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
  CornerDownRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';

import { useStore } from '../../store/useStore';
import { computeLineDiff } from '../../utils/diff';
import { LineReviewComment, DomainCategory } from '../../types/telemetry';
import { DOMAIN_BASE_COLORS } from '../../utils/theme';

export default function DiffViewerModal() {
  const activeDiffUpdateId = useStore((state) => state.activeDiffUpdateId);
  const setActiveDiffUpdateId = useStore((state) => state.setActiveDiffUpdateId);
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
    if (!activeUpdate) return '#00f0ff';
    return DOMAIN_BASE_COLORS[activeUpdate.category as DomainCategory] || '#00f0ff';
  }, [activeUpdate]);

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
              boxShadow: `0 0 50px ${catColor}30, 0 0 20px ${catColor}15, inset 0 0 20px ${catColor}08`
            }}
            className="relative w-full max-w-4xl max-h-[88vh] flex flex-col bg-[#080c16]/95 border rounded-2xl overflow-hidden z-50 shadow-2xl"
          >
            {/* Top Accent Scanline */}
            <div
              className="h-1 w-full opacity-90"
              style={{
                background: `linear-gradient(90deg, transparent, ${catColor}, transparent)`
              }}
            />

            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-slate-950/80 flex-shrink-0 gap-3">
              <div className="flex items-center gap-3 truncate">
                <div
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{
                    backgroundColor: `${catColor}18`,
                    borderColor: `${catColor}45`,
                    borderWidth: '1px',
                    color: catColor,
                    boxShadow: `0 0 12px ${catColor}35`
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
                    <span className="text-slate-400 text-xs truncate">
                      Target: {activeUpdate.targetName}
                    </span>
                  </div>
                  <h2 className="text-slate-100 font-bold text-xs uppercase tracking-wider truncate mt-0.5">
                    {activeUpdate.title}
                  </h2>
                </div>
              </div>

              {/* View Switcher & Close */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-white/10 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setViewMode('DIFF')}
                    style={{
                      backgroundColor: viewMode === 'DIFF' ? `${catColor}25` : 'transparent',
                      color: viewMode === 'DIFF' ? catColor : '#94a3b8'
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
                      backgroundColor: viewMode === 'PREVIEW' ? `${catColor}25` : 'transparent',
                      color: viewMode === 'PREVIEW' ? catColor : '#94a3b8'
                    }}
                    className="px-2 py-1 rounded font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Eye size={11} />
                    <span>RENDERED PREVIEW</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveDiffUpdateId(null)}
                  className="p-1.5 rounded-lg border border-white/10 hover:border-[#ff3366]/50 text-slate-400 hover:text-[#ff3366] bg-slate-900/60 hover:bg-[#ff3366]/10 transition-all cursor-pointer"
                  title="Close (ESC)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain text-slate-200 min-h-[380px] flex flex-col">
              {viewMode === 'DIFF' ? (
                /* 1. Line-by-Line Diff View with Inline Commenting */
                <div className="flex-1 flex flex-col space-y-1">
                  <div className="text-[10px] text-slate-400 flex items-center justify-between px-1 pb-1">
                    <span>Hover over any line to add inline review feedback:</span>
                    <span className="flex items-center gap-3">
                      <span className="text-[#00ff9d] font-bold">+ Additions</span>
                      <span className="text-[#ff3366] font-bold">- Deletions</span>
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#060a14] overflow-hidden text-xs">
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
                          className={`group flex flex-col border-b border-white/5 transition-colors ${
                            line.type === 'added'
                              ? 'bg-[#00ff9d]/10 hover:bg-[#00ff9d]/15 text-[#00ff9d]'
                              : line.type === 'removed'
                              ? 'bg-[#ff3366]/10 hover:bg-[#ff3366]/15 text-[#ff3366]'
                              : 'hover:bg-white/[0.02] text-slate-300'
                          }`}
                        >
                          {/* Diff Line Row */}
                          <div className="flex items-start px-2 py-0.5 leading-relaxed font-mono">
                            {/* Line Numbers Gutter */}
                            <div className="flex items-center select-none text-[10px] text-slate-500 w-16 flex-shrink-0 gap-1 font-mono">
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
                              className={`p-0.5 rounded text-slate-400 hover:text-[#00f0ff] hover:bg-slate-800 transition-all flex-shrink-0 ${
                                isComposerOpen || lineComments.length > 0
                                  ? 'opacity-100 text-[#00f0ff]'
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
                                  className="p-2.5 rounded-lg bg-slate-950/90 border border-[#ffaa00]/40 text-slate-200 text-xs shadow-md space-y-1"
                                >
                                  {c.selectedText && (
                                    <div className="text-[10px] text-slate-400 border-l-2 border-[#ffaa00] pl-2 italic">
                                      "{c.selectedText}"
                                    </div>
                                  )}
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-[11px] text-slate-100 font-sans leading-relaxed">
                                      {c.comment}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => deleteCommentFromUpdate(activeUpdate.id, c.id)}
                                      className="text-slate-500 hover:text-[#ff3366] transition-colors p-0.5 flex-shrink-0"
                                      title="Delete comment"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                  <div className="text-[9px] text-slate-500 font-mono">
                                    {c.createdAt}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Inline Comment Composer */}
                          {isComposerOpen && (
                            <div className="ml-16 mr-3 my-2 p-2.5 rounded-lg bg-slate-950 border border-[#00f0ff]/40 shadow-xl space-y-2">
                              {draftQuote && (
                                <div className="text-[10px] text-[#00f0ff] border-l-2 border-[#00f0ff] pl-2 flex items-center justify-between">
                                  <span className="italic truncate">"{draftQuote}"</span>
                                  <button
                                    type="button"
                                    onClick={() => setDraftQuote(undefined)}
                                    className="text-slate-500 hover:text-slate-300 ml-2"
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
                                className="w-full h-16 p-2 rounded bg-slate-900/90 border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-[#00f0ff] resize-none font-mono"
                              />
                              <div className="flex items-center justify-end gap-2 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowIndex(null);
                                    setDraftComment('');
                                    setDraftQuote(undefined);
                                  }}
                                  className="px-2.5 py-1 rounded border border-white/10 text-slate-400 hover:text-slate-200"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveComment(targetLineNum)}
                                  className="px-3 py-1 rounded bg-[#00f0ff] text-slate-950 font-bold hover:bg-[#00f0ff]/80 transition-colors"
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
                /* 2. Rendered Markdown & Math Preview */
                <div className="flex-1 p-4 rounded-xl bg-slate-950/80 border border-white/10 prose prose-invert max-w-none text-xs leading-relaxed font-mono">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
                    components={{
                      h1: ({ node, ...props }) => (
                        <h1
                          className="text-base font-bold font-mono tracking-wider border-b pb-2 mb-4 mt-2"
                          style={{ color: catColor, borderColor: `${catColor}30` }}
                          {...props}
                        />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 className="text-sm font-bold text-slate-100 font-mono tracking-wide mt-6 mb-3" {...props} />
                      ),
                      p: ({ node, ...props }) => <p className="text-slate-300 text-xs leading-relaxed mb-3 font-mono" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1.5 mb-4 text-slate-300 text-xs font-mono" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1.5 mb-4 text-slate-300 text-xs font-mono" {...props} />,
                      li: ({ node, ...props }) => <li className="text-slate-300 text-xs font-mono leading-relaxed" {...props} />,
                      code: ({ node, className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeString = String(children).replace(/\n$/, '');
                        const isInline = !match && !String(children).includes('\n');
                        if (isInline) {
                          return (
                            <code
                              className="px-1.5 py-0.5 rounded font-mono text-[11px]"
                              style={{
                                backgroundColor: `${catColor}15`,
                                color: catColor,
                                borderColor: `${catColor}30`,
                                borderWidth: '1px'
                              }}
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        }
                        return (
                          <div className="my-3 rounded-lg overflow-hidden border border-white/10 bg-[#060a14]">
                            <SyntaxHighlighter
                              language={match ? match[1] : 'text'}
                              style={dracula}
                              customStyle={{
                                margin: 0,
                                padding: '0.8rem',
                                background: 'transparent',
                                fontSize: '11px',
                                lineHeight: '1.5'
                              }}
                            >
                              {codeString}
                            </SyntaxHighlighter>
                          </div>
                        );
                      },
                      img: ({ node, src, alt, ...props }) => (
                        <span className="block my-4 rounded-xl overflow-hidden border border-white/10 bg-[#060a14] shadow-xl">
                          <img
                            src={src}
                            alt={alt}
                            className="w-full max-h-[360px] object-contain bg-slate-950/60 p-2"
                            loading="lazy"
                            {...props}
                          />
                          {alt && (
                            <span className="block text-center text-[10px] text-slate-400 py-1.5 px-3 border-t border-white/5 bg-slate-950/80 font-mono">
                              {alt}
                            </span>
                          )}
                        </span>
                      ),
                      a: ({ node, href, children, ...props }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-[#00f0ff] hover:text-[#00ff9d] transition-colors"
                          {...props}
                        >
                          {children}
                        </a>
                      )
                    }}
                  >
                    {activeUpdate.newContent}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {/* Modal Footer with 3-Way Decision Actions */}
            <div className="px-5 py-3 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-xs flex-shrink-0 gap-3">
              {/* Left Side: Status / Comments Summary */}
              <div className="flex items-center gap-3 text-slate-400">
                {activeUpdate.status === 'APPROVED' && (
                  <span className="flex items-center gap-1.5 text-[#00ff9d] font-bold">
                    <CheckCircle2 size={14} /> Update Approved & Merged
                  </span>
                )}
                {activeUpdate.status === 'REJECTED' && (
                  <span className="flex items-center gap-1.5 text-[#ff3366] font-bold">
                    <XCircle size={14} /> Update Rejected
                  </span>
                )}
                {activeUpdate.status === 'CHANGES_REQUESTED' && (
                  <span className="flex items-center gap-1.5 text-[#ffaa00] font-bold">
                    <AlertCircle size={14} /> Feedback Sent ({commentsCount} notes)
                  </span>
                )}
                {activeUpdate.status === 'PENDING' && commentsCount > 0 && (
                  <span className="flex items-center gap-1.5 text-[#ffaa00]">
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
                  className="px-3.5 py-1.5 rounded-lg border border-[#ff3366]/40 text-[#ff3366] hover:bg-[#ff3366]/15 hover:border-[#ff3366] transition-all flex items-center gap-1.5 font-bold cursor-pointer"
                >
                  <X size={14} />
                  <span>REJECT</span>
                </button>

                {/* 2. Request Changes / Submit Feedback Button */}
                <button
                  type="button"
                  onClick={handleRequestChanges}
                  className="px-3.5 py-1.5 rounded-lg border border-[#ffaa00]/40 text-[#ffaa00] hover:bg-[#ffaa00]/15 hover:border-[#ffaa00] transition-all flex items-center gap-1.5 font-bold cursor-pointer"
                >
                  <CornerDownRight size={14} />
                  <span>REQUEST CHANGES {commentsCount > 0 ? `(${commentsCount})` : ''}</span>
                </button>

                {/* 3. Approve & Merge Button */}
                <button
                  type="button"
                  onClick={() => approveGraphUpdate(activeUpdate.id)}
                  style={{
                    backgroundColor: '#00ff9d',
                    boxShadow: '0 0 15px rgba(0, 255, 157, 0.4)'
                  }}
                  className="px-4 py-1.5 rounded-lg text-slate-950 font-bold transition-all flex items-center gap-1.5 hover:opacity-90 active:scale-95 cursor-pointer"
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
