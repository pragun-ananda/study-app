import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  X,
  Clock,
  Calendar,
  Copy,
  Check,
  Edit3,
  Eye,
  PenLine,
  Save,
  Trash2,
  HelpCircle
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getCategoryShade } from '../../utils/theme';
import { MarkdownContent } from './MarkdownContent';
import { QuizViewer } from './QuizViewer';

export default function NoteViewerModal() {
  const activeNote = useStore((state) => state.activeNote);
  const setActiveNote = useStore((state) => state.setActiveNote);
  const activeQuiz = useStore((state) => state.activeQuiz);
  const setActiveQuiz = useStore((state) => state.setActiveQuiz);
  const activeModalTab = useStore((state) => state.activeModalTab);
  const setActiveModalTab = useStore((state) => state.setActiveModalTab);
  const isNoteEditing = useStore((state) => state.isNoteEditing);
  const setIsNoteEditing = useStore((state) => state.setIsNoteEditing);
  const addNoteToTopic = useStore((state) => state.addNoteToTopic);
  const updateNoteInTopic = useStore((state) => state.updateNoteInTopic);
  const deleteNoteFromTopic = useStore((state) => state.deleteNoteFromTopic);
  const selectedTopicId = useStore((state) => state.selectedTopicId);
  const topicNodes = useStore((state) => state.topicNodes);

  const [copied, setCopied] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTab, setEditTab] = useState<'WRITE' | 'PREVIEW'>('WRITE');

  const selectedNode = useMemo(
    () => topicNodes.find((n) => n.id === selectedTopicId),
    [topicNodes, selectedTopicId]
  );

  const nodeColor = useMemo(() => {
    if (!selectedNode) return '#00f0ff';
    return getCategoryShade(selectedNode.id, selectedNode.category);
  }, [selectedNode]);

  // Topic quizzes if attached
  const currentQuiz = useMemo(() => {
    if (activeQuiz) return activeQuiz;
    if (selectedNode?.quizzes && selectedNode.quizzes.length > 0) {
      return selectedNode.quizzes[0];
    }
    return null;
  }, [activeQuiz, selectedNode?.quizzes]);

  const hasQuiz = Boolean(currentQuiz && currentQuiz.questions && currentQuiz.questions.length > 0);

  // Sync edit fields when activeNote changes
  useEffect(() => {
    if (activeNote) {
      setEditTitle(activeNote.title || 'Untitled Note');
      setEditContent(activeNote.content || '');
      setEditTab('WRITE');
    }
  }, [activeNote]);

  const isOpen = Boolean(activeNote || activeQuiz);

  const handleCloseOrCancel = () => {
    if (isNoteEditing) {
      if (!activeNote?.id) {
        // Was creating a new note -> dismiss modal
        setActiveNote(null);
      } else {
        // Was editing existing note -> revert back to view mode
        setIsNoteEditing(false);
      }
    } else {
      setActiveNote(null);
      setActiveQuiz(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCloseOrCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isNoteEditing, activeNote]);

  const handleSaveNote = () => {
    if (!selectedTopicId) return;
    const finalTitle = editTitle.trim() || 'Untitled Note';

    if (!activeNote?.id) {
      // Create new note
      addNoteToTopic(selectedTopicId, {
        title: finalTitle,
        content: editContent,
        updatedAt: 'Just now'
      });
    } else {
      // Update existing note
      updateNoteInTopic(selectedTopicId, {
        ...activeNote,
        title: finalTitle,
        content: editContent,
        updatedAt: 'Just now'
      });
    }
  };

  const handleDeleteCurrentNote = () => {
    if (!selectedTopicId || !activeNote?.id) return;
    if (confirm('Are you sure you want to delete this note?')) {
      deleteNoteFromTopic(selectedTopicId, activeNote.id);
    }
  };

  const handleCopy = () => {
    const textToCopy = isNoteEditing ? editContent : activeNote?.content;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 md:p-8 pointer-events-auto font-sans">
          {/* Backdrop Blur Overlay with rapid fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onClick={handleCloseOrCancel}
            className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
          />

          {/* Glowing Modal Window with snappy Zoom-In Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              borderColor: `${nodeColor}70`,
              boxShadow: `0 0 50px ${nodeColor}35, 0 0 20px ${nodeColor}20, inset 0 0 20px ${nodeColor}08`
            }}
            className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-[#080c16]/95 border rounded-2xl overflow-hidden font-sans z-50 shadow-2xl"
          >
            {/* Top Accent Scanline Bar matched to node color */}
            <div
              className="h-1 w-full opacity-90 transition-all duration-300"
              style={{
                background: `linear-gradient(90deg, transparent, ${nodeColor}, transparent)`
              }}
            />

            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-slate-950/70 flex-shrink-0 gap-3">
              {isNoteEditing ? (
                /* Edit Mode Header */
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="p-2 rounded-lg flex-shrink-0"
                    style={{
                      backgroundColor: `${nodeColor}18`,
                      borderColor: `${nodeColor}45`,
                      borderWidth: '1px',
                      color: nodeColor
                    }}
                  >
                    <Edit3 size={16} />
                  </div>
                  <div className="flex-1 max-w-sm">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Note title..."
                      className="w-full bg-slate-900/90 border border-white/20 focus:border-[#00f0ff] rounded-lg px-2.5 py-1 text-xs text-slate-100 font-sans font-bold focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              ) : (
                /* View Mode Header */
                <div className="flex items-center gap-3 truncate">
                  <div
                    className="p-2 rounded-lg flex-shrink-0 transition-all duration-300"
                    style={{
                      backgroundColor: `${nodeColor}18`,
                      borderColor: `${nodeColor}45`,
                      borderWidth: '1px',
                      color: nodeColor,
                      boxShadow: `0 0 12px ${nodeColor}35`
                    }}
                  >
                    {activeModalTab === 'QUIZ' ? <HelpCircle size={16} /> : <FileText size={16} />}
                  </div>
                  <div className="truncate">
                    <span className="text-slate-100 font-sans font-bold text-xs uppercase tracking-wider truncate">
                      {activeModalTab === 'QUIZ'
                        ? currentQuiz?.title || `${selectedNode?.name || 'Topic'} Quiz Bank`
                        : activeNote?.title || 'Study Note'}
                    </span>
                  </div>
                </div>
              )}

              {/* Mode & Tab Switchers */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Switch between NOTE and QUIZ if topic has quizzes */}
                {!isNoteEditing && hasQuiz && (
                  <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-white/10 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setActiveModalTab('NOTE')}
                      style={{
                        backgroundColor: activeModalTab === 'NOTE' ? `${nodeColor}25` : 'transparent',
                        color: activeModalTab === 'NOTE' ? nodeColor : '#94a3b8'
                      }}
                      className="px-2.5 py-1 rounded font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText size={11} />
                      <span>NOTE</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveModalTab('QUIZ')}
                      style={{
                        backgroundColor: activeModalTab === 'QUIZ' ? `${nodeColor}25` : 'transparent',
                        color: activeModalTab === 'QUIZ' ? nodeColor : '#94a3b8'
                      }}
                      className="px-2.5 py-1 rounded font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <HelpCircle size={11} />
                      <span>QUIZ ({currentQuiz?.questions?.length || 0})</span>
                    </button>
                  </div>
                )}

                {/* Edit Mode Buttons */}
                {activeModalTab === 'NOTE' && (
                  <>
                    {isNoteEditing ? (
                      <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-white/10 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setEditTab('WRITE')}
                          style={{
                            backgroundColor: editTab === 'WRITE' ? `${nodeColor}25` : 'transparent',
                            color: editTab === 'WRITE' ? nodeColor : '#94a3b8'
                          }}
                          className="px-2 py-1 rounded font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <PenLine size={11} />
                          <span>WRITE</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditTab('PREVIEW')}
                          style={{
                            backgroundColor: editTab === 'PREVIEW' ? `${nodeColor}25` : 'transparent',
                            color: editTab === 'PREVIEW' ? nodeColor : '#94a3b8'
                          }}
                          className="px-2 py-1 rounded font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={11} />
                          <span>PREVIEW</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsNoteEditing(true)}
                        style={{
                          borderColor: `${nodeColor}40`,
                          color: nodeColor
                        }}
                        className="px-2.5 py-1 rounded-lg border bg-slate-900/60 hover:bg-slate-800 text-[11px] font-sans font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Edit Note"
                      >
                        <Edit3 size={13} />
                        <span>EDIT</span>
                      </button>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={handleCloseOrCancel}
                  className="p-1.5 rounded-lg border border-white/10 hover:border-[#ff3366]/50 text-slate-400 hover:text-[#ff3366] bg-slate-900/60 hover:bg-[#ff3366]/10 transition-all cursor-pointer"
                  title="Close (ESC)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 overscroll-contain text-slate-200 selection:bg-white/20 selection:text-white flex flex-col min-h-[350px]">
              {/* Tab 1: QUIZ VIEW */}
              {activeModalTab === 'QUIZ' && currentQuiz ? (
                <div className="flex-1">
                  <QuizViewer
                    questions={currentQuiz.questions}
                    accentColor={nodeColor}
                    topicTitle={selectedNode?.name}
                  />
                </div>
              ) : isNoteEditing && editTab === 'WRITE' ? (
                /* Tab 2: NOTE EDIT TEXTAREA */
                <div className="flex-1 flex flex-col space-y-2 h-full">
                  <div className="flex items-center justify-end text-[10px] text-slate-400 font-mono">
                    <span>{editContent.length} characters</span>
                  </div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Start typing your note here..."
                    className="w-full flex-1 min-h-[340px] p-4 rounded-xl bg-slate-950/80 border border-white/10 text-slate-100 font-sans text-sm leading-relaxed focus:outline-none focus:border-[#00f0ff]/60 resize-none selection:bg-white/20 selection:text-white placeholder:text-slate-600"
                    spellCheck={false}
                    autoFocus
                  />
                </div>
              ) : (
                /* Tab 3: NOTE VIEW / PREVIEW WITH UNIFIED MarkdownContent */
                <div className="flex-1">
                  {(isNoteEditing ? editContent : activeNote?.content) ? (
                    <MarkdownContent
                      content={isNoteEditing ? editContent : activeNote?.content || ''}
                      accentColor={nodeColor}
                    />
                  ) : (
                    <div className="py-12 text-center text-slate-500 font-mono text-xs">
                      <FileText size={24} className="mx-auto mb-2 text-slate-600" />
                      <p>This note file is currently empty.</p>
                      {isNoteEditing && (
                        <button
                          type="button"
                          onClick={() => setEditTab('WRITE')}
                          className="mt-3 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                        >
                          Write Some Content
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-white/10 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0">
              {activeModalTab === 'NOTE' && isNoteEditing ? (
                /* Edit Mode Footer */
                <>
                  <div className="flex items-center gap-2">
                    {activeNote?.id && (
                      <button
                        type="button"
                        onClick={handleDeleteCurrentNote}
                        className="px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Delete this note"
                      >
                        <Trash2 size={13} />
                        <span>DELETE</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCloseOrCancel}
                      className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800 text-xs font-mono transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNote}
                      style={{
                        backgroundColor: nodeColor,
                        boxShadow: `0 0 15px ${nodeColor}40`
                      }}
                      className="px-3.5 py-1.5 rounded-lg text-slate-950 font-bold text-xs font-sans hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save size={13} />
                      <span>SAVE NOTE</span>
                    </button>
                  </div>
                </>
              ) : (
                /* View Mode Footer */
                <>
                  <div className="flex items-center gap-4 text-slate-500 font-mono text-[10px]">
                    {activeNote?.createdAt && (
                      <div className="flex items-center gap-1">
                        <Calendar size={11} />
                        <span>Added {activeNote.createdAt}</span>
                      </div>
                    )}
                    {activeNote?.updatedAt && (
                      <div className="flex items-center gap-1">
                        <Clock size={11} />
                        <span>Updated {activeNote.updatedAt}</span>
                      </div>
                    )}
                    {activeModalTab === 'QUIZ' && currentQuiz && (
                      <div className="flex items-center gap-1 text-[#00ff9d]">
                        <Check size={11} />
                        <span>{currentQuiz.questions?.length || 0} Questions Loaded</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {activeModalTab === 'NOTE' && (
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="px-2.5 py-1 rounded-lg border border-white/10 hover:border-white/20 text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800 text-[11px] font-mono transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Copy note content"
                      >
                        {copied ? (
                          <>
                            <Check size={12} className="text-[#00ff9d]" />
                            <span className="text-[#00ff9d] font-bold">COPIED</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>COPY CONTENT</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleCloseOrCancel}
                      className="px-3 py-1 rounded-lg border border-white/10 hover:border-white/20 text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800 text-[11px] font-mono transition-all cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
