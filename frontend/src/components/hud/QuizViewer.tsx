import React, { useState, useMemo } from 'react';
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
  Filter
} from 'lucide-react';
import { QuizQuestionType, QuizQuestionDifficulty } from '../../types/telemetry';

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
  accentColor = '#00f0ff',
  topicTitle,
  className = ''
}: QuizViewerProps) {
  const questions = useMemo(() => parseQuizQuestions(rawQuestions), [rawQuestions]);

  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [showAllAnswers, setShowAllAnswers] = useState<boolean>(true);
  const [expandedDistractors, setExpandedDistractors] = useState<Record<number, boolean>>({});
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [userAnswers, setUserAnswers] = useState<Record<number, string | boolean>>({});

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

  if (!questions || questions.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-xs border border-white/10 rounded-xl bg-slate-950/60">
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

  return (
    <div className={`space-y-4 font-sans ${className}`} data-testid="quiz-viewer">
      {/* Quiz Header & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs">
        <div className="flex items-center gap-2.5">
          <div
            className="p-1.5 rounded-lg flex-shrink-0"
            style={{
              backgroundColor: `${accentColor}18`,
              borderColor: `${accentColor}40`,
              borderWidth: '1px',
              color: accentColor
            }}
          >
            <HelpCircle size={15} />
          </div>
          <div>
            <div className="font-bold text-slate-100 flex items-center gap-2">
              <span>{topicTitle ? `${topicTitle} Quiz Bank` : 'Concept Practice Quiz'}</span>
              <span
                className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold"
                style={{
                  backgroundColor: `${accentColor}20`,
                  color: accentColor
                }}
              >
                {questions.length} QUESTIONS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Mastery assessment spanning core mechanisms, gotchas, and failure modes
            </p>
          </div>
        </div>

        {/* View Controls: Filter & Answer Key Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAllAnswers((prev) => !prev)}
            className="px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer bg-slate-900/80 hover:bg-slate-800"
            style={{
              borderColor: showAllAnswers ? `${accentColor}50` : 'rgba(255,255,255,0.1)',
              color: showAllAnswers ? accentColor : '#94a3b8'
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
                  ? 'bg-slate-800 font-bold'
                  : 'bg-slate-950/40 text-slate-400 hover:text-slate-200 border-white/5 hover:border-white/20'
              }`}
              style={{
                borderColor: isActive ? accentColor : undefined,
                color: isActive ? accentColor : undefined
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
              ? '#ff3366'
              : q.difficulty === 'EASY'
              ? '#00ff9d'
              : '#ffaa00';

          return (
            <div
              key={q.id || `q-${idx}`}
              className="p-4 rounded-xl bg-slate-950/70 border border-white/10 hover:border-white/20 transition-all shadow-lg space-y-3"
              data-testid="quiz-question-card"
            >
              {/* Question Card Top Bar */}
              <div className="flex items-center justify-between text-[11px] font-mono pb-2 border-b border-white/5 gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold px-1.5 py-0.5 rounded text-[10px]"
                    style={{
                      backgroundColor: `${accentColor}20`,
                      color: accentColor
                    }}
                  >
                    Q{qNum}
                  </span>
                  <span className="text-slate-400 font-bold tracking-wider">
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
                    <span className="text-[10px] text-slate-500 truncate max-w-[200px]" title={q.sourceAssertion}>
                      § {q.sourceAssertion}
                    </span>
                  )}
                </div>
              </div>

              {/* Question Content Based on Type */}

              {/* 1. MCQ (Multiple Choice) */}
              {q.type === 'MCQ' && (
                <div className="space-y-3">
                  <p className="text-slate-100 text-sm font-medium leading-relaxed">
                    {q.stem || q.prompt}
                  </p>

                  {q.options && (
                    <div className="space-y-2 pt-1">
                      {Object.entries(q.options).map(([key, optText]) => {
                        const isCorrect = String(q.correctAnswer).trim().toUpperCase() === key.toUpperCase();
                        const isSelected = userAnswer === key;
                        const revealAnswer = showAllAnswers || isSelected;

                        let optBorder = 'border-white/10';
                        let optBg = 'bg-slate-900/60 hover:bg-slate-900';
                        let optTextCol = 'text-slate-300';

                        if (revealAnswer && isCorrect) {
                          optBorder = 'border-[#00ff9d]/60';
                          optBg = 'bg-[#00ff9d]/10';
                          optTextCol = 'text-[#00ff9d]';
                        } else if (isSelected && !isCorrect) {
                          optBorder = 'border-[#ff3366]/60';
                          optBg = 'bg-[#ff3366]/10';
                          optTextCol = 'text-[#ff3366]';
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
                                  ? 'bg-[#00ff9d] text-slate-950'
                                  : isSelected && !isCorrect
                                  ? 'bg-[#ff3366] text-white'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {key}
                            </span>
                            <div className="flex-1">
                              <span className={optTextCol}>{optText}</span>
                            </div>
                            {revealAnswer && isCorrect && (
                              <CheckCircle2 size={14} className="text-[#00ff9d] flex-shrink-0 mt-0.5" />
                            )}
                            {isSelected && !isCorrect && (
                              <XCircle size={14} className="text-[#ff3366] flex-shrink-0 mt-0.5" />
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
                        className="text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                      >
                        {showDistractor ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        <span>
                          {showDistractor ? 'Hide Distractor Rationales' : 'View Distractor Rationales (Why other choices are wrong)'}
                        </span>
                      </button>

                      {showDistractor && (
                        <div className="mt-2 p-3 rounded-lg bg-slate-900/90 border border-white/10 space-y-2 text-xs">
                          {Object.entries(q.distractorExplanations).map(([optKey, explanation]) => (
                            <div key={optKey} className="flex items-start gap-2 text-[11.5px] leading-relaxed">
                              <span className="font-mono font-bold text-[#ffaa00] px-1 py-0.2 rounded bg-[#ffaa00]/10 border border-[#ffaa00]/30 text-[10px]">
                                Choice {optKey}
                              </span>
                              <span className="text-slate-300">{explanation}</span>
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
                  <p className="text-slate-100 text-sm font-medium leading-relaxed">
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

                      let btnBorder = 'border-white/10';
                      let btnBg = 'bg-slate-900/60 hover:bg-slate-900';
                      let btnCol = 'text-slate-300';

                      if (revealAnswer && isCorrect) {
                        btnBorder = 'border-[#00ff9d]/60';
                        btnBg = 'bg-[#00ff9d]/15';
                        btnCol = 'text-[#00ff9d] font-bold';
                      } else if (isSelected && !isCorrect) {
                        btnBorder = 'border-[#ff3366]/60';
                        btnBg = 'bg-[#ff3366]/15';
                        btnCol = 'text-[#ff3366] font-bold';
                      }

                      return (
                        <button
                          key={String(val)}
                          type="button"
                          onClick={() => handleSelectOption(idx, val)}
                          className={`flex-1 py-2 px-3 rounded-lg border ${btnBorder} ${btnBg} ${btnCol} text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-2`}
                        >
                          {val ? 'TRUE' : 'FALSE'}
                          {revealAnswer && isCorrect && <CheckCircle2 size={13} className="text-[#00ff9d]" />}
                          {isSelected && !isCorrect && <XCircle size={13} className="text-[#ff3366]" />}
                        </button>
                      );
                    })}
                  </div>

                  {(showAllAnswers || userAnswer !== undefined) && q.explanation && (
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/10 text-xs text-slate-300 leading-relaxed">
                      <span className="font-bold text-[#00ff9d] font-mono mr-1">Explanation:</span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              )}

              {/* 3. MATCHING */}
              {q.type === 'MATCHING' && (
                <div className="space-y-3">
                  <p className="text-slate-100 text-sm font-medium leading-relaxed">
                    {q.prompt || 'Match each architectural term to its correct definition:'}
                  </p>

                  {q.pairs && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                      {q.pairs.map((pair, pIdx) => (
                        <div
                          key={pIdx}
                          className="p-2.5 rounded-lg bg-slate-900/70 border border-white/10 space-y-1.5 text-xs"
                        >
                          <div className="flex items-center gap-2 font-mono font-bold" style={{ color: accentColor }}>
                            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">
                              {pIdx + 1}
                            </span>
                            <span>{pair.term}</span>
                          </div>
                          <div className="text-slate-300 text-[11.5px] leading-relaxed pl-6 border-l border-white/10">
                            {pair.definition}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 4. ORDERING */}
              {q.type === 'ORDERING' && (
                <div className="space-y-3">
                  <p className="text-slate-100 text-sm font-medium leading-relaxed">
                    {q.prompt || 'Chronological execution flow / sequence order:'}
                  </p>

                  {q.sequence && (
                    <div className="space-y-1.5 pt-1">
                      {q.sequence.map((step, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-2.5 rounded-lg bg-slate-900/70 border border-white/10 flex items-start gap-2.5 text-xs"
                        >
                          <span
                            className="w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[10px] flex-shrink-0"
                            style={{
                              backgroundColor: `${accentColor}20`,
                              color: accentColor
                            }}
                          >
                            {sIdx + 1}
                          </span>
                          <span className="text-slate-200 text-[11.5px] leading-relaxed flex-1">
                            {step}
                          </span>
                          {sIdx < (q.sequence?.length || 0) - 1 && (
                            <ArrowRight size={12} className="text-slate-600 flex-shrink-0 mt-1" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 5. FLASHCARD */}
              {q.type === 'FLASHCARD' && (
                <div className="space-y-2">
                  <div
                    onClick={() => toggleFlipCard(idx)}
                    className="p-4 rounded-xl bg-slate-900/80 border border-white/15 hover:border-[#00f0ff]/50 transition-all cursor-pointer text-center space-y-2 min-h-[100px] flex flex-col items-center justify-center"
                  >
                    {!isFlipped ? (
                      <>
                        <span className="text-[10px] font-mono text-slate-400 tracking-wider">
                          [ CLICK CARD TO FLIP ]
                        </span>
                        <h4 className="text-base font-bold text-white font-sans" style={{ color: accentColor }}>
                          {q.term || q.prompt}
                        </h4>
                      </>
                    ) : (
                      <div className="space-y-2 text-left w-full">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pb-1 border-b border-white/10">
                          <span className="font-bold text-[#00ff9d]">REVEALED DEFINITION</span>
                          <RotateCw size={11} />
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed font-sans">
                          {q.definition}
                        </p>
                        {q.memorizationReason && (
                          <div className="p-2 rounded bg-[#ffaa00]/10 border border-[#ffaa00]/30 text-[11px] text-[#ffaa00] font-mono leading-relaxed">
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
