import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Sparkles,
  Trash2,
  Edit3,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Send,
  HelpCircle,
  ShieldAlert,
  Cpu,
  Layers,
  ExternalLink,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { useRepoStore } from '../../store/useRepoStore';
import { useStore } from '../../store/useStore';
import { useSolStore } from '../../store/useSolStore';
import { DesignCategory, CodeAnnotationDTO } from '../../types/telemetry';

export interface AnnotationDockProps {
  currentFileContent?: string;
  isLight?: boolean;
}

export const CATEGORY_CONFIG: Record<
  DesignCategory,
  { label: string; bg: string; text: string; border: string }
> = {
  ARCHITECTURE: {
    label: 'Architecture & Topology',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30'
  },
  CONCURRENCY: {
    label: 'Concurrency & Locking',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30'
  },
  ALGORITHM: {
    label: 'Algorithm & Data Structure',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30'
  },
  PERFORMANCE: {
    label: 'Performance & Memory',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30'
  },
  SPOF_TRADEOFF: {
    label: 'SPOF & Trade-off',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30'
  },
  DESIGN_PATTERN: {
    label: 'Design Pattern',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30'
  },
  SECURITY: {
    label: 'Security & Auth',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30'
  },
  GENERAL_NOTE: {
    label: 'General Study Note',
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/30'
  }
};

