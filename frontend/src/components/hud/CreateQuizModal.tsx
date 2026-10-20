import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Code,
  Layers,
  FileText,
  ListOrdered,
  CreditCard,
  Check
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import {
  QuizQuestionType,
  QuizQuestionDifficulty,
  QuizQuestionItem
} from '../../types/telemetry';
import { getDomainBaseColor } from '../../utils/theme';

const QUESTION_TYPES: Array<{ type: QuizQuestionType; label: string; icon: any }> = [
  { type: 'MCQ', label: 'Multiple Choice', icon: CheckCircle2 },
  { type: 'TRUE_FALSE', label: 'True / False', icon: Check },
  { type: 'FLASHCARD', label: 'Flashcard', icon: CreditCard },
  { type: 'ORDERING', label: 'Step Ordering', icon: ListOrdered },
  { type: 'MATCHING', label: 'Matching Pairs', icon: Layers }
];

const DIFFICULTIES: QuizQuestionDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

function createDefaultQuestion(type: QuizQuestionType = 'MCQ'): QuizQuestionItem {
  switch (type) {
    case 'MCQ':
      return {
        type: 'MCQ',
        prompt: '',
        options: {
          A: '',
          B: '',
          C: '',
          D: ''
        },
        correctAnswer: 'A',
        explanation: '',
        difficulty: 'MEDIUM'
      };
    case 'TRUE_FALSE':
      return {
        type: 'TRUE_FALSE',
        prompt: '',
        correctAnswer: 'true',
        explanation: '',
        difficulty: 'EASY'
      };
    case 'FLASHCARD':
      return {
        type: 'FLASHCARD',
        term: '',
        definition: '',
        memorizationReason: '',
        difficulty: 'MEDIUM'
      };
    case 'ORDERING':
      return {
        type: 'ORDERING',
        prompt: '',
        sequence: ['', '', ''],
        explanation: '',
        difficulty: 'MEDIUM'
      };
    case 'MATCHING':
      return {
        type: 'MATCHING',
        prompt: '',
        pairs: [
          { term: '', definition: '' },
          { term: '', definition: '' }
        ],
        explanation: '',
        difficulty: 'MEDIUM'
      };
    default:
      return {
        type: 'MCQ',
        prompt: '',
        options: { A: '', B: '' },
        correctAnswer: 'A',
        difficulty: 'MEDIUM'
      };
  }
}

