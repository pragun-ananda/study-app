import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Layers,
  ArrowRight,
  ListOrdered,
  CreditCard,
  Eye,
  EyeOff,
  Filter,
  GripVertical
} from 'lucide-react';
import { QuizQuestionType, QuizQuestionDifficulty } from '../../types/telemetry';
import { useStore } from '../../store/useStore';

export interface QuizQuestionData {
  id?: string;
  type: QuizQuestionType | string;
  stem?: string;
  prompt?: string;
  statement?: string;
  options?: Record<string, string>;
  correctAnswer?: string | boolean;
  distractorExplanations?: Record<string, string>;
  explanation?: string;
  pairs?: Array<{ term: string; definition: string }>;
  sequence?: string[];
  term?: string;
  definition?: string;
  memorizationReason?: string;
  sourceAssertion?: string;
  difficulty?: QuizQuestionDifficulty;
}

export interface QuizViewerProps {
  questions: QuizQuestionData[] | string;
  accentColor?: string;
  topicTitle?: string;
  className?: string;
  defaultAuditMode?: boolean;
}

export function parseQuizQuestions(raw: QuizQuestionData[] | string): QuizQuestionData[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
    return [];
  } catch {
    return [];
  }
}

export function QuizViewer({
  questions: rawQuestions,
  accentColor,
  topicTitle,
  className = '',
  defaultAuditMode = false
}: QuizViewerProps) {
  const theme = useStore((state) => state.theme);
  const isLight = theme === 'light';
  const effectiveAccent = accentColor || (isLight ? '#0284c7' : '#00f0ff');

  const questions = useMemo(() => parseQuizQuestions(rawQuestions), [rawQuestions]);

  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [showAllAnswers, setShowAllAnswers] = useState<boolean>(defaultAuditMode);
  const [expandedDistractors, setExpandedDistractors] = useState<Record<number, boolean>>({});
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [userAnswers, setUserAnswers] = useState<Record<number, string | boolean>>({});

  // Matching question state: qIdx -> { [term]: selectedDefinition }
  const [userMatchingAnswers, setUserMatchingAnswers] = useState<Record<number, Record<string, string>>>({});
  const [matchingSubmitted, setMatchingSubmitted] = useState<Record<number, boolean>>({});
  const [openDropdown, setOpenDropdown] = useState<{ qIdx: number; term: string } | null>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!openDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-matching-dropdown]')) {
        setOpenDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openDropdown]);

  // Ordering question state: qIdx -> current ordered array of steps
  const [userOrderingAnswers, setUserOrderingAnswers] = useState<Record<number, string[]>>({});
  const [orderingSubmitted, setOrderingSubmitted] = useState<Record<number, boolean>>({});
  const [draggedOrderStep, setDraggedOrderStep] = useState<{ qIdx: number; stepIdx: number } | null>(null);

  // Stably scramble definitions for MATCHING questions so they don't align 1:1 initially
  const scrambledDefinitions = useMemo(() => {
    const map: Record<number, string[]> = {};
    questions.forEach((q, qIdx) => {
      if (q.type === 'MATCHING' && q.pairs && q.pairs.length > 0) {
        const defs = q.pairs.map((p) => p.definition);
        if (defs.length > 1) {
          // Cyclic displacement derangement: definition at index i moves to (i+1)%N
          map[qIdx] = [...defs.slice(1), defs[0]];
        } else {
          map[qIdx] = [...defs];
        }
      }
    });
    return map;
  }, [questions]);

  // Stably scramble initial sequence for ORDERING questions
  const initialOrderingMap = useMemo(() => {
    const map: Record<number, string[]> = {};
    questions.forEach((q, qIdx) => {
      if (q.type === 'ORDERING' && q.sequence && q.sequence.length > 0) {
        const seq = [...q.sequence];
        if (seq.length > 2) {
          map[qIdx] = [...seq].reverse();
        } else if (seq.length === 2) {
          map[qIdx] = [seq[1], seq[0]];
        } else {
          map[qIdx] = seq;
        }
      }
    });
    return map;
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    if (selectedTypeFilter === 'ALL') return questions;
    return questions.filter((q) => q.type === selectedTypeFilter);
  }, [questions, selectedTypeFilter]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: questions.length };
    questions.forEach((q) => {
      counts[q.type] = (counts[q.type] || 0) + 1;
    });
    return counts;
  }, [questions]);

  const hasAnyProgress = useMemo(() => {
    return (
      Object.keys(userAnswers).length > 0 ||
      Object.keys(userMatchingAnswers).length > 0 ||
      Object.keys(userOrderingAnswers).length > 0 ||
      Object.keys(matchingSubmitted).length > 0 ||
      Object.keys(orderingSubmitted).length > 0
    );
  }, [userAnswers, userMatchingAnswers, userOrderingAnswers, matchingSubmitted, orderingSubmitted]);

  if (!questions || questions.length === 0) {
    return (
      <div className={`p-8 text-center font-mono text-xs border rounded-xl ${
        isLight ? 'text-slate-500 border-slate-200 bg-slate-50' : 'text-slate-500 border-white/10 bg-slate-950/60'
      }`}>
        No quiz questions available for this concept yet.
      </div>
    );
  }

  const toggleDistractor = (idx: number) => {
    setExpandedDistractors((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleFlipCard = (idx: number) => {
    setFlippedCards((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSelectOption = (qIdx: number, optKey: string | boolean) => {
    setUserAnswers((prev) => ({ ...prev, [qIdx]: optKey }));
  };

  // Matching handlers
  const handleMatchSelect = (qIdx: number, term: string, definition: string) => {
    setUserMatchingAnswers((prev) => ({
      ...prev,
      [qIdx]: {
        ...(prev[qIdx] || {}),
        [term]: definition
      }
    }));
    setMatchingSubmitted((prev) => ({ ...prev, [qIdx]: false }));
  };

  const handleSubmitMatching = (qIdx: number) => {
    setMatchingSubmitted((prev) => ({ ...prev, [qIdx]: true }));
  };

  const handleResetMatching = (qIdx: number) => {
    setUserMatchingAnswers((prev) => {
      const next = { ...prev };
      delete next[qIdx];
      return next;
    });
    setMatchingSubmitted((prev) => ({ ...prev, [qIdx]: false }));
  };

  // Ordering handlers
  const moveStep = (qIdx: number, fromIdx: number, direction: -1 | 1) => {
    const current = userOrderingAnswers[qIdx] || initialOrderingMap[qIdx] || [];
    const toIdx = fromIdx + direction;
    if (toIdx < 0 || toIdx >= current.length) return;
    const next = [...current];
    const [removed] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, removed);
    setUserOrderingAnswers((prev) => ({ ...prev, [qIdx]: next }));
    setOrderingSubmitted((prev) => ({ ...prev, [qIdx]: false }));
  };

  const handleSubmitOrdering = (qIdx: number) => {
    setOrderingSubmitted((prev) => ({ ...prev, [qIdx]: true }));
  };

  const handleResetOrdering = (qIdx: number) => {
    setUserOrderingAnswers((prev) => ({
      ...prev,
      [qIdx]: [...(initialOrderingMap[qIdx] || [])]
    }));
    setOrderingSubmitted((prev) => ({ ...prev, [qIdx]: false }));
  };

  const handleDragStart = (qIdx: number, stepIdx: number) => {
    setDraggedOrderStep({ qIdx, stepIdx });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (qIdx: number, targetIdx: number) => {
    if (!draggedOrderStep || draggedOrderStep.qIdx !== qIdx) return;
    const fromIdx = draggedOrderStep.stepIdx;
    if (fromIdx === targetIdx) return;
    const current = userOrderingAnswers[qIdx] || initialOrderingMap[qIdx] || [];
    const next = [...current];
    const [removed] = next.splice(fromIdx, 1);
    next.splice(targetIdx, 0, removed);
    setUserOrderingAnswers((prev) => ({ ...prev, [qIdx]: next }));
    setOrderingSubmitted((prev) => ({ ...prev, [qIdx]: false }));
    setDraggedOrderStep(null);
  };

  const handleResetAllProgress = () => {
    setUserAnswers({});
    setUserMatchingAnswers({});
    setMatchingSubmitted({});
    setUserOrderingAnswers({});
    setOrderingSubmitted({});
    setFlippedCards({});
    setExpandedDistractors({});
  };

  return (
    <div className={`space-y-4 font-sans ${className}`} data-testid="quiz-viewer">
      {/* Quiz Header & Controls Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border text-xs shadow-sm ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-950/80 border-white/10'
      }`}>
        <div className="flex items-center gap-2.5">
          <div
            className="p-1.5 rounded-lg flex-shrink-0"
            style={{
              backgroundColor: `${effectiveAccent}18`,
              borderColor: `${effectiveAccent}40`,
              borderWidth: '1px',
              color: effectiveAccent
            }}
          >
            <HelpCircle size={15} />
          </div>
          <div>
            <div className={`font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              <span>{topicTitle ? `${topicTitle} Quiz Bank` : 'Concept Practice Quiz'}</span>
              <span
                className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold"
                style={{
                  backgroundColor: `${effectiveAccent}20`,
                  color: effectiveAccent
                }}
              >
                {questions.length} QUESTIONS
              </span>
            </div>
            <p className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Mastery assessment spanning core mechanisms, gotchas, and failure modes
            </p>
          </div>
        </div>

        {/* View Controls: Filter & Answer Key Toggle */}
        <div className="flex items-center gap-2">
          {hasAnyProgress && !showAllAnswers && (
            <button
              type="button"
              onClick={handleResetAllProgress}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900' : 'bg-slate-900/80 hover:bg-slate-800 border-white/10 text-slate-400 hover:text-slate-200'
              }`}
              title="Reset all quiz progress"
            >
              <RotateCw size={11} />
              <span>RESET</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAllAnswers((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
              isLight ? 'bg-slate-50 hover:bg-slate-100' : 'bg-slate-900/80 hover:bg-slate-800'
            }`}
            style={{
              borderColor: showAllAnswers ? `${effectiveAccent}60` : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
              color: showAllAnswers ? effectiveAccent : (isLight ? '#64748b' : '#94a3b8')
            }}
            title="Toggle between Review Mode (answers visible) and Practice Mode"
          >
            {showAllAnswers ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>{showAllAnswers ? 'AUDIT MODE' : 'PRACTICE MODE'}</span>
          </button>
        </div>
      </div>

      {/* Question Type Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
        {Object.entries(typeCounts).map(([type, count]) => {
          const isActive = selectedTypeFilter === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedTypeFilter(type)}
              className={`px-2.5 py-1 rounded-md border transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? isLight ? 'bg-slate-200/90 font-bold' : 'bg-slate-800 font-bold'
                  : isLight
                  ? 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300'
                  : 'bg-slate-950/40 text-slate-400 hover:text-slate-200 border-white/5 hover:border-white/20'
              }`}
              style={{
                borderColor: isActive ? effectiveAccent : undefined,
                color: isActive ? effectiveAccent : undefined
              }}
            >
              <span>{type.replace('_', ' ')}</span>
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Question Cards List */}
      <div className="space-y-4">
        {filteredQuestions.map((q, idx) => {
          const qNum = idx + 1;
          const isFlipped = Boolean(flippedCards[idx]);
          const showDistractor = Boolean(expandedDistractors[idx]);
          const userAnswer = userAnswers[idx];

          const diffColor =
            q.difficulty === 'HARD'
              ? (isLight ? '#e11d48' : '#ff3366')
              : q.difficulty === 'EASY'
              ? (isLight ? '#059669' : '#00ff9d')
              : (isLight ? '#d97706' : '#ffaa00');

          return (
            <div
              key={q.id || `q-${idx}`}
              className={`p-4 rounded-xl border transition-all shadow-md space-y-3 ${
                isLight
                  ? 'bg-white border-slate-200 hover:border-slate-300'
                  : 'bg-slate-950/70 border-white/10 hover:border-white/20'
              }`}
              data-testid="quiz-question-card"
            >
              {/* Question Card Top Bar */}
              <div className={`flex items-center justify-between text-[11px] font-mono pb-2 border-b gap-2 ${
                isLight ? 'border-slate-100' : 'border-white/5'
              }`}>
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold px-1.5 py-0.5 rounded text-[10px]"
                    style={{
                      backgroundColor: `${effectiveAccent}20`,
                      color: effectiveAccent
                    }}
                  >
                    Q{qNum}
                  </span>
                  <span className={`font-bold tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    {q.type.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {q.difficulty && (
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        backgroundColor: `${diffColor}18`,
                        color: diffColor,
                        borderColor: `${diffColor}40`,
                        borderWidth: '1px'
                      }}
                    >
                      {q.difficulty}
                    </span>
                  )}
                  {q.sourceAssertion && (
                    <span className={`text-[10px] truncate max-w-[200px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`} title={q.sourceAssertion}>
                      § {q.sourceAssertion}
                    </span>
                  )}
                </div>
              </div>

              {/* Question Content Based on Type */}

              {/* 1. MCQ (Multiple Choice) */}
              {q.type === 'MCQ' && (
                <div className="space-y-3">
                  <p className={`text-sm font-medium leading-relaxed ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    {q.stem || q.prompt}
                  </p>

                  {q.options && (
                    <div className="space-y-2 pt-1">
                      {Object.entries(q.options).map(([key, optText]) => {
                        const isCorrect = String(q.correctAnswer).trim().toUpperCase() === key.toUpperCase();
                        const isSelected = userAnswer === key;
                        const revealAnswer = showAllAnswers || isSelected;

                        let optBorder = isLight ? 'border-slate-200' : 'border-white/10';
                        let optBg = isLight ? 'bg-slate-50 hover:bg-slate-100' : 'bg-slate-900/60 hover:bg-slate-900';
                        let optTextCol = isLight ? 'text-slate-800' : 'text-slate-300';

                        if (revealAnswer && isCorrect) {
                          optBorder = isLight ? 'border-emerald-500/60' : 'border-[#00ff9d]/60';
                          optBg = isLight ? 'bg-emerald-50' : 'bg-[#00ff9d]/10';
                          optTextCol = isLight ? 'text-emerald-800 font-medium' : 'text-[#00ff9d]';
                        } else if (isSelected && !isCorrect) {
                          optBorder = isLight ? 'border-rose-400/60' : 'border-[#ff3366]/60';
                          optBg = isLight ? 'bg-rose-50' : 'bg-[#ff3366]/10';
                          optTextCol = isLight ? 'text-rose-800 font-medium' : 'text-[#ff3366]';
                        }

                        return (
                          <div
                            key={key}
                            onClick={() => handleSelectOption(idx, key)}
                            className={`p-2.5 rounded-lg border ${optBorder} ${optBg} transition-all cursor-pointer flex items-start gap-2.5 text-xs`}
                          >
                            <span
                              className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[11px] flex-shrink-0 ${
                                revealAnswer && isCorrect
                                  ? isLight ? 'bg-emerald-600 text-white' : 'bg-[#00ff9d] text-slate-950'
                                  : isSelected && !isCorrect
                                  ? isLight ? 'bg-rose-600 text-white' : 'bg-[#ff3366] text-white'
                                  : isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {key}
                            </span>
                            <div className="flex-1">
                              <span className={optTextCol}>{optText}</span>
                            </div>
                            {revealAnswer && isCorrect && (
                              <CheckCircle2 size={14} className={`flex-shrink-0 mt-0.5 ${isLight ? 'text-emerald-600' : 'text-[#00ff9d]'}`} />
                            )}
                            {isSelected && !isCorrect && (
                              <XCircle size={14} className={`flex-shrink-0 mt-0.5 ${isLight ? 'text-rose-600' : 'text-[#ff3366]'}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Distractor Explanations Expandable */}
                  {q.distractorExplanations && Object.keys(q.distractorExplanations).length > 0 && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => toggleDistractor(idx)}
                        className={`text-[11px] font-mono flex items-center gap-1.5 cursor-pointer ${
                          isLight ? 'text-slate-500 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {showDistractor ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        <span>
                          {showDistractor ? 'Hide Distractor Rationales' : 'View Distractor Rationales (Why other choices are wrong)'}
                        </span>
                      </button>

                      {showDistractor && (
                        <div className={`mt-2 p-3 rounded-lg border space-y-2 text-xs ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-white/10'
                        }`}>
                          {Object.entries(q.distractorExplanations).map(([optKey, explanation]) => (
                            <div key={optKey} className="flex items-start gap-2 text-[11.5px] leading-relaxed">
                              <span className={`font-mono font-bold px-1 py-0.2 rounded text-[10px] ${
                                isLight
                                  ? 'text-amber-800 bg-amber-100 border border-amber-300'
                                  : 'text-[#ffaa00] bg-[#ffaa00]/10 border border-[#ffaa00]/30'
                              }`}>
                                Choice {optKey}
                              </span>
                              <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>{explanation}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 2. TRUE_FALSE */}
              {q.type === 'TRUE_FALSE' && (
                <div className="space-y-3">
                  <p className={`text-sm font-medium leading-relaxed ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    "{q.statement || q.stem || q.prompt}"
                  </p>

                  <div className="flex gap-3 pt-1">
                    {[true, false].map((val) => {
                      const isCorrect =
                        q.correctAnswer === val ||
                        String(q.correctAnswer).toLowerCase() === String(val);
                      const isSelected =
                        userAnswer === val ||
                        String(userAnswer).toLowerCase() === String(val);
                      const revealAnswer = showAllAnswers || isSelected;

                      let btnBorder = isLight ? 'border-slate-200' : 'border-white/10';
                      let btnBg = isLight ? 'bg-slate-50 hover:bg-slate-100' : 'bg-slate-900/60 hover:bg-slate-900';
                      let btnCol = isLight ? 'text-slate-700' : 'text-slate-300';

                      if (revealAnswer && isCorrect) {
                        btnBorder = isLight ? 'border-emerald-500/60' : 'border-[#00ff9d]/60';
                        btnBg = isLight ? 'bg-emerald-50' : 'bg-[#00ff9d]/15';
                        btnCol = isLight ? 'text-emerald-800 font-bold' : 'text-[#00ff9d] font-bold';
                      } else if (isSelected && !isCorrect) {
                        btnBorder = isLight ? 'border-rose-400/60' : 'border-[#ff3366]/60';
                        btnBg = isLight ? 'bg-rose-50' : 'bg-[#ff3366]/15';
                        btnCol = isLight ? 'text-rose-800 font-bold' : 'text-[#ff3366] font-bold';
                      }

                      return (
                        <button
                          key={String(val)}
                          type="button"
                          onClick={() => handleSelectOption(idx, val)}
                          className={`flex-1 py-2 px-3 rounded-lg border ${btnBorder} ${btnBg} ${btnCol} text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-2`}
                        >
                          {val ? 'TRUE' : 'FALSE'}
                          {revealAnswer && isCorrect && <CheckCircle2 size={13} className={isLight ? 'text-emerald-600' : 'text-[#00ff9d]'} />}
                          {isSelected && !isCorrect && <XCircle size={13} className={isLight ? 'text-rose-600' : 'text-[#ff3366]'} />}
                        </button>
                      );
                    })}
                  </div>

                  {(showAllAnswers || userAnswer !== undefined) && q.explanation && (
                    <div className={`p-2.5 rounded-lg border text-xs leading-relaxed ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900/80 border-white/10 text-slate-300'
                    }`}>
                      <span className={`font-bold font-mono mr-1 ${isLight ? 'text-emerald-700' : 'text-[#00ff9d]'}`}>Explanation:</span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              )}

              {/* 3. MATCHING */}
              {q.type === 'MATCHING' && (
                <div className="space-y-3">
                  <p className={`text-sm font-medium leading-relaxed ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    {q.prompt || 'Match each architectural term to its correct definition:'}
                  </p>

                  {q.pairs && (
                    <div className="space-y-3 pt-1">
                      {(() => {
                        const availableDefs = scrambledDefinitions[idx] || q.pairs?.map((p) => p.definition) || [];

                        return (
                          <>
                            {/* Available Definitions Reference Pool */}
                            <div className={`p-3 rounded-xl border space-y-2.5 ${
                              isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-slate-900/60 border-white/10'
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 ${
                                  isLight ? 'text-slate-600' : 'text-slate-400'
                                }`}>
                                  <Layers size={13} style={{ color: effectiveAccent }} />
                                  <span>Available Definitions Pool</span>
                                </span>
                                <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {availableDefs.length} Choices Available
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {availableDefs.map((def, dIdx) => {
                                  const letter = String.fromCharCode(65 + dIdx);
                                  return (
                                    <div
                                      key={dIdx}
                                      className={`p-2.5 rounded-lg border flex items-start gap-2.5 text-xs transition-all ${
                                        isLight
                                          ? 'bg-white border-slate-200 text-slate-800 shadow-2xs'
                                          : 'bg-slate-950/80 border-white/5 text-slate-200'
                                      }`}
                                    >
                                      <span
                                        className="w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[10.5px] flex-shrink-0 mt-0.5"
                                        style={{ backgroundColor: `${effectiveAccent}20`, color: effectiveAccent }}
                                      >
                                        {letter}
                                      </span>
                                      <p className="text-[12px] leading-relaxed font-sans flex-1 select-none">
                                        {def}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Grid of Term Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {q.pairs.map((pair, pIdx) => {
                                const userMatch = userMatchingAnswers[idx]?.[pair.term];
                                const isSubmitted = Boolean(matchingSubmitted[idx]);
                                const isAudit = showAllAnswers;
                                const isEvaluated = isSubmitted || isAudit;
                                const isCorrect = isAudit ? true : userMatch === pair.definition;
                                const isDropdownOpen = openDropdown?.qIdx === idx && openDropdown?.term === pair.term;
                                const selectedLetter = userMatch
                                  ? String.fromCharCode(65 + availableDefs.indexOf(userMatch))
                                  : null;

                                let cardBorder = isLight ? 'border-slate-200' : 'border-white/10';
                                let cardBg = isLight ? 'bg-slate-50' : 'bg-slate-900/60';

                                if (isEvaluated) {
                                  if (isCorrect) {
                                    cardBorder = isLight ? 'border-emerald-500/60' : 'border-[#00ff9d]/60';
                                    cardBg = isLight ? 'bg-emerald-50/70' : 'bg-[#00ff9d]/10';
                                  } else if (userMatch) {
                                    cardBorder = isLight ? 'border-rose-400/60' : 'border-[#ff3366]/60';
                                    cardBg = isLight ? 'bg-rose-50/70' : 'bg-[#ff3366]/10';
                                  } else {
                                    cardBorder = isLight ? 'border-amber-400/60' : 'border-[#ffaa00]/40';
                                    cardBg = isLight ? 'bg-amber-50/50' : 'bg-[#ffaa00]/10';
                                  }
                                }

                                return (
                                  <div
                                    key={pIdx}
                                    className={`p-3.5 rounded-xl border ${cardBorder} ${cardBg} space-y-2.5 text-xs transition-all relative ${
                                      isDropdownOpen ? 'z-30' : 'z-0'
                                    }`}
                                  >
                                    {/* Term Header */}
                                    <div className="flex items-center justify-between gap-2 font-mono">
                                      <div className="flex items-center gap-2 font-bold" style={{ color: effectiveAccent }}>
                                        <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] ${
                                          isLight ? 'bg-slate-200 text-slate-700 border border-slate-300' : 'bg-white/10 border border-white/10'
                                        }`}>
                                          {pIdx + 1}
                                        </span>
                                        <span className="text-xs font-sans font-bold">{pair.term}</span>
                                      </div>
                                      {isEvaluated && (
                                        isCorrect ? (
                                          <span className={`flex items-center gap-1 text-[10px] font-bold ${isLight ? 'text-emerald-700' : 'text-[#00ff9d]'}`}>
                                            <CheckCircle2 size={13} />
                                            <span>CORRECT</span>
                                          </span>
                                        ) : (
                                          <span className={`flex items-center gap-1 text-[10px] font-bold ${isLight ? 'text-rose-700' : 'text-[#ff3366]'}`}>
                                            <XCircle size={13} />
                                            <span>{userMatch ? 'INCORRECT' : 'UNANSWERED'}</span>
                                          </span>
                                        )
                                      )}
                                    </div>

                                    {/* Interactive Selection or Revealed Match */}
                                    {!isEvaluated ? (
                                      <div className="space-y-2 pt-0.5" data-matching-dropdown="true">
                                        {/* Hidden select for accessibility & programmatic automation */}
                                        <select
                                          aria-label={`Match definition for ${pair.term}`}
                                          value={userMatch || ''}
                                          onChange={(e) => handleMatchSelect(idx, pair.term, e.target.value)}
                                          className="sr-only"
                                          tabIndex={-1}
                                        >
                                          <option value="">-- Choose matching definition --</option>
                                          {availableDefs.map((def, dIdx) => (
                                            <option key={dIdx} value={def}>
                                              {def}
                                            </option>
                                          ))}
                                        </select>

                                        {/* Custom Readable Dropdown Trigger Button */}
                                        <div className="relative">
                                          <button
                                            type="button"
                                            aria-label={`Select definition for ${pair.term}`}
                                            aria-expanded={isDropdownOpen}
                                            onClick={() => setOpenDropdown(isDropdownOpen ? null : { qIdx: idx, term: pair.term })}
                                            className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                              isDropdownOpen
                                                ? isLight
                                                  ? 'border-sky-500 ring-2 ring-sky-500/20 bg-white shadow-xs'
                                                  : 'border-[#00f0ff] ring-2 ring-[#00f0ff]/20 bg-slate-900 shadow-xs'
                                                : userMatch
                                                ? isLight
                                                  ? 'bg-sky-50/60 border-sky-300 hover:border-sky-400'
                                                  : 'bg-[#00f0ff]/5 border-[#00f0ff]/30 hover:border-[#00f0ff]/50'
                                                : isLight
                                                ? 'bg-white border-slate-300 hover:border-slate-400 text-slate-500'
                                                : 'bg-slate-900 border-white/20 hover:border-white/30 text-slate-400'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                              {userMatch ? (
                                                <>
                                                  <span
                                                    className="font-mono font-bold px-1.5 py-0.5 rounded text-[10px] flex-shrink-0"
                                                    style={{ backgroundColor: `${effectiveAccent}20`, color: effectiveAccent }}
                                                  >
                                                    [{selectedLetter}]
                                                  </span>
                                                  <span className={`text-[12px] font-sans truncate ${isLight ? 'text-slate-900 font-medium' : 'text-slate-100'}`}>
                                                    {userMatch}
                                                  </span>
                                                </>
                                              ) : (
                                                <span className="text-[11.5px] italic">
                                                  -- Choose matching definition --
                                                </span>
                                              )}
                                            </div>
                                            <ChevronDown
                                              size={14}
                                              className={`transition-transform duration-200 opacity-60 flex-shrink-0 ${
                                                isDropdownOpen ? 'rotate-180' : ''
                                              }`}
                                            />
                                          </button>

                                          {/* Custom Readable Dropdown Popover List */}
                                          {isDropdownOpen && (
                                            <div
                                              className={`absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border shadow-2xl p-1.5 space-y-1 backdrop-blur-md transition-all ${
                                                isLight
                                                  ? 'bg-white/98 border-slate-200 text-slate-800'
                                                  : 'bg-slate-900/98 border-white/20 text-slate-100'
                                              }`}
                                              style={{ maxHeight: '280px', overflowY: 'auto' }}
                                              role="listbox"
                                            >
                                              <div className={`px-2.5 py-1 text-[10px] font-mono tracking-wider font-bold uppercase border-b pb-1 mb-1 flex items-center justify-between ${
                                                isLight ? 'text-slate-500 border-slate-100' : 'text-slate-400 border-white/10'
                                              }`}>
                                                <span>SELECT DEFINITION</span>
                                                <span>{availableDefs.length} CHOICES</span>
                                              </div>

                                              {availableDefs.map((def, dIdx) => {
                                                const letter = String.fromCharCode(65 + dIdx);
                                                const isSelected = userMatch === def;
                                                const usedByTerm = Object.entries(userMatchingAnswers[idx] || {}).find(
                                                  ([t, d]) => d === def && t !== pair.term
                                                )?.[0];

                                                return (
                                                  <div
                                                    key={dIdx}
                                                    role="option"
                                                    aria-selected={isSelected}
                                                    onClick={() => {
                                                      handleMatchSelect(idx, pair.term, def);
                                                      setOpenDropdown(null);
                                                    }}
                                                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                                                      isSelected
                                                        ? isLight
                                                          ? 'bg-sky-50 border-sky-300 text-sky-950 font-medium'
                                                          : 'bg-[#00f0ff]/15 border-[#00f0ff]/40 text-[#00f0ff]'
                                                        : isLight
                                                        ? 'bg-slate-50/60 hover:bg-slate-100 border-slate-200/80 hover:border-slate-300 text-slate-700'
                                                        : 'bg-slate-950/60 hover:bg-slate-800/90 border-white/5 hover:border-white/20 text-slate-300'
                                                    }`}
                                                  >
                                                    <span
                                                      className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[10px] flex-shrink-0 mt-0.5 ${
                                                        isSelected
                                                          ? 'text-white'
                                                          : isLight
                                                          ? 'bg-slate-200 text-slate-700'
                                                          : 'bg-slate-800 text-slate-300'
                                                      }`}
                                                      style={isSelected ? { backgroundColor: effectiveAccent } : undefined}
                                                    >
                                                      {letter}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                      <p className="text-[12px] leading-relaxed font-sans select-none">
                                                        {def}
                                                      </p>
                                                      {usedByTerm && !isSelected && (
                                                        <span className={`block text-[10px] font-mono mt-0.5 ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                                                          Already assigned to: {usedByTerm}
                                                        </span>
                                                      )}
                                                    </div>
                                                    {isSelected && (
                                                      <CheckCircle2 size={14} className={`flex-shrink-0 mt-0.5 ${isLight ? 'text-sky-600' : 'text-[#00f0ff]'}`} />
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>

                                        {/* Quick Match Choice Pills */}
                                        <div className="flex items-center gap-1.5 pt-0.5">
                                          <span className={`text-[10.5px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                            Quick Match:
                                          </span>
                                          <div className="flex flex-wrap gap-1">
                                            {availableDefs.map((def, dIdx) => {
                                              const letter = String.fromCharCode(65 + dIdx);
                                              const isSelected = userMatch === def;
                                              return (
                                                <button
                                                  key={letter}
                                                  type="button"
                                                  onClick={() => handleMatchSelect(idx, pair.term, def)}
                                                  title={`Assign [${letter}]: ${def}`}
                                                  className={`w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-[10px] transition-all cursor-pointer border ${
                                                    isSelected
                                                      ? 'text-white border-transparent shadow-xs'
                                                      : isLight
                                                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                                                      : 'bg-slate-800 hover:bg-slate-700 border-white/10 text-slate-300'
                                                  }`}
                                                  style={isSelected ? { backgroundColor: effectiveAccent } : undefined}
                                                >
                                                  {letter}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        {/* Selected Definition Full Preview */}
                                        {userMatch && (
                                          <div className={`p-2 rounded-lg border text-[11.5px] leading-relaxed flex items-start gap-2 ${
                                            isLight ? 'bg-sky-50/70 border-sky-200 text-sky-950' : 'bg-[#00f0ff]/10 border-[#00f0ff]/20 text-[#00f0ff]'
                                          }`}>
                                            <span className={`font-mono font-bold text-[10px] px-1.5 py-0.2 rounded flex-shrink-0 mt-0.5 ${
                                              isLight ? 'bg-sky-200 text-sky-900' : 'bg-[#00f0ff]/20 text-[#00f0ff]'
                                            }`}>
                                              [{selectedLetter}]
                                            </span>
                                            <p className="flex-1 font-sans">{userMatch}</p>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="space-y-1.5 pt-0.5">
                                        {isAudit || isCorrect ? (
                                          <div className={`p-2.5 rounded-lg border text-[11.5px] leading-relaxed flex items-start gap-2 ${
                                            isLight ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900' : 'bg-[#00ff9d]/15 border-[#00ff9d]/30 text-[#00ff9d]'
                                          }`}>
                                            <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" />
                                            <span className="flex-1 font-sans">{pair.definition}</span>
                                          </div>
                                        ) : (
                                          <div className="space-y-1.5">
                                            {userMatch && (
                                              <div className={`p-2 rounded-lg border text-[11px] leading-relaxed line-through ${
                                                isLight ? 'bg-rose-100/70 border-rose-300 text-rose-900' : 'bg-[#ff3366]/15 border-[#ff3366]/30 text-[#ff3366]'
                                              }`}>
                                                Your match: "{userMatch}"
                                              </div>
                                            )}
                                            <div className={`p-2.5 rounded-lg border text-[11.5px] leading-relaxed ${
                                              isLight ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900' : 'bg-[#00ff9d]/15 border-[#00ff9d]/30 text-[#00ff9d]'
                                            }`}>
                                              <span className="font-bold font-mono text-[10px] block mb-0.5">CORRECT DEFINITION:</span>
                                              <span className="font-sans">{pair.definition}</span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}

                      {/* Matching Controls & Score Bar */}
                      {(() => {
                        const totalPairs = q.pairs?.length || 0;
                        const userMatches = userMatchingAnswers[idx] || {};
                        const matchedCount = Object.keys(userMatches).length;
                        const isSubmitted = Boolean(matchingSubmitted[idx]);
                        const correctCount = q.pairs?.filter((p) => userMatches[p.term] === p.definition).length || 0;

                        return (
                          <div className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border text-xs ${
                            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-white/10'
                          }`}>
                            {!isSubmitted && !showAllAnswers ? (
                              <>
                                <span className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                                  {matchedCount} of {totalPairs} terms matched
                                </span>
                                <button
                                  type="button"
                                  disabled={matchedCount === 0}
                                  onClick={() => handleSubmitMatching(idx)}
                                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    matchedCount === 0
                                      ? 'opacity-40 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-500'
                                      : 'text-white hover:brightness-110 shadow-sm'
                                  }`}
                                  style={{ backgroundColor: matchedCount > 0 ? effectiveAccent : undefined }}
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Check Matches</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                                    showAllAnswers || correctCount === totalPairs
                                      ? isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-[#00ff9d]/20 text-[#00ff9d]'
                                      : isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-400/20 text-amber-300'
                                  }`}>
                                    {showAllAnswers || correctCount === totalPairs
                                      ? `All ${totalPairs} Correct!`
                                      : `${correctCount} / ${totalPairs} Correct`}
                                  </span>
                                </div>
                                {!showAllAnswers && (
                                  <button
                                    type="button"
                                    onClick={() => handleResetMatching(idx)}
                                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                                      isLight ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-white/10 text-slate-300'
                                    }`}
                                  >
                                    <RotateCw size={11} />
                                    <span>Reset Matches</span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })()}

                      {/* Explanation */}
                      {(showAllAnswers || matchingSubmitted[idx]) && q.explanation && (
                        <div className={`p-2.5 rounded-lg border text-xs leading-relaxed ${
                          isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900/80 border-white/10 text-slate-300'
                        }`}>
                          <span className={`font-bold font-mono mr-1 ${isLight ? 'text-emerald-700' : 'text-[#00ff9d]'}`}>Explanation:</span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 4. ORDERING */}
              {q.type === 'ORDERING' && (
                <div className="space-y-3">
                  <p className={`text-sm font-medium leading-relaxed ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    {q.prompt || 'Chronological execution flow / sequence order:'}
                  </p>

                  {q.sequence && (
                    <div className="space-y-2 pt-1">
                      {(() => {
                        const isAudit = showAllAnswers;
                        const isSubmitted = Boolean(orderingSubmitted[idx]);
                        const isEvaluated = isSubmitted || isAudit;
                        const currentSteps = isAudit
                          ? q.sequence
                          : userOrderingAnswers[idx] || initialOrderingMap[idx] || q.sequence;
                        const correctStepsCount = currentSteps.filter((s, sIdx) => s === q.sequence?.[sIdx]).length;

                        return (
                          <>
                            {!isEvaluated && (
                              <p className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                Drag steps or use Up/Down arrows to arrange in chronological order:
                              </p>
                            )}

                            <div className="space-y-1.5">
                              {currentSteps.map((step, sIdx) => {
                                const isCorrectPosition = isAudit ? true : step === q.sequence?.[sIdx];
                                const targetPosition = (q.sequence?.indexOf(step) ?? -1) + 1;

                                let stepBorder = isLight ? 'border-slate-200' : 'border-white/10';
                                let stepBg = isLight ? 'bg-slate-50' : 'bg-slate-900/70';

                                if (isEvaluated) {
                                  if (isCorrectPosition) {
                                    stepBorder = isLight ? 'border-emerald-500/60' : 'border-[#00ff9d]/60';
                                    stepBg = isLight ? 'bg-emerald-50/70' : 'bg-[#00ff9d]/10';
                                  } else {
                                    stepBorder = isLight ? 'border-rose-400/60' : 'border-[#ff3366]/60';
                                    stepBg = isLight ? 'bg-rose-50/70' : 'bg-[#ff3366]/10';
                                  }
                                }

                                return (
                                  <div
                                    key={step}
                                    draggable={!isEvaluated}
                                    onDragStart={() => handleDragStart(idx, sIdx)}
                                    onDragOver={handleDragOver}
                                    onDrop={() => handleDrop(idx, sIdx)}
                                    className={`p-2.5 rounded-lg border ${stepBorder} ${stepBg} flex items-center gap-2.5 text-xs transition-all select-none ${
                                      !isEvaluated ? 'cursor-move hover:border-slate-300 dark:hover:border-white/25' : ''
                                    }`}
                                  >
                                    {/* Drag Handle */}
                                    {!isEvaluated && (
                                      <div className="text-slate-400 hover:text-slate-200 cursor-grab active:cursor-grabbing p-0.5" title="Drag to reorder">
                                        <GripVertical size={14} />
                                      </div>
                                    )}

                                    {/* Step Index Badge */}
                                    <span
                                      className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[10px] flex-shrink-0 ${
                                        isEvaluated
                                          ? isCorrectPosition
                                            ? isLight ? 'bg-emerald-600 text-white' : 'bg-[#00ff9d] text-slate-950'
                                            : isLight ? 'bg-rose-600 text-white' : 'bg-[#ff3366] text-white'
                                          : ''
                                      }`}
                                      style={
                                        !isEvaluated
                                          ? {
                                              backgroundColor: `${effectiveAccent}20`,
                                              color: effectiveAccent
                                            }
                                          : undefined
                                      }
                                    >
                                      {sIdx + 1}
                                    </span>

                                    {/* Step Text & Validation Feedback */}
                                    <div className="flex-1 min-w-0">
                                      <span className={`text-[11.5px] leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                                        {step}
                                      </span>
                                      {isEvaluated && !isCorrectPosition && (
                                        <span className={`block text-[10px] font-mono mt-0.5 ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>
                                          Expected position: Step #{targetPosition}
                                        </span>
                                      )}
                                    </div>

                                    {/* Status Icon */}
                                    {isEvaluated && (
                                      isCorrectPosition ? (
                                        <CheckCircle2 size={14} className={`flex-shrink-0 ${isLight ? 'text-emerald-600' : 'text-[#00ff9d]'}`} />
                                      ) : (
                                        <XCircle size={14} className={`flex-shrink-0 ${isLight ? 'text-rose-600' : 'text-[#ff3366]'}`} />
                                      )
                                    )}

                                    {/* Up / Down Reorder Buttons */}
                                    {!isEvaluated && (
                                      <div className="flex items-center gap-0.5 flex-shrink-0">
                                        <button
                                          type="button"
                                          disabled={sIdx === 0}
                                          onClick={() => moveStep(idx, sIdx, -1)}
                                          aria-label={`Move "${step}" up`}
                                          className={`p-1 rounded border transition-all ${
                                            sIdx === 0
                                              ? 'opacity-20 cursor-not-allowed border-transparent'
                                              : isLight
                                              ? 'hover:bg-slate-200 border-slate-300 text-slate-700'
                                              : 'hover:bg-slate-800 border-white/10 text-slate-300'
                                          }`}
                                          title="Move Step Up"
                                        >
                                          <ChevronUp size={12} />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={sIdx === currentSteps.length - 1}
                                          onClick={() => moveStep(idx, sIdx, 1)}
                                          aria-label={`Move "${step}" down`}
                                          className={`p-1 rounded border transition-all ${
                                            sIdx === currentSteps.length - 1
                                              ? 'opacity-20 cursor-not-allowed border-transparent'
                                              : isLight
                                              ? 'hover:bg-slate-200 border-slate-300 text-slate-700'
                                              : 'hover:bg-slate-800 border-white/10 text-slate-300'
                                          }`}
                                          title="Move Step Down"
                                        >
                                          <ChevronDown size={12} />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Ordering Controls & Score Bar */}
                            <div className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border text-xs ${
                              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-white/10'
                            }`}>
                              {!isEvaluated ? (
                                <>
                                  <span className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                                    {currentSteps.length} sequence steps
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleSubmitOrdering(idx)}
                                    className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer hover:brightness-110 shadow-sm"
                                    style={{ backgroundColor: effectiveAccent }}
                                  >
                                    <CheckCircle2 size={13} />
                                    <span>Check Order</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                                      isAudit || correctStepsCount === currentSteps.length
                                        ? isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-[#00ff9d]/20 text-[#00ff9d]'
                                        : isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-400/20 text-amber-300'
                                    }`}>
                                      {isAudit || correctStepsCount === currentSteps.length
                                        ? `All ${currentSteps.length} Steps in Correct Order!`
                                        : `${correctStepsCount} / ${currentSteps.length} Steps in Correct Order`}
                                    </span>
                                  </div>
                                  {!showAllAnswers && (
                                    <button
                                      type="button"
                                      onClick={() => handleResetOrdering(idx)}
                                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                                        isLight ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-white/10 text-slate-300'
                                      }`}
                                    >
                                      <RotateCw size={11} />
                                      <span>Reset Order</span>
                                    </button>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Explanation */}
                            {(showAllAnswers || orderingSubmitted[idx]) && q.explanation && (
                              <div className={`p-2.5 rounded-lg border text-xs leading-relaxed ${
                                isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900/80 border-white/10 text-slate-300'
                              }`}>
                                <span className={`font-bold font-mono mr-1 ${isLight ? 'text-emerald-700' : 'text-[#00ff9d]'}`}>Explanation:</span>
                                {q.explanation}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* 5. FLASHCARD */}
              {q.type === 'FLASHCARD' && (
                <div className="space-y-2">
                  <div
                    onClick={() => toggleFlipCard(idx)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer text-center space-y-2 min-h-[100px] flex flex-col items-center justify-center ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 hover:border-sky-400 shadow-sm'
                        : 'bg-slate-900/80 border-white/15 hover:border-[#00f0ff]/50'
                    }`}
                  >
                    {!isFlipped ? (
                      <>
                        <span className={`text-[10px] font-mono tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          [ CLICK CARD TO FLIP ]
                        </span>
                        <h4 className="text-base font-bold font-sans" style={{ color: effectiveAccent }}>
                          {q.term || q.prompt}
                        </h4>
                      </>
                    ) : (
                      <div className="space-y-2 text-left w-full">
                        <div className={`flex items-center justify-between text-[10px] font-mono pb-1 border-b ${
                          isLight ? 'text-slate-500 border-slate-200' : 'text-slate-400 border-white/10'
                        }`}>
                          <span className={`font-bold ${isLight ? 'text-emerald-700' : 'text-[#00ff9d]'}`}>REVEALED DEFINITION</span>
                          <RotateCw size={11} />
                        </div>
                        <p className={`text-xs leading-relaxed font-sans ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                          {q.definition}
                        </p>
                        {q.memorizationReason && (
                          <div className={`p-2 rounded border text-[11px] font-mono leading-relaxed ${
                            isLight
                              ? 'bg-amber-50 border-amber-300 text-amber-900'
                              : 'bg-[#ffaa00]/10 border-[#ffaa00]/30 text-[#ffaa00]'
                          }`}>
                            <strong>Why remember:</strong> {q.memorizationReason}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default QuizViewer;