export const AnnotationDock: React.FC<AnnotationDockProps> = ({
  currentFileContent = '',
  isLight = false
}) => {
  const activeRepo = useRepoStore((state) => state.activeRepo);
  const activeFilePath = useRepoStore((state) => state.activeFilePath);
  const rawAnnotations = useRepoStore((state) => state.annotations);
  const annotations = Array.isArray(rawAnnotations) ? rawAnnotations : [];
  const activeAnnotationId = useRepoStore((state) => state.activeAnnotationId);
  const setActiveAnnotationId = useRepoStore((state) => state.setActiveAnnotationId);
  const updateAnnotation = useRepoStore((state) => state.updateAnnotation);
  const deleteAnnotation = useRepoStore((state) => state.deleteAnnotation);
  const explainAnnotation = useRepoStore((state) => state.explainAnnotation);
  const isExplaining = useRepoStore((state) => state.isExplaining);
  const threads = useRepoStore((state) => state.threads);
  const fetchThreads = useRepoStore((state) => state.fetchThreads);
  const addThreadMessage = useRepoStore((state) => state.addThreadMessage);
  const exportAnnotationToQuiz = useRepoStore((state) => state.exportAnnotationToQuiz);

  const topicNodes = useStore((state) => state.topicNodes);
  const openSolChat = useSolStore((state) => state.openChat);
  const sendSolMessage = useSolStore((state) => state.sendMessage);

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<DesignCategory>('ARCHITECTURE');
  const [editTopicId, setEditTopicId] = useState<string>('');

  const [expandedAiIds, setExpandedAiIds] = useState<Record<string, boolean>>({});
  const [threadInputs, setThreadInputs] = useState<Record<string, string>>({});
  const [isSendingThreadMsg, setIsSendingThreadMsg] = useState<Record<string, boolean>>({});
  const [exportingQuizId, setExportingQuizId] = useState<string | null>(null);
  const [exportedSuccessId, setExportedSuccessId] = useState<string | null>(null);
  const [quizNotice, setQuizNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const handleExportQuiz = async (ann: CodeAnnotationDTO) => {
    if (!ann.topicId) {
      setQuizNotice({
        type: 'error',
        message: 'Please link this annotation to a Knowledge Graph topic first (click Edit and select a topic).'
      });
      setTimeout(() => setQuizNotice(null), 5000);
      return;
    }
    setExportingQuizId(ann.id);
    try {
      await exportAnnotationToQuiz(ann.id, ann.topicId);
      setExportedSuccessId(ann.id);
      setQuizNotice({
        type: 'success',
        message: 'Exported to Spaced Repetition Quiz queue!'
      });
      setTimeout(() => {
        setExportedSuccessId((prev) => (prev === ann.id ? null : prev));
        setQuizNotice(null);
      }, 4000);
    } catch (err: any) {
      setQuizNotice({
        type: 'error',
        message: err.message || 'Failed to export to quiz'
      });
      setTimeout(() => setQuizNotice(null), 5000);
    } finally {
      setExportingQuizId(null);
    }
  };

  // Filter annotations for active file and category
  const fileAnnotations = useMemo(() => {
    return annotations.filter((ann) => {
      const fileMatch = !activeFilePath || ann.filePath === activeFilePath;
      const catMatch = categoryFilter === 'ALL' || ann.designCategory === categoryFilter;
      return fileMatch && catMatch;
    });
  }, [annotations, activeFilePath, categoryFilter]);

  // Load threads for active annotation
  useEffect(() => {
    if (activeAnnotationId && !threads[activeAnnotationId]) {
      fetchThreads(activeAnnotationId);
    }
  }, [activeAnnotationId, fetchThreads, threads]);

  const toggleAiExpanded = (id: string) => {
    setExpandedAiIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const startEditing = (ann: CodeAnnotationDTO) => {
    setEditingId(ann.id);
    setEditTitle(ann.title);
    setEditContent(ann.content);
    setEditCategory(ann.designCategory);
    setEditTopicId(ann.topicId || '');
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateAnnotation(id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        designCategory: editCategory,
        topicId: editTopicId || null
      });
      setEditingId(null);
    } catch (err: any) {
      console.error('[SAVE_EDIT_ERROR]:', err);
    }
  };

  const handlePostThreadMsg = async (annId: string) => {
    const text = (threadInputs[annId] || '').trim();
    if (!text) return;

    try {
      setIsSendingThreadMsg((prev) => ({ ...prev, [annId]: true }));
      await addThreadMessage(annId, text, 'USER');
      setThreadInputs((prev) => ({ ...prev, [annId]: '' }));

      // Simulate helpful Sol AI companion reply
      setTimeout(async () => {
        try {
          await addThreadMessage(
            annId,
            `Great observation! In production architectures, this trade-off is often tuned using dynamic thread pools or adaptive backoff to prevent cascading failure.`,
            'SOL_AI'
          );
        } catch {}
      }, 750);
    } catch (err: any) {
      console.error('[THREAD_POST_ERROR]:', err);
    } finally {
      setIsSendingThreadMsg((prev) => ({ ...prev, [annId]: false }));
    }
  };

  const handleAskSolAboutAnnotation = (ann: CodeAnnotationDTO) => {
    openSolChat();
    const prompt = `Hey Sol! I'm studying code in ${ann.filePath} (lines ${ann.startLine}–${ann.endLine}):\n\`\`\`\n${ann.anchorCodeSnippet}\n\`\`\`\nNote: ${ann.title} - ${ann.content}. Can you walk me through the architectural trade-offs and interview rationale?`;
    sendSolMessage(prompt);
  };

  // Check if code has drifted from the anchor snippet
  const checkCodeDrift = (ann: CodeAnnotationDTO): boolean => {
    if (!currentFileContent || !ann.anchorCodeSnippet) return false;
    const lines = currentFileContent.split('\n');
    const actualSnippet = lines.slice(ann.startLine - 1, ann.endLine).join('\n').trim();
    const cleanAnchor = ann.anchorCodeSnippet.trim();
    return actualSnippet.length > 0 && cleanAnchor.length > 0 && actualSnippet !== cleanAnchor;
  };

  return (
    <div
      data-testid="annotation-dock"
      className={`h-full flex flex-col border-l overflow-y-auto ${
        isLight ? 'bg-neutral-50/70 border-neutral-200' : 'bg-neutral-950/80 border-white/10'
      }`}
    >
      {/* Header & Category Filters */}
      <div className={`p-3 border-b ${isLight ? 'border-neutral-200' : 'border-white/10'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <span>Architecture & Notes Studio</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-semibold">
            {fileAnnotations.length} {fileAnnotations.length === 1 ? 'Note' : 'Notes'}
          </span>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {['ALL', 'ARCHITECTURE', 'CONCURRENCY', 'ALGORITHM', 'PERFORMANCE', 'SPOF_TRADEOFF'].map(
            (cat) => {
              const isSelected = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  data-testid={`filter-${cat.toLowerCase()}`}
                  className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                    isSelected
                      ? isLight
                        ? 'bg-purple-600 text-white font-bold shadow-sm'
                        : 'bg-purple-500 text-white font-bold shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                      : isLight
                      ? 'bg-neutral-200/80 text-neutral-600 hover:bg-neutral-300'
                      : 'bg-white/5 text-neutral-400 hover:bg-white/10'
                  }`}
                >
                  {cat.replace('_', ' ')}
                </button>
              );
            }
          )}
        </div>

        {/* Quiz Export Notice Toast */}
        {quizNotice && (
          <div
            data-testid="quiz-export-notice"
            className={`mt-2 p-2 rounded text-[11px] font-mono flex items-center justify-between border transition-all ${
              quizNotice.type === 'success'
                ? isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                : isLight
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
            }`}
          >
            <span>{quizNotice.message}</span>
            <button
              onClick={() => setQuizNotice(null)}
              className="p-0.5 hover:opacity-75 cursor-pointer ml-2"
              title="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Annotations List */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {fileAnnotations.length > 0 ? (
          fileAnnotations.map((ann) => {
            const isEditing = editingId === ann.id;
            const isSelected = activeAnnotationId === ann.id;
            const isAiExpanded = expandedAiIds[ann.id] ?? true;
            const config = CATEGORY_CONFIG[ann.designCategory] || CATEGORY_CONFIG.GENERAL_NOTE;
            const hasDrift = checkCodeDrift(ann);
            const annThreads = threads[ann.id] || [];

            return (
              <div
                key={ann.id}
                data-testid={`annotation-card-${ann.id}`}
                onClick={() => setActiveAnnotationId(ann.id)}
                className={`rounded-xl border transition-all text-xs font-mono p-3 ${
                  isSelected
                    ? isLight
                      ? 'border-purple-500 bg-white shadow-md'
                      : 'border-purple-500/70 bg-purple-950/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                    : isLight
                    ? 'border-neutral-200 bg-white/80 hover:border-neutral-300'
                    : 'border-white/10 bg-neutral-900/60 hover:border-white/20'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase border ${config.bg} ${config.text} ${config.border}`}
                      >
                        {config.label}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        L{ann.startLine}–{ann.endLine}
                      </span>
                      {hasDrift && (
                        <span
                          title="Original code shifted in current commit"
                          className="flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        >
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>Drift</span>
                        </span>
                      )}
                    </div>
                    {!isEditing ? (
                      <h4
                        className={`font-sans font-bold text-sm leading-snug ${
                          isLight ? 'text-slate-900' : 'text-neutral-100'
                        }`}
                      >
                        {ann.title}
                      </h4>
                    ) : (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className={`w-full text-xs font-mono font-bold p-1 rounded border outline-none ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900'
                            : 'bg-black/50 border-white/20 text-neutral-100'
                        }`}
                      />
                    )}
                  </div>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!isEditing ? (
                      <>
                        <button
                          data-testid={`edit-annotation-${ann.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(ann);
                          }}
                          className={`p-1 rounded transition-colors ${
                            isLight
                              ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                              : 'text-neutral-400 hover:text-white hover:bg-white/10'
                          }`}
                          title="Edit Note"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          data-testid={`delete-annotation-${ann.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAnnotation(ann.id);
                          }}
                          className={`p-1 rounded transition-colors ${
                            isLight
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-neutral-400 hover:text-red-400 hover:bg-red-500/10'
                          }`}
                          title="Delete Note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveEdit(ann.id);
                          }}
                          className="p-1 rounded text-emerald-500 hover:bg-emerald-500/20"
                          title="Save Changes"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(null);
                          }}
                          className={`p-1 rounded ${
                            isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-neutral-400 hover:bg-white/10'
                          }`}
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Edit Form Controls */}
                {isEditing && (
                  <div className="my-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as DesignCategory)}
                      className={`w-full text-xs p-1 rounded border outline-none ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-800'
                          : 'bg-black/50 border-white/15 text-neutral-200'
                      }`}
                    >
                      <option value="ARCHITECTURE">Architecture & Topology</option>
                      <option value="CONCURRENCY">Concurrency & Locking</option>
                      <option value="ALGORITHM">Algorithm & Data Structure</option>
                      <option value="PERFORMANCE">Performance & Memory</option>
                      <option value="SPOF_TRADEOFF">SPOF & Trade-off</option>
                      <option value="GENERAL_NOTE">General Note</option>
                    </select>

                    <textarea
                      rows={3}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className={`w-full text-xs p-1.5 rounded border outline-none ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                          : 'bg-black/50 border-white/15 text-neutral-200'
                      }`}
                    />

                    {topicNodes.length > 0 && (
                      <select
                        value={editTopicId}
                        onChange={(e) => setEditTopicId(e.target.value)}
                        className={`w-full text-xs p-1 rounded border outline-none ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-800'
                            : 'bg-black/50 border-white/15 text-neutral-300'
                        }`}
                      >
                        <option value="">Attach to Knowledge Graph Topic...</option>
                        {topicNodes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.category})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Note Markdown Content */}
                {!isEditing && ann.content && (
                  <p
                    className={`text-xs whitespace-pre-wrap leading-relaxed my-2 ${
                      isLight ? 'text-slate-700' : 'text-neutral-300'
                    }`}
                  >
                    {ann.content}
                  </p>
                )}

                {/* Anchor Code Snippet Preview */}
                {ann.anchorCodeSnippet && (
                  <div
                    className={`my-2 p-2 rounded border overflow-x-auto text-[11px] font-mono leading-tight ${
                      isLight
                        ? 'bg-slate-100 border-slate-200 text-slate-800'
                        : 'bg-black/60 border-white/10 text-cyan-300/90'
                    }`}
                  >
                    <code>{ann.anchorCodeSnippet}</code>
                  </div>
                )}

                {/* Knowledge Graph Topic Link */}
                {ann.topicId && (
                  <div
                    className={`flex items-center gap-1.5 my-2 text-[10px] font-mono ${
                      isLight ? 'text-sky-700' : 'text-sky-400'
                    }`}
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Linked to Topic: {topicNodes.find((t) => t.id === ann.topicId)?.name || ann.topicId}</span>
                  </div>
                )}

                {/* AI Architectural Rationale Section */}
                <div className={`mt-3 pt-2.5 border-t ${isLight ? 'border-neutral-200' : 'border-white/10'}`}>
                  {ann.aiExplanation ? (
                    <div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAiExpanded(ann.id);
                        }}
                        className={`w-full flex items-center justify-between text-[11px] font-bold py-1 ${
                          isLight ? 'text-purple-700 hover:text-purple-800' : 'text-purple-400 hover:text-purple-300'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Staff+ Architectural Critique</span>
                        </span>
                        {isAiExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isAiExpanded && (
                        <div className="space-y-2 mt-2 text-[11px] leading-relaxed">
                          {/* Summary */}
                          <div
                            className={`p-2 rounded border ${
                              isLight
                                ? 'bg-purple-50 border-purple-200 text-purple-950'
                                : 'bg-purple-950/30 border-purple-500/20 text-neutral-200'
                            }`}
                          >
                            <span className={`font-bold block mb-0.5 ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>
                              Execution Summary:
                            </span>
                            {ann.aiExplanation.summary}
                          </div>

                          {/* Architectural Rationale */}
                          <div
                            className={`p-2 rounded border ${
                              isLight
                                ? 'bg-slate-50 border-slate-200 text-slate-800'
                                : 'bg-white/5 border-white/10 text-neutral-300'
                            }`}
                          >
                            <span className={`font-bold flex items-center gap-1 mb-0.5 ${isLight ? 'text-sky-700' : 'text-cyan-300'}`}>
                              <Cpu className="w-3 h-3" />
                              <span>Why It Was Designed This Way:</span>
                            </span>
                            {ann.aiExplanation.architecturalRationale}
                          </div>

                          {/* Design Patterns Badges */}
                          {ann.aiExplanation.designPatterns && ann.aiExplanation.designPatterns.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {ann.aiExplanation.designPatterns.map((pat: string) => (
                                <span
                                  key={pat}
                                  className={`text-[9.5px] px-2 py-0.5 rounded-full font-semibold border ${
                                    isLight
                                      ? 'bg-sky-50 text-sky-800 border-sky-200'
                                      : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                                  }`}
                                >
                                  {pat}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Concurrency & Failure Modes */}
                          {ann.aiExplanation.concurrencyAndFailureModes && (
                            <div
                              className={`p-2 rounded border space-y-1 ${
                                isLight
                                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                                  : 'bg-rose-950/20 border-rose-500/20 text-neutral-300'
                              }`}
                            >
                              <span className={`font-bold flex items-center gap-1 ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>
                                <ShieldAlert className="w-3 h-3" />
                                <span>Concurrency & SPOF Trade-offs:</span>
                              </span>
                              <div className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-neutral-400'}`}>
                                <strong>Hazards:</strong> {ann.aiExplanation.concurrencyAndFailureModes.raceConditionsAndDeadlocks}
                              </div>
                              <div className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-neutral-400'}`}>
                                <strong>Bottleneck:</strong> {ann.aiExplanation.concurrencyAndFailureModes.spofOrBottleneck}
                              </div>
                            </div>
                          )}

                          {/* Suggested Interview Questions */}
                          {ann.aiExplanation.suggestedStudyQuestions && ann.aiExplanation.suggestedStudyQuestions.length > 0 && (
                            <div
                              className={`p-2 rounded border ${
                                isLight
                                  ? 'bg-amber-50 border-amber-200 text-amber-950'
                                  : 'bg-amber-950/20 border-amber-500/20 text-neutral-300'
                              }`}
                            >
                              <span className={`font-bold flex items-center gap-1 mb-1 ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                                <HelpCircle className="w-3 h-3" />
                                <span>Staff+ Interview Prompt:</span>
                              </span>
                              <div className={`italic text-[10.5px] ${isLight ? 'text-amber-900' : 'text-amber-200/90'}`}>
                                &ldquo;{ann.aiExplanation.suggestedStudyQuestions[0].question}&rdquo;
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      data-testid={`explain-ai-btn-${ann.id}`}
                      disabled={isExplaining}
                      onClick={(e) => {
                        e.stopPropagation();
                        explainAnnotation(ann.id);
                      }}
                      className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40 hover:border-purple-400 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isExplaining ? 'Analyzing Architecture...' : 'Explain Architecture with AI'}</span>
                    </button>
                  )}
                </div>

                {/* Socratic Thread / Sol AI Discussion */}
                <div className={`mt-3 pt-2.5 border-t ${isLight ? 'border-neutral-200' : 'border-white/10'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                      Discussion ({annThreads.length})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        data-testid={`export-quiz-btn-${ann.id}`}
                        disabled={exportingQuizId === ann.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportQuiz(ann);
                        }}
                        className={`flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer ${
                          exportedSuccessId === ann.id
                            ? 'text-emerald-500 font-bold'
                            : isLight
                            ? 'text-amber-600 hover:text-amber-700 hover:underline'
                            : 'text-amber-400 hover:text-amber-300 hover:underline'
                        }`}
                        title="Export this code concept to Spaced Repetition Quiz queue"
                      >
                        <GraduationCap className="w-3 h-3" />
                        <span>
                          {exportedSuccessId === ann.id
                            ? 'Quiz Created!'
                            : exportingQuizId === ann.id
                            ? 'Exporting...'
                            : 'Export Quiz'}
                        </span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAskSolAboutAnnotation(ann);
                        }}
                        className={`flex items-center gap-1 text-[10px] font-bold hover:underline cursor-pointer ${
                          isLight ? 'text-purple-600 hover:text-purple-700' : 'text-purple-400 hover:text-purple-300'
                        }`}
                        title="Open full conversation with Sol AI Companion"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Ask Sol AI in Chat</span>
                      </button>
                    </div>
                  </div>

                  {/* Thread Messages */}
                  {annThreads.length > 0 && (
                    <div className="space-y-1.5 mb-2 max-h-36 overflow-y-auto pr-1">
                      {annThreads.map((t) => (
                        <div
                          key={t.id}
                          className={`p-1.5 rounded text-[10.5px] leading-relaxed border ${
                            t.sender === 'SOL_AI'
                              ? isLight
                                ? 'bg-purple-50 border-purple-200 text-purple-900'
                                : 'bg-purple-950/40 border-purple-500/20 text-purple-200'
                              : t.sender === 'SYSTEM'
                              ? isLight
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                              : isLight
                              ? 'bg-slate-100 border-slate-200 text-slate-800'
                              : 'bg-white/5 border-white/10 text-neutral-200'
                          }`}
                        >
                          <div className={`font-bold text-[9px] mb-0.5 ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                            {t.sender === 'SOL_AI' ? '✨ Sol AI' : t.sender === 'SYSTEM' ? '⚡ System' : 'You'}
                          </div>
                          <div>{t.message}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Input */}
                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      placeholder="Ask follow-up question..."
                      value={threadInputs[ann.id] || ''}
                      onChange={(e) =>
                        setThreadInputs((prev) => ({ ...prev, [ann.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handlePostThreadMsg(ann.id);
                      }}
                      className={`flex-1 text-[11px] p-1.5 rounded border outline-none ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-purple-500'
                          : 'bg-black/40 border-white/10 text-neutral-200 placeholder:text-neutral-500 focus:border-purple-500'
                      }`}
                    />
                    <button
                      onClick={() => handlePostThreadMsg(ann.id)}
                      disabled={isSendingThreadMsg[ann.id] || !threadInputs[ann.id]?.trim()}
                      className="p-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 cursor-pointer"
                      title="Send message"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className={`p-6 text-center rounded-xl border border-dashed flex flex-col items-center gap-2 ${
            isLight ? 'border-slate-200 text-slate-500' : 'border-white/10 text-neutral-400'
          }`}>
            <MessageSquare className={`w-6 h-6 ${isLight ? 'text-slate-400' : 'text-neutral-500'}`} />
            <div className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-neutral-300'}`}>No Annotations on this File</div>
            <p className="text-[11px] leading-relaxed max-w-[200px]">
              Select any line range in the code viewer to attach a direct note or architectural critique.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