export default function CreateQuizModal() {
  const theme = useStore((state) => state.theme);
  const isLight = theme === 'light';

  const isCreateQuizOpen = useStore((state) => state.isCreateQuizOpen);
  const setIsCreateQuizOpen = useStore((state) => state.setIsCreateQuizOpen);
  const createQuizTargetTopicId = useStore((state) => state.createQuizTargetTopicId);
  const setCreateQuizTargetTopicId = useStore((state) => state.setCreateQuizTargetTopicId);

  const topicNodes = useStore((state) => state.topicNodes);
  const addQuizToTopic = useStore((state) => state.addQuizToTopic);

  const [targetTopicId, setTargetTopicId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'BUILDER' | 'JSON'>('BUILDER');
  const [questions, setQuestions] = useState<QuizQuestionItem[]>([createDefaultQuestion('MCQ')]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [rawJson, setRawJson] = useState('');
  const [rawJsonError, setRawJsonError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync target topic when opened
  useEffect(() => {
    if (isCreateQuizOpen) {
      const initialTopic =
        createQuizTargetTopicId && topicNodes.some((t) => t.id === createQuizTargetTopicId)
          ? createQuizTargetTopicId
          : topicNodes[0]?.id || '';

      setTargetTopicId(initialTopic);
      setTitle('');
      setDescription('');
      const defaultQ = [createDefaultQuestion('MCQ')];
      setQuestions(defaultQ);
      setActiveQuestionIndex(0);
      setRawJson(JSON.stringify(defaultQ, null, 2));
      setRawJsonError(null);
      setErrorMessage(null);
      setMode('BUILDER');
      setIsSubmitting(false);
    }
  }, [isCreateQuizOpen, createQuizTargetTopicId, topicNodes]);

  // Global Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCreateQuizOpen && !isSubmitting) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateQuizOpen, isSubmitting]);

  const selectedNode = useMemo(
    () => topicNodes.find((t) => t.id === targetTopicId),
    [topicNodes, targetTopicId]
  );

  const activeColor = selectedNode
    ? getDomainBaseColor(selectedNode.category, theme)
    : isLight
    ? '#0284c7'
    : '#00f0ff';

  const handleClose = () => {
    if (isSubmitting) return;
    setIsCreateQuizOpen(false);
    setCreateQuizTargetTopicId(null);
  };

  const handleModeSwitch = (newMode: 'BUILDER' | 'JSON') => {
    if (newMode === 'JSON') {
      setRawJson(JSON.stringify(questions, null, 2));
      setRawJsonError(null);
      setMode('JSON');
    } else {
      // Parse JSON back to questions
      try {
        const parsed = JSON.parse(rawJson);
        const list = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.questions)
          ? parsed.questions
          : null;

        if (!list || list.length === 0) {
          setRawJsonError('JSON must contain an array of questions or an object with a "questions" array.');
          return;
        }

        setQuestions(list);
        setActiveQuestionIndex(0);
        setRawJsonError(null);
        setMode('BUILDER');
      } catch (err: any) {
        setRawJsonError(`Invalid JSON syntax: ${err.message}`);
      }
    }
  };

  const updateCurrentQuestion = (updates: Partial<QuizQuestionItem>) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === activeQuestionIndex ? { ...q, ...updates } : q))
    );
  };

  const handleAddQuestion = (type: QuizQuestionType = 'MCQ') => {
    const newQ = createDefaultQuestion(type);
    setQuestions((prev) => [...prev, newQ]);
    setActiveQuestionIndex(questions.length);
  };

  const handleRemoveQuestion = (indexToRemove: number) => {
    if (questions.length <= 1) {
      setErrorMessage('A quiz must contain at least one question.');
      return;
    }
    setQuestions((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (activeQuestionIndex >= indexToRemove && activeQuestionIndex > 0) {
      setActiveQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetTopicId) {
      setErrorMessage('Please select a target concept node.');
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage('Quiz title is required.');
      return;
    }

    let finalQuestions: QuizQuestionItem[] = questions;

    if (mode === 'JSON') {
      try {
        const parsed = JSON.parse(rawJson);
        finalQuestions = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.questions)
          ? parsed.questions
          : [];
      } catch (err: any) {
        setErrorMessage(`Cannot save: Invalid JSON: ${err.message}`);
        return;
      }
    }

    if (!finalQuestions || finalQuestions.length === 0) {
      setErrorMessage('At least one question is required.');
      return;
    }

    // Validate each question
    for (let i = 0; i < finalQuestions.length; i++) {
      const q = finalQuestions[i];
      const promptText = q.prompt || q.stem || q.statement || q.term;
      if (!promptText || !promptText.trim()) {
        setErrorMessage(`Question ${i + 1} is missing a prompt or term.`);
        return;
      }

      if (q.type === 'MCQ') {
        const opts = q.options || {};
        const keys = Object.keys(opts);
        if (keys.length < 2) {
          setErrorMessage(`Question ${i + 1} (MCQ) must have at least 2 options.`);
          return;
        }
        if (!q.correctAnswer) {
          setErrorMessage(`Question ${i + 1} (MCQ) must have a correct option selected.`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await addQuizToTopic(targetTopicId, {
        title: trimmedTitle,
        description: description.trim() || undefined,
        questions: finalQuestions
      });

      handleClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create quiz');
      setIsSubmitting(false);
    }
  };

  const currentQ = questions[activeQuestionIndex] || questions[0];

  return (
    <AnimatePresence>
      {isCreateQuizOpen && (
        <div
          data-testid="create-quiz-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 pointer-events-auto font-sans"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleClose}
            className={`absolute inset-0 backdrop-blur-md cursor-pointer transition-colors duration-200 ${
              isLight ? 'bg-slate-900/40' : 'bg-black/80'
            }`}
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-quiz-modal-title"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              borderColor: isLight ? `${activeColor}40` : `${activeColor}70`,
              boxShadow: isLight
                ? `0 20px 45px -10px ${activeColor}20, 0 8px 24px -5px rgba(0,0,0,0.1)`
                : `0 0 50px -10px ${activeColor}40, 0 0 20px 0px ${activeColor}20`
            }}
            className={`relative w-full max-w-4xl max-h-[90vh] rounded-2xl border flex flex-col overflow-hidden backdrop-blur-xl ${
              isLight ? 'bg-white/95 text-slate-800' : 'bg-[#080c16]/95 text-slate-100'
            }`}
          >
            {/* Header */}
            <div
              className={`p-4 border-b flex items-center justify-between flex-shrink-0 ${
                isLight ? 'border-slate-200 bg-slate-50/80' : 'border-white/10 bg-slate-950/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="p-2 rounded-lg"
                  style={{
                    backgroundColor: `${activeColor}20`,
                    color: activeColor
                  }}
                >
                  <HelpCircle size={18} />
                </div>
                <div>
                  <h2 id="create-quiz-modal-title" className="text-sm font-bold tracking-wide flex items-center gap-2">
                    <span>MANUAL QUIZ BUILDER</span>
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: `${activeColor}15`,
                        color: activeColor,
                        border: `1px solid ${activeColor}40`
                      }}
                    >
                      {selectedNode ? selectedNode.name : 'Select Topic'}
                    </span>
                  </h2>
                  <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Create interactive practice quizzes and assessment banks for concept nodes
                  </p>
                </div>
              </div>

              {/* Mode Toggle & Close */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center rounded-lg border p-0.5 ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-slate-900'}`}>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('BUILDER')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                      mode === 'BUILDER'
                        ? isLight
                          ? 'bg-sky-50 text-sky-700 shadow-sm'
                          : 'bg-white/10 text-[#00f0ff]'
                        : isLight
                        ? 'text-slate-500 hover:text-slate-900'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers size={13} />
                    <span>Builder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('JSON')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                      mode === 'JSON'
                        ? isLight
                          ? 'bg-sky-50 text-sky-700 shadow-sm'
                          : 'bg-white/10 text-[#00f0ff]'
                        : isLight
                        ? 'text-slate-500 hover:text-slate-900'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Code size={13} />
                    <span>Raw JSON</span>
                  </button>
                </div>

                <button
                  type="button"
                  data-testid="close-create-quiz-modal"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className={`p-1.5 rounded-lg transition-all ${
                    isLight ? 'hover:bg-slate-100 text-slate-400 hover:text-slate-700' : 'hover:bg-white/10 text-slate-400 hover:text-white'
                  }`}
                  title="Close (Esc)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div
                data-testid="create-quiz-error-banner"
                className={`px-4 py-2 text-xs flex items-center gap-2 border-b ${
                  isLight ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-red-950/50 border-red-500/30 text-red-300'
                }`}
              >
                <AlertCircle size={14} className="flex-shrink-0" />
                <span className="flex-1 font-medium">{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="p-0.5 hover:opacity-75"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Concept Node & Title Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Target Concept */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    <span>Target Concept Node</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <select
                    data-testid="quiz-target-topic-select"
                    value={targetTopicId}
                    onChange={(e) => setTargetTopicId(e.target.value)}
                    required
                    className={`w-full text-xs font-medium px-3 py-2 rounded-lg border focus:outline-none transition-all cursor-pointer ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sky-500'
                        : 'bg-slate-950/80 border-white/10 text-slate-100 focus:border-[#00f0ff]/50'
                    }`}
                  >
                    {topicNodes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quiz Title */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    <span>Quiz Title</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    data-testid="quiz-title-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Scaled Dot-Product Attention Verification"
                    required
                    className={`w-full text-xs font-medium px-3 py-2 rounded-lg border focus:outline-none transition-all ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500'
                        : 'bg-slate-950/80 border-white/10 text-slate-100 placeholder-slate-500 focus:border-[#00f0ff]/50'
                    }`}
                  />
                </div>
              </div>

              {/* Quiz Description */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold tracking-wider uppercase ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  Quiz Description (Optional)
                </label>
                <input
                  type="text"
                  data-testid="quiz-description-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Tests understanding of query-key dimensions, softmax temperature, and masking."
                  className={`w-full text-xs font-medium px-3 py-2 rounded-lg border focus:outline-none transition-all ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500'
                      : 'bg-slate-950/80 border-white/10 text-slate-100 placeholder-slate-500 focus:border-[#00f0ff]/50'
                  }`}
                />
              </div>

              {/* Main Builder vs Raw JSON Area */}
              {mode === 'JSON' ? (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      <Code size={13} />
                      <span>Questions JSON Array</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const template: QuizQuestionItem[] = [
                          {
                            type: 'MCQ',
                            prompt: 'Sample MCQ Question prompt?',
                            options: { A: 'First option', B: 'Second option', C: 'Third', D: 'Fourth' },
                            correctAnswer: 'A',
                            explanation: 'Detailed explanation of why A is correct.',
                            difficulty: 'MEDIUM'
                          },
                          {
                            type: 'TRUE_FALSE',
                            prompt: 'A transformer encoder is bidirectional.',
                            correctAnswer: 'true',
                            explanation: 'BERT and other encoders attend to both past and future tokens.',
                            difficulty: 'EASY'
                          }
                        ];
                        setRawJson(JSON.stringify(template, null, 2));
                        setRawJsonError(null);
                      }}
                      className={`text-[11px] font-semibold underline ${isLight ? 'text-sky-600' : 'text-[#00f0ff]'}`}
                    >
                      Insert Sample JSON Template
                    </button>
                  </div>

                  <textarea
                    data-testid="quiz-raw-json-textarea"
                    rows={14}
                    value={rawJson}
                    onChange={(e) => {
                      setRawJson(e.target.value);
                      try {
                        JSON.parse(e.target.value);
                        setRawJsonError(null);
                      } catch (err: any) {
                        setRawJsonError(err.message);
                      }
                    }}
                    className={`w-full font-mono text-xs p-3 rounded-xl border focus:outline-none leading-relaxed transition-all ${
                      rawJsonError
                        ? 'border-rose-500 focus:border-rose-500'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-sky-500'
                        : 'bg-slate-950/90 border-white/10 text-emerald-400 focus:border-[#00f0ff]/50'
                    }`}
                  />

                  {rawJsonError && (
                    <div className="text-[11px] font-mono text-rose-500 flex items-center gap-1">
                      <AlertCircle size={12} />
                      <span>{rawJsonError}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Interactive Builder Mode */
                <div className="space-y-4 pt-2 border-t border-slate-200/40 dark:border-white/10">
                  {/* Question Tabs Header */}
                  <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {questions.map((q, idx) => {
                        const isActive = idx === activeQuestionIndex;
                        return (
                          <button
                            key={idx}
                            type="button"
                            data-testid={`question-tab-${idx}`}
                            onClick={() => setActiveQuestionIndex(idx)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer ${
                              isActive
                                ? isLight
                                  ? 'bg-sky-50 border-sky-400 text-sky-800 shadow-sm'
                                  : 'bg-white/15 border-[#00f0ff]/60 text-[#00f0ff]'
                                : isLight
                                ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                : 'bg-slate-950/60 border-white/10 text-slate-400 hover:bg-white/5'
                            }`}
                          >
                            <span>Q{idx + 1}</span>
                            <span className="text-[10px] font-mono opacity-70">({q.type})</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Add Question Button */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        data-testid="add-question-btn"
                        onClick={() => handleAddQuestion('MCQ')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border cursor-pointer ${
                          isLight
                            ? 'bg-slate-100 hover:bg-sky-50 hover:text-sky-700 border-slate-200'
                            : 'bg-slate-900 hover:bg-[#00f0ff]/15 hover:text-[#00f0ff] border-white/10'
                        }`}
                      >
                        <Plus size={13} />
                        <span>Add Question</span>
                      </button>
                    </div>
                  </div>

                  {/* Active Question Editor Card */}
                  {currentQ && (
                    <div
                      className={`p-4 rounded-xl border space-y-4 ${
                        isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-950/60 border-white/10'
                      }`}
                    >
                      {/* Question Metadata Controls: Type & Difficulty & Delete */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-white/10">
                        {/* Type Selector */}
                        <div className="flex items-center gap-2">
                          <label className={`text-xs font-bold uppercase ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                            Type:
                          </label>
                          <select
                            data-testid="question-type-select"
                            value={currentQ.type}
                            onChange={(e) => {
                              const newType = e.target.value as QuizQuestionType;
                              const replacement = createDefaultQuestion(newType);
                              updateCurrentQuestion({
                                ...replacement,
                                prompt: currentQ.prompt || currentQ.term || '',
                                difficulty: currentQ.difficulty || 'MEDIUM'
                              });
                            }}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-md border focus:outline-none cursor-pointer ${
                              isLight
                                ? 'bg-white border-slate-200 text-slate-800'
                                : 'bg-slate-900 border-white/10 text-slate-100'
                            }`}
                          >
                            {QUESTION_TYPES.map((t) => (
                              <option key={t.type} value={t.type}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Difficulty Selector */}
                        <div className="flex items-center gap-2">
                          <label className={`text-xs font-bold uppercase ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                            Difficulty:
                          </label>
                          <select
                            data-testid="question-difficulty-select"
                            value={currentQ.difficulty || 'MEDIUM'}
                            onChange={(e) =>
                              updateCurrentQuestion({
                                difficulty: e.target.value as QuizQuestionDifficulty
                              })
                            }
                            className={`text-xs font-semibold px-2.5 py-1 rounded-md border focus:outline-none cursor-pointer ${
                              isLight
                                ? 'bg-white border-slate-200 text-slate-800'
                                : 'bg-slate-900 border-white/10 text-slate-100'
                            }`}
                          >
                            {DIFFICULTIES.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Delete Question Button */}
                        <button
                          type="button"
                          data-testid="delete-question-btn"
                          onClick={() => handleRemoveQuestion(activeQuestionIndex)}
                          disabled={questions.length <= 1}
                          className={`p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            isLight
                              ? 'text-rose-600 hover:bg-rose-50'
                              : 'text-red-400 hover:bg-red-950/40'
                          }`}
                          title="Delete this question"
                        >
                          <Trash2 size={13} />
                          <span>Delete Question</span>
                        </button>
                      </div>

                      {/* Prompt / Term Input */}
                      <div className="space-y-1.5">
                        <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                          <span>{currentQ.type === 'FLASHCARD' ? 'Front: Term / Concept' : 'Question Prompt'}</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          data-testid="question-prompt-input"
                          value={currentQ.type === 'FLASHCARD' ? (currentQ.term || currentQ.prompt || '') : (currentQ.prompt || currentQ.statement || '')}
                          onChange={(e) => {
                            if (currentQ.type === 'FLASHCARD') {
                              updateCurrentQuestion({ term: e.target.value, prompt: e.target.value });
                            } else {
                              updateCurrentQuestion({ prompt: e.target.value, statement: e.target.value });
                            }
                          }}
                          placeholder={
                            currentQ.type === 'FLASHCARD'
                              ? 'e.g. Flash Attention Algorithm'
                              : currentQ.type === 'TRUE_FALSE'
                              ? 'e.g. Layer normalization is applied across features of each single token.'
                              : 'e.g. What is the computational complexity of standard self-attention regarding sequence length N?'
                          }
                          required
                          className={`w-full text-xs font-medium p-2.5 rounded-lg border focus:outline-none transition-all ${
                            isLight
                              ? 'bg-white border-slate-200 text-slate-900 focus:border-sky-500'
                              : 'bg-slate-900 border-white/10 text-slate-100 focus:border-[#00f0ff]/50'
                          }`}
                        />
                      </div>

                      {/* Type-Specific Fields */}
                      {/* 1. MCQ OPTIONS */}
                      {currentQ.type === 'MCQ' && (
                        <div className="space-y-2">
                          <label className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            Options (Select the correct answer):
                          </label>
                          <div className="space-y-2">
                            {['A', 'B', 'C', 'D'].map((key) => {
                              const opts = currentQ.options || {};
                              const isChecked = currentQ.correctAnswer === key;
                              return (
                                <div key={key} className="flex items-center gap-2">
                                  <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                                    <input
                                      type="radio"
                                      name={`correct-answer-${activeQuestionIndex}`}
                                      checked={isChecked}
                                      onChange={() => updateCurrentQuestion({ correctAnswer: key })}
                                      className="cursor-pointer"
                                    />
                                    <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded border border-slate-200/50">
                                      {key}
                                    </span>
                                  </label>
                                  <input
                                    type="text"
                                    data-testid={`option-input-${key}`}
                                    value={opts[key] ?? ''}
                                    onChange={(e) => {
                                      updateCurrentQuestion({
                                        options: {
                                          ...opts,
                                          [key]: e.target.value
                                        }
                                      });
                                    }}
                                    placeholder={`Option ${key} text...`}
                                    className={`flex-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border focus:outline-none transition-all ${
                                      isChecked
                                        ? isLight
                                          ? 'border-emerald-500 bg-emerald-50/30'
                                          : 'border-emerald-500 bg-emerald-950/20'
                                        : isLight
                                        ? 'bg-white border-slate-200 text-slate-900'
                                        : 'bg-slate-900 border-white/10 text-slate-100'
                                    }`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 2. TRUE / FALSE */}
                      {currentQ.type === 'TRUE_FALSE' && (
                        <div className="space-y-1.5">
                          <label className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            Correct Assertion:
                          </label>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                              <input
                                type="radio"
                                name={`tf-correct-${activeQuestionIndex}`}
                                checked={String(currentQ.correctAnswer).toLowerCase() === 'true'}
                                onChange={() => updateCurrentQuestion({ correctAnswer: 'true' })}
                              />
                              <span className="text-emerald-500 font-bold">TRUE</span>
                            </label>
                            <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                              <input
                                type="radio"
                                name={`tf-correct-${activeQuestionIndex}`}
                                checked={String(currentQ.correctAnswer).toLowerCase() === 'false'}
                                onChange={() => updateCurrentQuestion({ correctAnswer: 'false' })}
                              />
                              <span className="text-rose-500 font-bold">FALSE</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* 3. FLASHCARD */}
                      {currentQ.type === 'FLASHCARD' && (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                              Back: Definition / Core Answer
                            </label>
                            <textarea
                              rows={2}
                              data-testid="flashcard-definition-input"
                              value={currentQ.definition || currentQ.explanation || ''}
                              onChange={(e) =>
                                updateCurrentQuestion({
                                  definition: e.target.value,
                                  explanation: e.target.value
                                })
                              }
                              placeholder="Key explanation to recall when reviewing this flashcard..."
                              className={`w-full text-xs font-medium p-2.5 rounded-lg border focus:outline-none transition-all ${
                                isLight
                                  ? 'bg-white border-slate-200 text-slate-900 focus:border-sky-500'
                                  : 'bg-slate-900 border-white/10 text-slate-100 focus:border-[#00f0ff]/50'
                              }`}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                              Memorization Rationale / Why Remember This?
                            </label>
                            <input
                              type="text"
                              value={currentQ.memorizationReason || ''}
                              onChange={(e) => updateCurrentQuestion({ memorizationReason: e.target.value })}
                              placeholder="e.g. Critical for optimizing IO-aware GPU kernel memory bandwidth."
                              className={`w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'
                              }`}
                            />
                          </div>
                        </div>
                      )}

                      {/* 4. ORDERING */}
                      {currentQ.type === 'ORDERING' && (
                        <div className="space-y-2">
                          <label className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            Sequence Steps (In Correct Chronological Order):
                          </label>
                          <div className="space-y-1.5">
                            {(currentQ.sequence || []).map((step, sIdx) => (
                              <div key={sIdx} className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-400 w-6 text-right">
                                  {sIdx + 1}.
                                </span>
                                <input
                                  type="text"
                                  value={step}
                                  onChange={(e) => {
                                    const nextSeq = [...(currentQ.sequence || [])];
                                    nextSeq[sIdx] = e.target.value;
                                    updateCurrentQuestion({ sequence: nextSeq });
                                  }}
                                  placeholder={`Step ${sIdx + 1}...`}
                                  className={`flex-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                                    isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextSeq = (currentQ.sequence || []).filter((_, idx) => idx !== sIdx);
                                    updateCurrentQuestion({ sequence: nextSeq });
                                  }}
                                  className="p-1 text-rose-500 hover:opacity-80"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                updateCurrentQuestion({
                                  sequence: [...(currentQ.sequence || []), '']
                                });
                              }}
                              className={`text-xs font-semibold flex items-center gap-1 mt-1 ${isLight ? 'text-sky-600' : 'text-[#00f0ff]'}`}
                            >
                              <Plus size={12} /> Add Step
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 5. MATCHING */}
                      {currentQ.type === 'MATCHING' && (
                        <div className="space-y-2">
                          <label className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            Matching Pairs (Term ➔ Definition):
                          </label>
                          <div className="space-y-1.5">
                            {(currentQ.pairs || []).map((pair, pIdx) => (
                              <div key={pIdx} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                                <input
                                  type="text"
                                  value={pair.term}
                                  onChange={(e) => {
                                    const nextPairs = [...(currentQ.pairs || [])];
                                    nextPairs[pIdx] = { ...pair, term: e.target.value };
                                    updateCurrentQuestion({ pairs: nextPairs });
                                  }}
                                  placeholder="Term / Concept..."
                                  className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                                    isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'
                                  }`}
                                />
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={pair.definition}
                                    onChange={(e) => {
                                      const nextPairs = [...(currentQ.pairs || [])];
                                      nextPairs[pIdx] = { ...pair, definition: e.target.value };
                                      updateCurrentQuestion({ pairs: nextPairs });
                                    }}
                                    placeholder="Matching definition..."
                                    className={`flex-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                                      isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextPairs = (currentQ.pairs || []).filter((_, idx) => idx !== pIdx);
                                      updateCurrentQuestion({ pairs: nextPairs });
                                    }}
                                    className="p-1 text-rose-500 hover:opacity-80"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                updateCurrentQuestion({
                                  pairs: [...(currentQ.pairs || []), { term: '', definition: '' }]
                                });
                              }}
                              className={`text-xs font-semibold flex items-center gap-1 mt-1 ${isLight ? 'text-sky-600' : 'text-[#00f0ff]'}`}
                            >
                              <Plus size={12} /> Add Pair
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Explanation Input (for all types except flashcard where definition serves as explanation) */}
                      {currentQ.type !== 'FLASHCARD' && (
                        <div className="space-y-1.5 pt-1">
                          <label className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            Detailed Explanation (Shown after answering)
                          </label>
                          <textarea
                            rows={2}
                            data-testid="question-explanation-input"
                            value={currentQ.explanation || ''}
                            onChange={(e) => updateCurrentQuestion({ explanation: e.target.value })}
                            placeholder="Explain why the answer is correct and cite key trade-offs..."
                            className={`w-full text-xs font-medium p-2.5 rounded-lg border focus:outline-none transition-all ${
                              isLight
                                ? 'bg-white border-slate-200 text-slate-900 focus:border-sky-500'
                                : 'bg-slate-900 border-white/10 text-slate-100 focus:border-[#00f0ff]/50'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Footer Controls */}
              <div
                className={`pt-4 border-t flex items-center justify-between gap-3 ${
                  isLight ? 'border-slate-200' : 'border-white/10'
                }`}
              >
                <div className={`text-xs font-mono font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {questions.length} Question{questions.length > 1 ? 's' : ''} Ready
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="cancel-quiz-btn"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                        : 'bg-slate-900 hover:bg-slate-800 border-white/10 text-slate-300'
                    }`}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    data-testid="save-quiz-btn"
                    disabled={isSubmitting || !title.trim()}
                    style={{
                      backgroundColor: isLight ? activeColor : undefined,
                      borderColor: activeColor
                    }}
                    className={`px-5 py-2 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md ${
                      !isLight ? 'bg-[#00f0ff]/20 text-[#00f0ff] hover:bg-[#00f0ff]/30 border' : 'hover:opacity-95'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Saving Quiz...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Save & Attach Quiz</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
