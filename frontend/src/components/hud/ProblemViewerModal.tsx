import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Code,
  Clock,
  Building,
  Sparkles,
  HelpCircle,
  Compass,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  BookOpen,
  Award,
  Layers,
  Terminal,
  ShieldAlert,
  Edit3,
  Save,
  PenLine,
  Eye,
  Plus,
  Trash2,
  Check,
  Copy,
  Loader2,
  RotateCcw,
  Play,
  Columns,
  Maximize2,
  Trophy,
  AlertOctagon,
  XCircle,
  History,
  Bot,
  Layout,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useStore } from '../../store/useStore';
import { getCategoryShade, getDomainBaseColor } from '../../utils/theme';
import { MarkdownContent } from './MarkdownContent';
import GuidedPracticePanel from './GuidedPracticePanel';
import { QuizViewer } from './QuizViewer';
import { ExcalidrawCanvas } from './ExcalidrawCanvas';
import {
  ProblemDifficulty,
  ProblemType,
  TopicNode,
  ProblemItem,
  DomainCategory,
  ProblemSubmission,
  SystemDesignGradingResult
} from '../../types/telemetry';
import {
  runCode,
  runSubmissionSuite,
  TestCaseItem,
  ExecutionResult,
  formatValue,
  parseValue
} from '../../utils/codeRunner';

export interface SupportedLanguageConfig {
  id: string;
  label: string;
  monacoLang: string;
  prismLang: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguageConfig[] = [
  { id: 'python', label: 'Python', monacoLang: 'python', prismLang: 'python' },
  { id: 'typescript', label: 'TypeScript', monacoLang: 'typescript', prismLang: 'typescript' },
  { id: 'java', label: 'Java', monacoLang: 'java', prismLang: 'java' },
  { id: 'cpp', label: 'C++', monacoLang: 'cpp', prismLang: 'cpp' },
  { id: 'go', label: 'Go', monacoLang: 'go', prismLang: 'go' },
  { id: 'rust', label: 'Rust', monacoLang: 'rust', prismLang: 'rust' },
  { id: 'sql', label: 'SQL', monacoLang: 'sql', prismLang: 'sql' },
  { id: 'protobuf', label: 'Protobuf', monacoLang: 'protobuf', prismLang: 'protobuf' }
];

export const DEFAULT_STARTER_CODES: Record<string, string> = {
  python: `# Write your Python solution below\nclass Solution:\n    def solve(self):\n        pass\n`,
  typescript: `// Write your TypeScript solution below\nexport function solve(): void {\n    \n}\n`,
  java: `// Write your Java solution below\nclass Solution {\n    public void solve() {\n        \n    }\n}\n`,
  cpp: `// Write your C++ solution below\n#include <iostream>\n#include <vector>\n\nclass Solution {\npublic:\n    void solve() {\n        \n    }\n};\n`,
  go: `// Write your Go solution below\npackage main\n\nimport "fmt"\n\nfunc Solve() {\n    fmt.Println("Solution stub")\n}\n`,
  rust: `// Write your Rust solution below\npub struct Solution;\n\nimpl Solution {\n    pub fn solve() {\n        \n    }\n}\n`,
  sql: `-- Write your SQL query below\nSELECT \n    id,\n    name,\n    created_at\nFROM records\nWHERE status = 'ACTIVE'\nORDER BY id ASC;\n`,
  protobuf: `syntax = "proto3";\n\npackage problem.solution;\n\nservice SolutionService {\n    rpc Execute(SolutionRequest) returns (SolutionResponse);\n}\n\nmessage SolutionRequest {\n    string id = 1;\n    bytes payload = 2;\n}\n\nmessage SolutionResponse {\n    bool success = 1;\n    string message = 2;\n}\n`
};

export const PROTOBUF_MONARCH = {
  defaultToken: '',
  tokenPostfix: '.proto',

  keywords: [
    'syntax', 'import', 'weak', 'public', 'package', 'option',
    'message', 'enum', 'service', 'rpc', 'returns', 'extend',
    'extensions', 'to', 'max', 'reserved', 'repeated', 'optional',
    'required', 'oneof', 'map', 'stream'
  ],

  typeKeywords: [
    'double', 'float', 'int32', 'int64', 'uint32', 'uint64', 'sint32', 'sint64',
    'fixed32', 'fixed64', 'sfixed32', 'sfixed64', 'bool', 'string', 'bytes',
    'true', 'false'
  ],

  operators: ['=', ';', '{', '}', '(', ')', '<', '>', '[', ']', ':', ','],

  tokenizer: {
    root: [
      [/[a-zA-Z_$][\w$]*/, {
        cases: {
          '@keywords': 'keyword',
          '@typeKeywords': 'type',
          '@default': 'identifier'
        }
      }],
      { include: '@whitespace' },
      [/[{}()\[\]]/, '@brackets'],
      [/[=;:,]/, 'delimiter'],
      [/\d+/, 'number'],
      [/"([^"\\]|\\.)*"/, 'string'],
      [/'([^'\\]|\\.)*'/, 'string']
    ],

    whitespace: [
      [/[ \t\r\n]+/, 'white'],
      [/\/\*/, 'comment', '@comment'],
      [/\/\/.*$/, 'comment']
    ],

    comment: [
      [/[^\/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[\/*]/, 'comment']
    ]
  }
};

export default function ProblemViewerModal() {
  const theme = useStore((state) => state.theme);
  const isLight = theme === 'light';

  const activeProblem = useStore((state) => state.activeProblem);
  const setActiveProblem = useStore((state) => state.setActiveProblem);
  const updateProblem = useStore((state) => state.updateProblem);
  const topicNodes = useStore((state) => state.topicNodes);
  const setSelectedTopicId = useStore((state) => state.setSelectedTopicId);
  const setActiveNote = useStore((state) => state.setActiveNote);
  const setIsInspectorOpen = useStore((state) => state.setIsInspectorOpen);
  const submitProblem = useStore((state) => state.submitProblem);
  const fetchProblemSubmissions = useStore((state) => state.fetchProblemSubmissions);
  const problemSubmissions = useStore((state) => state.problemSubmissions);
  const submissions = activeProblem ? problemSubmissions[activeProblem.id] || [] : [];

  // Stage 5 & 6 System Design Follow-Ups & Excalidraw AI Grader
  const fetchFollowUpResponses = useStore((state) => state.fetchFollowUpResponses);
  const saveFollowUpResponse = useStore((state) => state.saveFollowUpResponse);
  const gradeFollowUpResponse = useStore((state) => state.gradeFollowUpResponse);
  const isSavingFollowUp = useStore((state) => state.isSavingFollowUp);
  const isGradingFollowUp = useStore((state) => state.isGradingFollowUp);
  const followUpResponsesMap = useStore((state) => state.followUpResponses);
  const followUpResponses = activeProblem ? followUpResponsesMap[activeProblem.id] || [] : [];
  const followUps = activeProblem?.followUps || [];

  const [activeTab, setActiveTab] = useState<'PROMPT' | 'GUIDED' | 'SOLUTION' | 'QUIZ' | 'SUBMISSIONS' | 'SYSTEM_DESIGN'>('PROMPT');
  const [guidedAttemptStarted, setGuidedAttemptStarted] = useState(false);
  const hasGuidedPractice = activeProblem?.guidedLearningPathAvailable === true || activeProblem?.id === 'PROB-TRAPPING-RAIN-WATER';
  const [selectedFollowUpIndex, setSelectedFollowUpIndex] = useState<number>(0);
  const [followUpResponseText, setFollowUpResponseText] = useState<string>('');
  const [followUpDiagramData, setFollowUpDiagramData] = useState<any>(null);
  const [followUpWorkbenchMode, setFollowUpWorkbenchMode] = useState<'SPLIT' | 'DIAGRAM' | 'WRITTEN'>('SPLIT');
  const [gradingEvaluation, setGradingEvaluation] = useState<SystemDesignGradingResult | null>(null);
  const [revealedFollowUpHints, setRevealedFollowUpHints] = useState<number[]>([]);
  const [showSampleArchitecture, setShowSampleArchitecture] = useState<boolean>(false);
  const [followUpSavedSuccess, setFollowUpSavedSuccess] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<ProblemSubmission | null>(null);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState<boolean>(false);
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [copiedStarter, setCopiedStarter] = useState(false);
  const [userCodeByLang, setUserCodeByLang] = useState<Record<string, string>>({});
  const [editorFontSize, setEditorFontSize] = useState<number>(13);
  const [workbenchLayout, setWorkbenchLayout] = useState<'split' | 'full'>('split');
  const [copiedEditorCode, setCopiedEditorCode] = useState<boolean>(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGuidedAttemptStarted(false);
    setActiveTab(hasGuidedPractice ? 'GUIDED' : 'PROMPT');
  }, [activeProblem?.id, hasGuidedPractice]);

  const openSolutionTab = () => {
    if (hasGuidedPractice && !guidedAttemptStarted) {
      setActiveTab('GUIDED');
      return;
    }
    setActiveTab('SOLUTION');
  };

  // Step 3 Testcase Console & In-Browser Execution State
  const [currentTestCases, setCurrentTestCases] = useState<TestCaseItem[]>([]);
  const [selectedCaseIndex, setSelectedCaseIndex] = useState<number>(0);
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(true);
  const [consoleTab, setConsoleTab] = useState<'testcases' | 'output'>('testcases');
  const [isRunningCode, setIsRunningCode] = useState<boolean>(false);
  const [lastRunResult, setLastRunResult] = useState<ExecutionResult | null>(null);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editTabMode, setEditTabMode] = useState<'WRITE' | 'PREVIEW'>('WRITE');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable fields
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState<ProblemType>('CODING');
  const [editDifficulty, setEditDifficulty] = useState<ProblemDifficulty>('MEDIUM');
  const [editDomain, setEditDomain] = useState<DomainCategory>('CS');
  const [editTimeLimit, setEditTimeLimit] = useState(45);
  const [editCompanies, setEditCompanies] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editSolution, setEditSolution] = useState('');
  const [editHints, setEditHints] = useState<string[]>([]);
  const [editStarterCode, setEditStarterCode] = useState<Record<string, string>>({});
  const [editStarterLang, setEditStarterLang] = useState<string>('python');
  const [newLangName, setNewLangName] = useState('');
  const [isAddingLang, setIsAddingLang] = useState(false);

  // Synchronize edit fields when activeProblem changes
  const syncEditStateFromProblem = (prob: ProblemItem) => {
    setEditTitle(prob.title || '');
    setEditType(prob.type || 'CODING');
    setEditDifficulty(prob.difficulty || 'MEDIUM');
    setEditDomain(prob.domain || 'CS');
    setEditTimeLimit(prob.timeLimitMinutes || 45);
    setEditCompanies((prob.targetCompanies || []).join(', '));
    setEditSummary(prob.summary || '');
    setEditPrompt(prob.prompt || '');
    setEditSolution(prob.solution || '');
    setEditHints([...(prob.hints || [])]);
    const starter = { ...(prob.starterCode || {}) };
    setEditStarterCode(starter);
    const langs = Object.keys(starter);
    setEditStarterLang(langs.length > 0 ? langs[0] : 'python');
    setEditTabMode('WRITE');
  };

  useEffect(() => {
    if (activeProblem) {
      syncEditStateFromProblem(activeProblem);
      setIsEditing(false);
      if (activeProblem.starterCode) {
        setUserCodeByLang(activeProblem.starterCode);
        const langs = Object.keys(activeProblem.starterCode);
        if (langs.length > 0 && !langs.includes(selectedLanguage)) {
          setSelectedLanguage(langs[0]);
        }
      } else {
        setUserCodeByLang({ ...DEFAULT_STARTER_CODES });
      }

      // Initialize test cases
      if (activeProblem.testCases && activeProblem.testCases.length > 0) {
        setCurrentTestCases(
          activeProblem.testCases.map((tc, idx) => ({
            id: `case-${idx}`,
            input: tc.input,
            expected: tc.expected,
            explanation: tc.explanation,
            isCustom: false
          }))
        );
      } else {
        setCurrentTestCases([
          {
            id: 'case-0',
            input: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1],
            expected: 6,
            explanation: 'Sample test case',
            isCustom: false
          }
        ]);
      }
      setSelectedCaseIndex(0);
      setLastRunResult(null);
      setConsoleTab('testcases');
      if (activeProblem.id) {
        fetchProblemSubmissions(activeProblem.id);
      }
    }
  }, [activeProblem?.id]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [activeTab, activeProblem?.id]);

  const activeFollowUp = followUps[selectedFollowUpIndex] || null;

  useEffect(() => {
    if (activeProblem?.id) {
      fetchFollowUpResponses(activeProblem.id);
    }
    setSelectedFollowUpIndex(0);
    setRevealedFollowUpHints([]);
    setShowSampleArchitecture(false);
  }, [activeProblem?.id]);

  useEffect(() => {
    if (activeFollowUp && activeProblem?.id) {
      const existing = followUpResponses.find((r) => r.followUpId === activeFollowUp.id);
      setFollowUpResponseText(existing?.responseText || '');
      setFollowUpDiagramData(existing?.diagramData || null);
      if (existing?.feedback) {
        try {
          const parsed = typeof existing.feedback === 'string' ? JSON.parse(existing.feedback) : existing.feedback;
          if (parsed && typeof parsed.score === 'number') {
            setGradingEvaluation(parsed);
          } else {
            setGradingEvaluation(null);
          }
        } catch {
          setGradingEvaluation(null);
        }
      } else {
        setGradingEvaluation(null);
      }
      setRevealedFollowUpHints([]);
      setShowSampleArchitecture(false);
      setFollowUpSavedSuccess(false);
    } else {
      setFollowUpResponseText('');
      setFollowUpDiagramData(null);
      setGradingEvaluation(null);
    }
  }, [selectedFollowUpIndex, activeProblem?.id, followUpResponses.length]);

  const handleSaveFollowUpResponse = async () => {
    if (!activeProblem?.id || !activeFollowUp) return;
    try {
      const payload: any = { responseText: followUpResponseText };
      if (followUpDiagramData) {
        payload.diagramData = followUpDiagramData;
      }
      await saveFollowUpResponse(activeProblem.id, activeFollowUp.id, payload);
      setFollowUpSavedSuccess(true);
      setTimeout(() => setFollowUpSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save follow-up response', err);
    }
  };

  const handleGradeArchitecture = async () => {
    if (!activeProblem?.id || !activeFollowUp) return;
    try {
      const result = await gradeFollowUpResponse(activeProblem.id, activeFollowUp.id, {
        responseText: followUpResponseText,
        diagramData: followUpDiagramData
      });
      if (result && result.evaluation) {
        setGradingEvaluation(result.evaluation);
      }
    } catch (err) {
      console.error('Failed to grade architecture follow-up', err);
    }
  };

  const handleStartEdit = () => {
    if (activeProblem) {
      syncEditStateFromProblem(activeProblem);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    if (activeProblem) {
      syncEditStateFromProblem(activeProblem);
    }
    setIsEditing(false);
  };

  const handleSaveProblem = async () => {
    if (!activeProblem) return;
    setIsSaving(true);
    try {
      const companies = editCompanies
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await updateProblem(activeProblem.id, {
        title: editTitle.trim() || activeProblem.title,
        type: editType,
        difficulty: editDifficulty,
        domain: editDomain,
        timeLimitMinutes: editTimeLimit,
        targetCompanies: companies,
        summary: editSummary.trim(),
        prompt: editPrompt,
        solution: editSolution,
        hints: editHints.map((h) => h.trim()).filter(Boolean),
        starterCode: editStarterCode
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save problem:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddHint = () => {
    setEditHints([...editHints, '']);
  };

  const handleUpdateHint = (index: number, val: string) => {
    const updated = [...editHints];
    updated[index] = val;
    setEditHints(updated);
  };

  const handleDeleteHint = (index: number) => {
    setEditHints(editHints.filter((_, i) => i !== index));
  };

  const handleUpdateStarterCode = (lang: string, code: string) => {
    setEditStarterCode({
      ...editStarterCode,
      [lang]: code
    });
  };

  const handleAddStarterLang = () => {
    const clean = newLangName.trim().toLowerCase();
    if (!clean) return;
    if (editStarterCode[clean] === undefined) {
      setEditStarterCode({
        ...editStarterCode,
        [clean]: ''
      });
    }
    setEditStarterLang(clean);
    setNewLangName('');
    setIsAddingLang(false);
  };

  const handleDeleteStarterLang = (lang: string) => {
    const updated = { ...editStarterCode };
    delete updated[lang];
    setEditStarterCode(updated);
    const remaining = Object.keys(updated);
    setEditStarterLang(remaining.length > 0 ? remaining[0] : 'python');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          handleCancelEdit();
        } else {
          setActiveProblem(null);
        }
      }
    };
    if (activeProblem) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeProblem, isEditing]);

  if (!activeProblem) return null;

  const difficultyColors: Record<ProblemDifficulty, { bg: string; text: string; border: string }> = {
    EASY: {
      bg: isLight ? 'bg-emerald-50' : 'bg-emerald-950/40',
      text: isLight ? 'text-emerald-700' : 'text-emerald-400',
      border: isLight ? 'border-emerald-200' : 'border-emerald-500/40'
    },
    MEDIUM: {
      bg: isLight ? 'bg-amber-50' : 'bg-amber-950/40',
      text: isLight ? 'text-amber-700' : 'text-amber-400',
      border: isLight ? 'border-amber-200' : 'border-amber-500/40'
    },
    HARD: {
      bg: isLight ? 'bg-rose-50' : 'bg-rose-950/40',
      text: isLight ? 'text-rose-700' : 'text-rose-400',
      border: isLight ? 'border-rose-200' : 'border-rose-500/40'
    }
  };

  const typeLabels: Record<ProblemType, string> = {
    CODING: 'CODING CHALLENGE',
    SYSTEM_DESIGN: 'SYSTEM DESIGN ARCHITECTURE',
    ML_SYSTEM_DESIGN: 'ML SYSTEM DESIGN',
    OBJECT_ORIENTED_DESIGN: 'OBJECT-ORIENTED DESIGN'
  };

  // Resolve full topic objects for linked prerequisites
  const linkedPrereqs: TopicNode[] =
    activeProblem.prerequisiteTopics && activeProblem.prerequisiteTopics.length > 0
      ? activeProblem.prerequisiteTopics
      : (activeProblem.prerequisiteTopicIds || [])
          .map((id) => topicNodes.find((n) => n.id === id))
          .filter(Boolean) as TopicNode[];

  const handlePrerequisiteClick = (topic: TopicNode) => {
    setSelectedTopicId(topic.id);
    setIsInspectorOpen(true);
    if (topic.notes && topic.notes.length > 0) {
      setActiveNote(topic.notes[0]);
    }
    setActiveProblem(null);
  };

  const toggleHint = (index: number) => {
    if (revealedHints.includes(index)) {
      setRevealedHints(revealedHints.filter((i) => i !== index));
    } else {
      setRevealedHints([...revealedHints, index]);
    }
  };

  const starterCodeLanguages = Array.from(
    new Set([
      ...SUPPORTED_LANGUAGES.map((l) => l.id),
      ...Object.keys(activeProblem.starterCode || {})
    ])
  );

  const activeStarterCode: string =
    activeProblem.starterCode?.[selectedLanguage] ||
    DEFAULT_STARTER_CODES[selectedLanguage] ||
    (starterCodeLanguages.length > 0 ? activeProblem.starterCode?.[starterCodeLanguages[0]] || '' : '');

  const handleCopyStarter = () => {
    if (activeStarterCode) {
      navigator.clipboard.writeText(activeStarterCode);
      setCopiedStarter(true);
      setTimeout(() => setCopiedStarter(false), 2000);
    }
  };

  const currentLanguageConfig =
    SUPPORTED_LANGUAGES.find((l) => l.id === selectedLanguage) ||
    SUPPORTED_LANGUAGES[0];

  const currentEditorCode: string =
    userCodeByLang[selectedLanguage] ??
    activeProblem.starterCode?.[selectedLanguage] ??
    DEFAULT_STARTER_CODES[selectedLanguage] ??
    '';

  const handleEditorChange = (newCode: string | undefined) => {
    const val = newCode ?? '';
    setUserCodeByLang((prev) => ({
      ...prev,
      [selectedLanguage]: val
    }));
  };

  const handleResetCode = () => {
    const originalStarter =
      activeProblem.starterCode?.[selectedLanguage] ??
      DEFAULT_STARTER_CODES[selectedLanguage] ??
      '';
    setUserCodeByLang((prev) => ({
      ...prev,
      [selectedLanguage]: originalStarter
    }));
  };

  const handleCopyEditorCode = () => {
    if (currentEditorCode) {
      navigator.clipboard.writeText(currentEditorCode);
      setCopiedEditorCode(true);
      setTimeout(() => setCopiedEditorCode(false), 2000);
    }
  };

  const handleRunCode = async () => {
    if (isRunningCode) return;
    const activeCase = currentTestCases[selectedCaseIndex] || currentTestCases[0];
    if (!activeCase) return;

    setIsRunningCode(true);
    setConsoleTab('output');
    if (!isConsoleOpen) setIsConsoleOpen(true);

    try {
      const res = await runCode(selectedLanguage, currentEditorCode, activeCase, selectedCaseIndex);
      setLastRunResult(res);
    } catch (err: any) {
      setLastRunResult({
        status: 'error',
        testCaseId: activeCase.id,
        testCaseIndex: selectedCaseIndex,
        input: activeCase.input,
        expected: activeCase.expected,
        actual: null,
        stdout: '',
        runtimeMs: 0,
        error: err.message || String(err)
      });
    } finally {
      setIsRunningCode(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!activeProblem || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const batchResult = await runSubmissionSuite(selectedLanguage, currentEditorCode, currentTestCases);
      const submission = await submitProblem(activeProblem.id, {
        language: selectedLanguage,
        code: currentEditorCode,
        status: batchResult.status,
        passedCount: batchResult.passedCount,
        totalCount: batchResult.totalCount,
        runtimeMs: batchResult.runtimeMs,
        memoryKb: batchResult.memoryKb,
        failedTestCase: batchResult.failedTestCase,
        stdout: batchResult.stdout
      });

      if (submission) {
        setSubmissionResult(submission);
        setIsSubmissionModalOpen(true);
      }
    } catch (err: any) {
      console.error('[SUBMIT_SOLUTION_ERROR]:', err);
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleAddTestCase = () => {
    const newCase: TestCaseItem = {
      id: `custom-${Date.now()}`,
      input: '',
      expected: '',
      explanation: 'Custom test case',
      isCustom: true
    };
    const updated = [...currentTestCases, newCase];
    setCurrentTestCases(updated);
    setSelectedCaseIndex(updated.length - 1);
    setConsoleTab('testcases');
    if (!isConsoleOpen) setIsConsoleOpen(true);
  };

  const handleDeleteTestCase = (indexToDelete: number) => {
    const updated = currentTestCases.filter((_, idx) => idx !== indexToDelete);
    setCurrentTestCases(updated);
    if (selectedCaseIndex >= updated.length) {
      setSelectedCaseIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleUpdateTestCaseInput = (index: number, val: string) => {
    const updated = [...currentTestCases];
    if (updated[index]) {
      updated[index] = {
        ...updated[index],
        input: parseValue(val),
        rawInput: val
      };
      setCurrentTestCases(updated);
    }
  };

  const handleUpdateTestCaseExpected = (index: number, val: string) => {
    const updated = [...currentTestCases];
    if (updated[index]) {
      updated[index] = {
        ...updated[index],
        expected: parseValue(val),
        rawExpected: val
      };
      setCurrentTestCases(updated);
    }
  };

  const handleEditorBeforeMount = (monaco: any) => {
    if (!monaco?.languages) return;
    const existing = monaco.languages.getLanguages();
    if (!existing.some((l: any) => l.id === 'protobuf')) {
      monaco.languages.register({ id: 'protobuf' });
      monaco.languages.setMonarchTokensProvider('protobuf', PROTOBUF_MONARCH);
    }
  };

  const editorLineCount = currentEditorCode.split('\n').length;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md pointer-events-auto"
        data-testid="problem-viewer-modal-backdrop"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className={`w-full ${
            workbenchLayout === 'split' && activeTab === 'PROMPT' && !isEditing
              ? 'max-w-[96vw] xl:max-w-7xl h-[92vh] max-h-[92vh]'
              : 'max-w-5xl max-h-[90vh]'
          } flex flex-col rounded-xl border shadow-2xl overflow-hidden transition-all duration-200 ${
            isLight
              ? 'bg-white/95 border-slate-200 text-slate-800'
              : 'bg-[#0a0f1d]/95 border-slate-700/80 text-slate-100 shadow-[0_0_30px_rgba(0,240,255,0.15)]'
          }`}
          data-testid="problem-viewer-modal"
        >
          {/* TOP BAR / HEADER */}
          <div
            className={`px-6 py-4 border-b flex items-start justify-between gap-4 ${
              isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <div className="flex-1 min-w-0">
              {isEditing ? (
                /* EDIT MODE HEADER FORM */
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                      EDITING PROBLEM
                    </span>
                    <span className="text-xs text-slate-400 font-mono">ID: {activeProblem.id}</span>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      data-testid="problem-edit-title-input"
                      placeholder="Problem Title"
                      className={`w-full px-3 py-1.5 rounded-lg text-lg font-bold border focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                      }`}
                    />
                  </div>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">
                        Type
                      </label>
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value as ProblemType)}
                        data-testid="problem-edit-type-select"
                        className={`w-full px-2 py-1.5 rounded border font-mono text-xs ${
                          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-200'
                        }`}
                      >
                        <option value="CODING">CODING</option>
                        <option value="SYSTEM_DESIGN">SYSTEM DESIGN</option>
                        <option value="ML_SYSTEM_DESIGN">ML SYSTEM DESIGN</option>
                        <option value="OBJECT_ORIENTED_DESIGN">OO DESIGN</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">
                        Difficulty
                      </label>
                      <select
                        value={editDifficulty}
                        onChange={(e) => setEditDifficulty(e.target.value as ProblemDifficulty)}
                        data-testid="problem-edit-difficulty-select"
                        className={`w-full px-2 py-1.5 rounded border font-mono text-xs ${
                          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-200'
                        }`}
                      >
                        <option value="EASY">EASY</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HARD">HARD</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">
                        Domain
                      </label>
                      <select
                        value={editDomain}
                        onChange={(e) => setEditDomain(e.target.value as DomainCategory)}
                        data-testid="problem-edit-domain-select"
                        className={`w-full px-2 py-1.5 rounded border font-mono text-xs ${
                          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-200'
                        }`}
                      >
                        <option value="CS">CS</option>
                        <option value="AI & ML">AI & ML</option>
                        <option value="SYSTEMS">SYSTEMS</option>
                        <option value="CYBERSECURITY">CYBERSECURITY</option>
                        <option value="DATA_ENGINEERING">DATA ENG</option>
                        <option value="NETWORKING">NETWORKING</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">
                        Time Limit (min)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={180}
                        value={editTimeLimit}
                        onChange={(e) => setEditTimeLimit(Number(e.target.value))}
                        data-testid="problem-edit-timelimit-input"
                        className={`w-full px-2 py-1.5 rounded border font-mono text-xs ${
                          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-200'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Target Companies */}
                  <div>
                    <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">
                      Target Companies (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={editCompanies}
                      onChange={(e) => setEditCompanies(e.target.value)}
                      data-testid="problem-edit-companies-input"
                      placeholder="e.g. Google, Meta, Amazon, Stripe"
                      className={`w-full px-3 py-1.5 rounded text-xs border ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-200'
                      }`}
                    />
                  </div>

                  {/* Summary */}
                  <div>
                    <label className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">
                      Summary
                    </label>
                    <textarea
                      rows={2}
                      value={editSummary}
                      onChange={(e) => setEditSummary(e.target.value)}
                      data-testid="problem-edit-summary-textarea"
                      placeholder="Brief 1-2 sentence problem summary..."
                      className={`w-full px-3 py-1.5 rounded-lg text-xs border ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-slate-200'
                      }`}
                    />
                  </div>
                </div>
              ) : (
                /* VIEW MODE HEADER */
                <>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {/* Problem Type Badge */}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider font-bold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/30">
                      {typeLabels[activeProblem.type] || activeProblem.type}
                    </span>

                    {/* Difficulty Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                        difficultyColors[activeProblem.difficulty]?.bg
                      } ${difficultyColors[activeProblem.difficulty]?.text} ${
                        difficultyColors[activeProblem.difficulty]?.border
                      }`}
                    >
                      {activeProblem.difficulty}
                    </span>

                    {/* Domain Category Badge */}
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border"
                      style={{
                        borderColor: `${getDomainBaseColor(activeProblem.domain, isLight ? 'light' : 'dark')}50`,
                        color: getDomainBaseColor(activeProblem.domain, isLight ? 'light' : 'dark'),
                        backgroundColor: `${getDomainBaseColor(activeProblem.domain, isLight ? 'light' : 'dark')}15`
                      }}
                    >
                      {activeProblem.domain}
                    </span>

                    {/* Time Limit */}
                    <span
                      className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded ${
                        isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Clock size={11} /> {activeProblem.timeLimitMinutes} min limit
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold tracking-tight leading-snug truncate">
                    {activeProblem.title}
                  </h2>

                  {/* Target Companies */}
                  {activeProblem.targetCompanies && activeProblem.targetCompanies.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs text-slate-400">
                      <Building size={12} className="text-slate-400" />
                      <span className="text-[11px] font-medium mr-1">Frequently asked at:</span>
                      {activeProblem.targetCompanies.map((company) => (
                        <span
                          key={company}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            isLight
                              ? 'bg-slate-100 text-slate-700 border border-slate-300'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {company}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* HEADER ACTIONS (EDIT / CANCEL / SAVE / CLOSE) */}
            <div className="flex items-center gap-2 shrink-0">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    data-testid="problem-cancel-edit-btn"
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                      isLight
                        ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProblem}
                    disabled={isSaving}
                    data-testid="problem-save-btn"
                    className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md transition-all disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartEdit}
                  data-testid="problem-edit-btn"
                  title="Edit problem content"
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-cyan-400'
                  }`}
                >
                  <Edit3 size={13} />
                  <span>Edit</span>
                </button>
              )}

              {/* Layout Toggle (Split Workbench vs Full Prompt) */}
              {!isEditing && activeTab === 'PROMPT' && (
                <button
                  onClick={() => setWorkbenchLayout((prev) => (prev === 'split' ? 'full' : 'split'))}
                  data-testid="toggle-workbench-layout-btn"
                  title={workbenchLayout === 'split' ? 'Expand to Full Width Prompt' : 'Split Workbench (Prompt + Code Editor)'}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-cyan-400'
                  }`}
                >
                  {workbenchLayout === 'split' ? <Maximize2 size={13} /> : <Columns size={13} />}
                  <span className="hidden sm:inline">{workbenchLayout === 'split' ? 'Full Prompt' : 'Split View'}</span>
                </button>
              )}

              {/* Close Button */}
              <button
                onClick={() => setActiveProblem(null)}
                data-testid="problem-viewer-close-btn"
                title="Close problem (Esc)"
                aria-label="Close problem"
                className={`p-1.5 rounded-lg transition-colors ${
                  isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* NAVIGATION TABS */}
          <div
            className={`flex items-center justify-between px-6 pt-2 border-b text-xs font-mono font-bold tracking-wider ${
              isLight ? 'border-slate-200 bg-slate-100/50' : 'border-slate-800 bg-slate-900/40'
            }`}
          >
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('PROMPT')}
                data-testid="problem-tab-prompt"
                className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'PROMPT'
                    ? isLight
                      ? 'border-sky-600 text-sky-600'
                      : 'border-[#00f0ff] text-[#00f0ff]'
                    : isLight
                    ? 'border-transparent text-slate-500 hover:text-slate-800'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code size={13} /> PROBLEM PROMPT & CONSTRAINTS
              </button>

              {hasGuidedPractice && (
                <button
                  onClick={() => setActiveTab('GUIDED')}
                  data-testid="problem-tab-guided"
                  className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'GUIDED'
                      ? isLight ? 'border-sky-600 text-sky-600' : 'border-[#00f0ff] text-[#00f0ff]'
                      : isLight ? 'border-transparent text-slate-500 hover:text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles size={13} /> BREAKDOWN & PRACTICE
                </button>
              )}

              <button
                onClick={openSolutionTab}
                data-testid="problem-tab-solution"
                disabled={hasGuidedPractice && !guidedAttemptStarted}
                className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'SOLUTION'
                    ? isLight
                      ? 'border-sky-600 text-sky-600'
                      : 'border-[#00f0ff] text-[#00f0ff]'
                    : hasGuidedPractice && !guidedAttemptStarted
                    ? 'border-transparent text-slate-400/50 cursor-not-allowed'
                    : isLight
                    ? 'border-transparent text-slate-500 hover:text-slate-800'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
                title={hasGuidedPractice && !guidedAttemptStarted ? 'Start a guided attempt before opening the canonical solution' : undefined}
              >
                <Sparkles size={13} /> CANONICAL SOLUTION & PREREQUISITES
                {linkedPrereqs.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500/20 text-sky-400">
                    {linkedPrereqs.length}
                  </span>
                )}
              </button>

              {activeProblem.quizzes && activeProblem.quizzes.length > 0 && (
                <button
                  onClick={() => setActiveTab('QUIZ')}
                  data-testid="problem-tab-quiz"
                  className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'QUIZ'
                      ? isLight
                        ? 'border-sky-600 text-sky-600'
                        : 'border-[#00f0ff] text-[#00f0ff]'
                      : isLight
                      ? 'border-transparent text-slate-500 hover:text-slate-800'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <HelpCircle size={13} /> CONCEPT CHECKPOINTS
                </button>
              )}

              <button
                onClick={() => {
                  setActiveTab('SUBMISSIONS');
                  if (activeProblem?.id) {
                    fetchProblemSubmissions(activeProblem.id);
                  }
                }}
                data-testid="problem-tab-submissions"
                className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'SUBMISSIONS'
                    ? isLight
                      ? 'border-sky-600 text-sky-600'
                      : 'border-[#00f0ff] text-[#00f0ff]'
                    : isLight
                    ? 'border-transparent text-slate-500 hover:text-slate-800'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckCircle2 size={13} /> SUBMISSIONS
                {submissions.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-mono">
                    {submissions.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setActiveTab('SYSTEM_DESIGN');
                  if (activeProblem?.id) {
                    fetchFollowUpResponses(activeProblem.id);
                  }
                }}
                data-testid="problem-tab-system-design"
                className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'SYSTEM_DESIGN'
                    ? isLight
                      ? 'border-sky-600 text-sky-600'
                      : 'border-[#00f0ff] text-[#00f0ff]'
                    : isLight
                    ? 'border-transparent text-slate-500 hover:text-slate-800'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers size={13} /> {activeProblem.type === 'CODING' ? 'FOLLOW-UP QUESTIONS' : 'SYSTEM DESIGN'}
                {followUps.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500/20 text-purple-400 font-mono" data-testid="system-design-count-badge">
                    {followUps.length}
                  </span>
                )}
              </button>
            </div>

            {/* WRITE / PREVIEW TOGGLE WHEN EDITING */}
            {isEditing && (
              <div className="flex items-center gap-1 mb-1.5 p-0.5 rounded-lg border text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setEditTabMode('WRITE')}
                  data-testid="problem-edit-write-mode-btn"
                  className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all ${
                    editTabMode === 'WRITE'
                      ? isLight
                        ? 'bg-sky-600 text-white font-bold shadow-sm'
                        : 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <PenLine size={12} />
                  <span>WRITE</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditTabMode('PREVIEW')}
                  data-testid="problem-edit-preview-mode-btn"
                  className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all ${
                    editTabMode === 'PREVIEW'
                      ? isLight
                        ? 'bg-sky-600 text-white font-bold shadow-sm'
                        : 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye size={12} />
                  <span>PREVIEW</span>
                </button>
              </div>
            )}
          </div>

          {/* MAIN MODAL BODY */}
          <div
            ref={bodyRef}
            className={`flex-1 ${
              workbenchLayout === 'split' && activeTab === 'PROMPT' && !isEditing
                ? 'overflow-y-auto lg:overflow-hidden p-3 sm:p-4 lg:p-6'
                : 'overflow-y-auto p-4 sm:p-6 space-y-6'
            }`}
          >
            {hasGuidedPractice && activeProblem && (
              <div hidden={activeTab !== 'GUIDED'}>
                <GuidedPracticePanel
                  problemId={activeProblem.id}
                  isLight={isLight}
                  topicNodes={topicNodes}
                  onOpenConcept={handlePrerequisiteClick}
                  onAttemptStarted={() => setGuidedAttemptStarted(true)}
                  onRevealSolution={() => {
                    setGuidedAttemptStarted(true);
                    setActiveTab('SOLUTION');
                  }}
                />
              </div>
            )}

            {/* TAB 1: PROMPT */}
            {activeTab === 'PROMPT' && (
              <div
                className={
                  workbenchLayout === 'split' && !isEditing
                    ? 'min-h-full h-auto lg:h-full flex flex-col lg:flex-row gap-6'
                    : 'space-y-6'
                }
                data-testid="problem-prompt-section"
              >
                {isEditing ? (
                  /* EDIT MODE FOR PROMPT */
                  <div className="space-y-6">
                    {editTabMode === 'WRITE' ? (
                      <>
                        {/* Prompt Markdown Textarea */}
                        <div>
                          <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                            Problem Statement, Examples & Constraints (Markdown)
                          </label>
                          <textarea
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            data-testid="problem-edit-prompt-textarea"
                            rows={12}
                            placeholder="Write the problem statement, examples, and constraints in Markdown..."
                            className={`w-full p-4 rounded-xl font-mono text-xs border focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-y leading-relaxed ${
                              isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                            }`}
                          />
                        </div>

                        {/* Starter Code Editor */}
                        <div
                          className={`rounded-xl border p-4 space-y-3 ${
                            isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-900/60 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Terminal size={14} className="text-cyan-400" />
                              <span className="text-xs font-mono font-bold uppercase tracking-wider">
                                Starter Code Stubs
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {Object.keys(editStarterCode).map((lang) => (
                                <div key={lang} className="flex items-center">
                                  <button
                                    type="button"
                                    onClick={() => setEditStarterLang(lang)}
                                    className={`px-2.5 py-1 rounded-l text-[10px] font-mono font-bold uppercase transition-all ${
                                      editStarterLang === lang
                                        ? isLight
                                          ? 'bg-sky-600 text-white'
                                          : 'bg-cyan-500 text-slate-950'
                                        : 'bg-slate-800 text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    {lang}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStarterLang(lang)}
                                    title={`Remove ${lang} stub`}
                                    className="px-1.5 py-1 rounded-r bg-slate-800 text-slate-400 hover:text-rose-400 border-l border-slate-700 text-[10px]"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ))}

                              {isAddingLang ? (
                                <div className="flex items-center gap-1 ml-2">
                                  <input
                                    type="text"
                                    value={newLangName}
                                    onChange={(e) => setNewLangName(e.target.value)}
                                    placeholder="lang (e.g. go, rust)"
                                    className="px-2 py-0.5 text-xs font-mono rounded border bg-slate-950 border-slate-700 text-white w-28"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddStarterLang()}
                                  />
                                  <button
                                    type="button"
                                    onClick={handleAddStarterLang}
                                    className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-500 text-slate-950"
                                  >
                                    Add
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setIsAddingLang(false)}
                                    className="p-0.5 text-slate-400 hover:text-white"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setIsAddingLang(true)}
                                  className="px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 ml-1 border border-slate-700"
                                >
                                  <Plus size={10} />
                                  <span>Add Language</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Quick Select for 8 Supported Languages */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className="text-[10px] font-mono text-slate-400">Quick Select:</span>
                            {SUPPORTED_LANGUAGES.map((l) => (
                              <button
                                key={l.id}
                                type="button"
                                onClick={() => {
                                  if (editStarterCode[l.id] === undefined) {
                                    setEditStarterCode({
                                      ...editStarterCode,
                                      [l.id]: DEFAULT_STARTER_CODES[l.id] || ''
                                    });
                                  }
                                  setEditStarterLang(l.id);
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                                  editStarterLang === l.id
                                    ? isLight
                                      ? 'bg-sky-600 text-white shadow-sm'
                                      : 'bg-[#00f0ff] text-slate-950 font-bold'
                                    : isLight
                                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {l.label}
                              </button>
                            ))}
                          </div>

                          {editStarterLang && (
                            <textarea
                              rows={6}
                              value={editStarterCode[editStarterLang] || ''}
                              onChange={(e) => handleUpdateStarterCode(editStarterLang, e.target.value)}
                              data-testid={`problem-edit-starter-${editStarterLang}`}
                              placeholder={`Starter code stub for ${editStarterLang}...`}
                              className={`w-full p-3 rounded-lg font-mono text-xs border focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-y ${
                                isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                              }`}
                            />
                          )}
                        </div>

                        {/* Progressive Hints Editor */}
                        <div
                          className={`rounded-xl border p-4 space-y-3 ${
                            isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-900/60 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                              Progressive Interview Hints ({editHints.length})
                            </span>
                            <button
                              type="button"
                              onClick={handleAddHint}
                              data-testid="problem-add-hint-btn"
                              className="px-2.5 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors"
                            >
                              <Plus size={11} />
                              <span>Add Hint</span>
                            </button>
                          </div>

                          <div className="space-y-2.5">
                            {editHints.map((hint, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <span className="text-xs font-mono text-slate-400 pt-2 shrink-0">
                                  #{idx + 1}
                                </span>
                                <textarea
                                  rows={2}
                                  value={hint}
                                  onChange={(e) => handleUpdateHint(idx, e.target.value)}
                                  data-testid={`problem-edit-hint-${idx}`}
                                  placeholder={`Hint #${idx + 1}...`}
                                  className={`flex-1 p-2 rounded-lg text-xs border focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteHint(idx)}
                                  title="Delete hint"
                                  className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors mt-1"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      /* LIVE PREVIEW OF EDITED PROMPT */
                      <div className="space-y-6">
                        <div
                          className={`p-3.5 rounded-lg border text-sm leading-relaxed ${
                            isLight ? 'bg-sky-50/70 border-sky-200 text-sky-900' : 'bg-sky-950/20 border-sky-800/60 text-sky-200'
                          }`}
                        >
                          <p className="font-medium">{editSummary || activeProblem.summary}</p>
                        </div>
                        <div className="prose max-w-none">
                          <MarkdownContent content={editPrompt} accentColor={isLight ? '#0284c7' : '#00f0ff'} />
                        </div>
                        {editStarterCode[editStarterLang] && (
                          <div className={`rounded-xl border overflow-hidden shadow-md ${isLight ? 'border-slate-300 bg-slate-50' : 'border-slate-800 bg-[#060a14]'}`}>
                            <div className={`px-4 py-2 border-b text-xs font-mono uppercase font-bold flex items-center justify-between ${isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-950 text-slate-300 border-slate-800'}`}>
                              <div className="flex items-center gap-2">
                                <Terminal size={12} className={isLight ? 'text-sky-600' : 'text-sky-400'} />
                                <span>Starter Code Preview ({editStarterLang})</span>
                              </div>
                            </div>
                            <div className="overflow-x-auto text-[11.5px] font-mono leading-relaxed">
                              <SyntaxHighlighter
                                language={editStarterLang || 'text'}
                                style={isLight ? oneLight : dracula}
                                showLineNumbers={true}
                                customStyle={{
                                  margin: 0,
                                  padding: '1rem',
                                  background: 'transparent',
                                  fontSize: '11.5px',
                                  lineHeight: '1.6'
                                }}
                                lineNumberStyle={{
                                  minWidth: '2.5em',
                                  paddingRight: '1em',
                                  color: isLight ? '#94a3b8' : '#475569',
                                  userSelect: 'none'
                                }}
                                codeTagProps={{
                                  style: {
                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
                                  }
                                }}
                              >
                                {editStarterCode[editStarterLang]}
                              </SyntaxHighlighter>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : workbenchLayout === 'split' ? (
                  /* SPLIT WORKBENCH VIEW: LEFT PANE (PROMPT) + RIGHT PANE (CODE WORKBENCH) */
                  <>
                    {/* LEFT PANE: PROMPT & CONSTRAINTS */}
                    <div
                      className="w-full lg:w-1/2 h-full overflow-y-auto pr-2 space-y-6 flex flex-col"
                      data-testid="problem-prompt-left-pane"
                    >
                      {/* Summary Banner */}
                      <div
                        className={`p-3.5 rounded-lg border text-sm leading-relaxed ${
                          isLight
                            ? 'bg-sky-50/70 border-sky-200 text-sky-900'
                            : 'bg-sky-950/20 border-sky-800/60 text-sky-200'
                        }`}
                      >
                        <p className="font-medium">{activeProblem.summary}</p>
                      </div>

                      {/* Markdown Prompt */}
                      <div className="prose max-w-none">
                        <MarkdownContent content={activeProblem.prompt} accentColor={isLight ? '#0284c7' : '#00f0ff'} />
                      </div>

                      {/* Starter Code Box (if applicable) */}
                      {starterCodeLanguages.length > 0 && (
                        <div
                          className={`rounded-xl border overflow-hidden shadow-lg ${
                            isLight ? 'border-slate-300 bg-slate-50' : 'border-slate-800 bg-[#060a14]'
                          }`}
                          data-testid="problem-starter-code-box"
                        >
                          <div
                            className={`px-4 py-2 border-b flex items-center justify-between text-xs font-mono ${
                              isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-950/90 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Terminal size={13} className={isLight ? 'text-sky-600' : 'text-sky-400'} />
                              <span className="font-bold tracking-wider">STARTER CODE STUB</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 overflow-x-auto max-w-[280px] sm:max-w-[360px] no-scrollbar py-0.5">
                                {starterCodeLanguages.map((lang) => (
                                  <button
                                    key={lang}
                                    onClick={() => setSelectedLanguage(lang)}
                                    className={`px-2.5 py-0.5 rounded uppercase text-[10px] font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                                      selectedLanguage === lang
                                        ? isLight
                                          ? 'bg-sky-600 text-white shadow-sm'
                                          : 'bg-[#00f0ff] text-slate-950 shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                                        : isLight
                                        ? 'text-slate-600 hover:text-slate-900 bg-slate-200/60'
                                        : 'text-slate-400 hover:text-white bg-slate-900/60'
                                    }`}
                                    data-testid={`starter-lang-tab-${lang}`}
                                  >
                                    {lang}
                                  </button>
                                ))}
                              </div>
                              <button
                                onClick={handleCopyStarter}
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono transition-colors border cursor-pointer ${
                                  isLight
                                    ? 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200'
                                    : 'text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border-white/5'
                                }`}
                                title="Copy starter code"
                                data-testid="copy-starter-code-btn"
                              >
                                {copiedStarter ? (
                                  <>
                                    <Check size={11} className={isLight ? 'text-emerald-600' : 'text-[#00ff9d]'} />
                                    <span className={isLight ? 'text-emerald-600 font-bold' : 'text-[#00ff9d] font-bold'}>COPIED</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={11} />
                                    <span>COPY</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="overflow-x-auto text-[11.5px] font-mono leading-relaxed">
                            <SyntaxHighlighter
                              language={currentLanguageConfig.prismLang}
                              style={isLight ? oneLight : dracula}
                              showLineNumbers={true}
                              customStyle={{
                                margin: 0,
                                padding: '1rem',
                                background: 'transparent',
                                fontSize: '11.5px',
                                lineHeight: '1.6'
                              }}
                              lineNumberStyle={{
                                minWidth: '2.5em',
                                paddingRight: '1em',
                                color: isLight ? '#94a3b8' : '#475569',
                                userSelect: 'none'
                              }}
                              codeTagProps={{
                                style: {
                                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
                                }
                              }}
                            >
                              {activeStarterCode}
                            </SyntaxHighlighter>
                          </div>
                        </div>
                      )}

                      {/* Progressive Hints */}
                      {activeProblem.hints && activeProblem.hints.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                            Progressive Interview Hints ({activeProblem.hints.length})
                          </h4>
                          <div className="space-y-2">
                            {activeProblem.hints.map((hint, idx) => {
                              const isRevealed = revealedHints.includes(idx);
                              return (
                                <div
                                  key={idx}
                                  className={`rounded-lg border transition-all ${
                                    isLight
                                      ? 'bg-slate-50 border-slate-200'
                                      : 'bg-slate-900/50 border-slate-800'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleHint(idx)}
                                    data-testid={`hint-toggle-btn-${idx}`}
                                    className="w-full px-4 py-2.5 flex items-center justify-between text-left text-xs font-medium hover:bg-white/5 transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <HelpCircle size={13} className="text-amber-400" />
                                      <span>Hint {idx + 1}</span>
                                    </div>
                                    {isRevealed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  </button>
                                  {isRevealed && (
                                    <div
                                      className={`px-4 pb-3 pt-1 text-xs border-t leading-relaxed ${
                                        isLight
                                          ? 'border-slate-200 text-slate-700 bg-white/60'
                                          : 'border-slate-800/80 text-slate-300 bg-slate-950/40'
                                      }`}
                                    >
                                      {hint}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Reveal Solution Gate CTA */}
                      <div
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                          isLight
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                            : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                        }`}
                      >
                        <div>
                          <h4 className="font-bold text-sm">Ready to check your solution or get stuck?</h4>
                          <p className="text-xs opacity-80 mt-0.5">
                            Explore the canonical architecture, complexity bounds, and linked prerequisite knowledge nodes.
                          </p>
                        </div>
                        <button
                          onClick={openSolutionTab}
                          className="px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shrink-0"
                          data-testid="reveal-solution-btn"
                        >
                          <span>Reveal Solution</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>

                    {/* RIGHT PANE: MONACO CODE WORKBENCH */}
                    <div
                      className={`w-full lg:w-1/2 min-h-[420px] lg:h-full flex flex-col rounded-xl border overflow-hidden shadow-xl ${
                        isLight ? 'border-slate-300 bg-slate-50' : 'border-slate-800 bg-[#070b16]'
                      }`}
                      data-testid="problem-code-workbench"
                    >
                      {/* WORKBENCH TOOLBAR */}
                      <div
                        className={`px-4 py-2.5 border-b flex items-center justify-between gap-3 text-xs font-mono shrink-0 ${
                          isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        {/* Language Tabs (Python, TypeScript, Java, C++, Go, Rust, SQL, Protobuf) */}
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[calc(100%-120px)] sm:max-w-[calc(100%-250px)] py-0.5">
                          {SUPPORTED_LANGUAGES.map((lang) => {
                            const isSelected = selectedLanguage === lang.id;
                            return (
                              <button
                                key={lang.id}
                                onClick={() => setSelectedLanguage(lang.id)}
                                data-testid={`workbench-lang-tab-${lang.id}`}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                                  isSelected
                                    ? isLight
                                      ? 'bg-sky-600 text-white shadow-sm'
                                      : 'bg-[#00f0ff] text-slate-950 shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                                    : isLight
                                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                                }`}
                              >
                                {lang.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Font Size & Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Font Size Adjustment */}
                          <div className="flex items-center border rounded overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setEditorFontSize((prev) => Math.max(11, prev - 1))}
                              className="px-2 py-0.5 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                              title="Decrease font size"
                              data-testid="decrease-font-btn"
                            >
                              A-
                            </button>
                            <span className="px-1.5 py-0.5 text-[10px] border-x opacity-70">
                              {editorFontSize}px
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditorFontSize((prev) => Math.min(22, prev + 1))}
                              className="px-2 py-0.5 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                              title="Increase font size"
                              data-testid="increase-font-btn"
                            >
                              A+
                            </button>
                          </div>

                          {/* Reset Code */}
                          <button
                            type="button"
                            onClick={handleResetCode}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
                              isLight
                                ? 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200'
                                : 'text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border-white/5'
                            }`}
                            title="Reset code to original starter template"
                            data-testid="reset-code-btn"
                          >
                            <RotateCcw size={12} />
                            <span className="hidden sm:inline">Reset</span>
                          </button>

                          {/* Copy Code */}
                          <button
                            type="button"
                            onClick={handleCopyEditorCode}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors border ${
                              isLight
                                ? 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200'
                                : 'text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border-white/5'
                            }`}
                            title="Copy editor code to clipboard"
                            data-testid="copy-editor-code-btn"
                          >
                            {copiedEditorCode ? (
                              <>
                                <Check size={12} className={isLight ? 'text-emerald-600' : 'text-[#00ff9d]'} />
                                <span className={isLight ? 'text-emerald-600 font-bold' : 'text-[#00ff9d] font-bold'}>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span className="hidden sm:inline">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* MONACO CODE EDITOR CANVAS */}
                      <div
                        className={`relative bg-slate-950/20 transition-all ${
                          isConsoleOpen ? 'flex-1 min-h-[200px]' : 'flex-1 min-h-[350px]'
                        }`}
                        data-testid="monaco-editor-container"
                      >
                        <Editor
                          height="100%"
                          language={currentLanguageConfig.monacoLang}
                          value={currentEditorCode}
                          theme={isLight ? 'light' : 'vs-dark'}
                          beforeMount={handleEditorBeforeMount}
                          onChange={handleEditorChange}
                          options={{
                            fontSize: editorFontSize,
                            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            tabSize: 2,
                            lineNumbers: 'on',
                            wordWrap: 'on',
                            formatOnPaste: true,
                            bracketPairColorization: { enabled: true },
                            padding: { top: 12, bottom: 12 }
                          }}
                        />
                      </div>

                      {/* TEST CASE & CONSOLE OUTPUT DRAWER (STEP 3) */}
                      <div
                        className={`border-t flex flex-col transition-all duration-200 shrink-0 ${
                          isConsoleOpen ? 'h-[230px]' : 'h-10'
                        } ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-800'
                        }`}
                        data-testid="testcase-console-drawer"
                      >
                        {/* Drawer Tabs Header */}
                        <div
                          className={`px-3 py-1.5 flex items-center justify-between border-b shrink-0 ${
                            isLight ? 'bg-slate-200/50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              data-testid="tab-testcases"
                              onClick={() => {
                                setConsoleTab('testcases');
                                if (!isConsoleOpen) setIsConsoleOpen(true);
                              }}
                              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                consoleTab === 'testcases'
                                  ? isLight
                                    ? 'bg-white text-sky-700 shadow-sm'
                                    : 'bg-slate-800 text-sky-400 shadow-sm'
                                  : isLight
                                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                              }`}
                            >
                              <CheckCircle2 size={13} className={consoleTab === 'testcases' ? (isLight ? 'text-sky-600' : 'text-sky-400') : 'text-slate-400'} />
                              <span>Test Cases ({currentTestCases.length})</span>
                            </button>

                            <button
                              type="button"
                              data-testid="tab-console-output"
                              onClick={() => {
                                setConsoleTab('output');
                                if (!isConsoleOpen) setIsConsoleOpen(true);
                              }}
                              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                consoleTab === 'output'
                                  ? isLight
                                    ? 'bg-white text-sky-700 shadow-sm'
                                    : 'bg-slate-800 text-sky-400 shadow-sm'
                                  : isLight
                                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                              }`}
                            >
                              <Terminal size={13} className={consoleTab === 'output' ? (isLight ? 'text-sky-600' : 'text-sky-400') : 'text-slate-400'} />
                              <span>Console Output</span>
                              {lastRunResult && (
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                    lastRunResult.status === 'passed'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-rose-500/20 text-rose-400'
                                  }`}
                                >
                                  {lastRunResult.status === 'passed' ? 'Passed' : 'Failed'}
                                </span>
                              )}
                            </button>
                          </div>

                          {/* Toggle Collapse Button */}
                          <button
                            type="button"
                            data-testid="toggle-console-btn"
                            onClick={() => setIsConsoleOpen((prev) => !prev)}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isLight ? 'text-slate-500 hover:bg-slate-200' : 'text-slate-400 hover:bg-slate-800'
                            }`}
                            title={isConsoleOpen ? 'Collapse console' : 'Expand console'}
                          >
                            {isConsoleOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                          </button>
                        </div>

                        {/* Drawer Body */}
                        {isConsoleOpen && (
                          <div className="flex-1 overflow-y-auto p-3 text-xs font-mono">
                            {consoleTab === 'testcases' ? (
                              <div>
                                {/* Case Pills + Add Case */}
                                <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto pb-1">
                                  {currentTestCases.map((tc, idx) => {
                                    const isSelected = selectedCaseIndex === idx;
                                    return (
                                      <div key={tc.id || idx} className="flex items-center">
                                        <button
                                          type="button"
                                          data-testid={`case-pill-${idx}`}
                                          onClick={() => setSelectedCaseIndex(idx)}
                                          className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                            isSelected
                                              ? isLight
                                                ? 'bg-sky-600 text-white shadow-sm'
                                                : 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                                              : isLight
                                              ? 'bg-slate-200/70 text-slate-700 hover:bg-slate-300'
                                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                          }`}
                                        >
                                          <span>Case {idx + 1}</span>
                                        </button>
                                        {tc.isCustom && (
                                          <button
                                            type="button"
                                            data-testid={`delete-case-btn-${idx}`}
                                            onClick={() => handleDeleteTestCase(idx)}
                                            className="ml-1 p-0.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                                            title="Delete custom case"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}

                                  <button
                                    type="button"
                                    data-testid="add-testcase-btn"
                                    onClick={handleAddTestCase}
                                    className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors border border-dashed cursor-pointer ${
                                      isLight
                                        ? 'border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                        : 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                                    title="Add custom test case"
                                  >
                                    <Plus size={12} />
                                    <span>Add Case</span>
                                  </button>
                                </div>

                                {/* Active Case Inputs */}
                                {currentTestCases[selectedCaseIndex] && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                                        Input
                                      </label>
                                      <textarea
                                        data-testid="testcase-input-editor"
                                        value={
                                          currentTestCases[selectedCaseIndex].rawInput !== undefined
                                            ? currentTestCases[selectedCaseIndex].rawInput
                                            : typeof currentTestCases[selectedCaseIndex].input === 'string'
                                            ? currentTestCases[selectedCaseIndex].input
                                            : JSON.stringify(currentTestCases[selectedCaseIndex].input, null, 2)
                                        }
                                        onChange={(e) => handleUpdateTestCaseInput(selectedCaseIndex, e.target.value)}
                                        className={`w-full h-20 p-2 rounded border text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                                          isLight
                                            ? 'bg-white border-slate-300 text-slate-800'
                                            : 'bg-slate-950 border-slate-800 text-slate-200'
                                        }`}
                                        placeholder="Enter test case input (JSON or primitive)"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                                        Expected Output
                                      </label>
                                      <textarea
                                        data-testid="testcase-expected-editor"
                                        value={
                                          currentTestCases[selectedCaseIndex].rawExpected !== undefined
                                            ? currentTestCases[selectedCaseIndex].rawExpected
                                            : typeof currentTestCases[selectedCaseIndex].expected === 'string'
                                            ? currentTestCases[selectedCaseIndex].expected
                                            : JSON.stringify(currentTestCases[selectedCaseIndex].expected, null, 2)
                                        }
                                        onChange={(e) => handleUpdateTestCaseExpected(selectedCaseIndex, e.target.value)}
                                        className={`w-full h-20 p-2 rounded border text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                                          isLight
                                            ? 'bg-white border-slate-300 text-slate-800'
                                            : 'bg-slate-950 border-slate-800 text-slate-200'
                                        }`}
                                        placeholder="Enter expected output"
                                      />
                                    </div>
                                  </div>
                                )}

                                {currentTestCases[selectedCaseIndex]?.explanation && (
                                  <p className="mt-2 text-[11px] text-slate-400 italic">
                                    Note: {currentTestCases[selectedCaseIndex].explanation}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div>
                                {isRunningCode ? (
                                  <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-400">
                                    <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                                    <span className="text-xs">Executing {currentLanguageConfig.label} solution...</span>
                                  </div>
                                ) : !lastRunResult ? (
                                  <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-1">
                                    <Terminal size={18} className="opacity-50" />
                                    <span>Click "Run Code" to execute active case</span>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {/* Verdict Header */}
                                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                      <div className="flex items-center gap-2">
                                        <span
                                          data-testid="execution-verdict-badge"
                                          className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                                            lastRunResult.status === 'passed'
                                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                              : lastRunResult.status === 'failed'
                                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                          }`}
                                        >
                                          {lastRunResult.status === 'passed' ? (
                                            <>
                                              <Check size={13} className="stroke-[3]" />
                                              <span>Accepted</span>
                                            </>
                                          ) : lastRunResult.status === 'failed' ? (
                                            <>
                                              <X size={13} className="stroke-[3]" />
                                              <span>Wrong Answer</span>
                                            </>
                                          ) : (
                                            <>
                                              <ShieldAlert size={13} />
                                              <span>Runtime Error</span>
                                            </>
                                          )}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                          Case {lastRunResult.testCaseIndex + 1}
                                        </span>
                                      </div>

                                      <div className="text-xs font-semibold text-slate-400">
                                        Runtime: <span className="text-sky-400">{lastRunResult.runtimeMs} ms</span>
                                      </div>
                                    </div>

                                    {/* Error Traceback (if any) */}
                                    {lastRunResult.error && (
                                      <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs">
                                        <div className="font-bold mb-1">Error Trace:</div>
                                        <pre className="whitespace-pre-wrap">{lastRunResult.error}</pre>
                                      </div>
                                    )}

                                    {/* Comparison Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                      <div
                                        className={`p-2 rounded border ${
                                          isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                                        }`}
                                      >
                                        <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                                          Your Output:
                                        </span>
                                        <pre data-testid="actual-output-display" className="overflow-x-auto text-emerald-400 font-mono">
                                          {formatValue(lastRunResult.actual)}
                                        </pre>
                                      </div>

                                      <div
                                        className={`p-2 rounded border ${
                                          isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                                        }`}
                                      >
                                        <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                                          Expected Output:
                                        </span>
                                        <pre data-testid="expected-output-display" className="overflow-x-auto text-sky-400 font-mono">
                                          {formatValue(lastRunResult.expected)}
                                        </pre>
                                      </div>
                                    </div>

                                    {/* Standard Output Logs (if any) */}
                                    {lastRunResult.stdout && (
                                      <div
                                        className={`p-2 rounded border ${
                                          isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-950 border-slate-800'
                                        }`}
                                      >
                                        <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                                          Standard Output (stdout):
                                        </span>
                                        <pre data-testid="stdout-logs-display" className="text-slate-300 whitespace-pre-wrap">
                                          {lastRunResult.stdout}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* BOTTOM ACTION & EXECUTION STATUS BAR */}
                      <div
                        className={`px-4 py-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0 ${
                          isLight ? 'bg-slate-100/90 border-slate-300 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Ready</span>
                          </div>
                          <span className="text-slate-500">•</span>
                          <span className="text-[11px] text-slate-400">{editorLineCount} lines</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-[11px] font-bold uppercase text-sky-400">{currentLanguageConfig.label}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            data-testid="run-code-btn"
                            onClick={handleRunCode}
                            disabled={isRunningCode}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border cursor-pointer ${
                              isRunningCode ? 'opacity-60 cursor-not-allowed' : ''
                            } ${
                              isLight
                                ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-500'
                            }`}
                            title="Run code against sample test cases (Step 3 WASM runner)"
                          >
                            {isRunningCode ? (
                              <Loader2 size={13} className="animate-spin text-sky-400" />
                            ) : (
                              <Play size={13} className={isLight ? 'text-sky-600 fill-sky-600' : 'text-sky-400 fill-sky-400'} />
                            )}
                            <span>{isRunningCode ? 'Running...' : 'Run Code'}</span>
                          </button>

                          <button
                            type="button"
                            data-testid="submit-solution-btn"
                            onClick={handleSubmitSolution}
                            disabled={isSubmitting}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md font-sans cursor-pointer ${
                              isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
                            }`}
                            title="Submit code against all test cases (Step 4 Judge)"
                          >
                            {isSubmitting ? (
                              <Loader2 size={14} className="animate-spin text-slate-950" />
                            ) : (
                              <Check size={14} className="stroke-[2.5]" />
                            )}
                            <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* FULL WIDTH PROMPT (WHEN WORKBENCH LAYOUT IS 'full') */
                  <>
                    {/* Summary Banner */}
                    <div
                      className={`p-3.5 rounded-lg border text-sm leading-relaxed ${
                        isLight
                          ? 'bg-sky-50/70 border-sky-200 text-sky-900'
                          : 'bg-sky-950/20 border-sky-800/60 text-sky-200'
                      }`}
                    >
                      <p className="font-medium">{activeProblem.summary}</p>
                    </div>

                    {/* Markdown Prompt */}
                    <div className="prose max-w-none">
                      <MarkdownContent content={activeProblem.prompt} accentColor={isLight ? '#0284c7' : '#00f0ff'} />
                    </div>

                    {/* Starter Code Box (if applicable) */}
                    {starterCodeLanguages.length > 0 && (
                      <div
                        className={`rounded-xl border overflow-hidden shadow-lg ${
                          isLight ? 'border-slate-300 bg-slate-50' : 'border-slate-800 bg-[#060a14]'
                        }`}
                        data-testid="problem-starter-code-box"
                      >
                        <div
                          className={`px-4 py-2 border-b flex items-center justify-between text-xs font-mono ${
                            isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-950/90 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Terminal size={13} className={isLight ? 'text-sky-600' : 'text-sky-400'} />
                            <span className="font-bold tracking-wider">STARTER CODE STUB</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 overflow-x-auto max-w-[280px] sm:max-w-[420px] no-scrollbar py-0.5">
                              {starterCodeLanguages.map((lang) => (
                                <button
                                  key={lang}
                                  onClick={() => setSelectedLanguage(lang)}
                                  className={`px-2.5 py-0.5 rounded uppercase text-[10px] font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                                    selectedLanguage === lang
                                      ? isLight
                                        ? 'bg-sky-600 text-white shadow-sm'
                                        : 'bg-[#00f0ff] text-slate-950 shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                                      : isLight
                                      ? 'text-slate-600 hover:text-slate-900 bg-slate-200/60'
                                      : 'text-slate-400 hover:text-white bg-slate-900/60'
                                  }`}
                                  data-testid={`starter-lang-tab-${lang}`}
                                >
                                  {lang}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={handleCopyStarter}
                              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono transition-colors border cursor-pointer ${
                                isLight
                                  ? 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200'
                                  : 'text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border-white/5'
                              }`}
                              title="Copy starter code"
                              data-testid="copy-starter-code-btn"
                            >
                              {copiedStarter ? (
                                <>
                                  <Check size={11} className={isLight ? 'text-emerald-600' : 'text-[#00ff9d]'} />
                                  <span className={isLight ? 'text-emerald-600 font-bold' : 'text-[#00ff9d] font-bold'}>COPIED</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={11} />
                                  <span>COPY</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="overflow-x-auto text-[11.5px] font-mono leading-relaxed">
                          <SyntaxHighlighter
                            language={currentLanguageConfig.prismLang}
                            style={isLight ? oneLight : dracula}
                            showLineNumbers={true}
                            customStyle={{
                              margin: 0,
                              padding: '1rem',
                              background: 'transparent',
                              fontSize: '11.5px',
                              lineHeight: '1.6'
                            }}
                            lineNumberStyle={{
                              minWidth: '2.5em',
                              paddingRight: '1em',
                              color: isLight ? '#94a3b8' : '#475569',
                              userSelect: 'none'
                            }}
                            codeTagProps={{
                              style: {
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
                              }
                            }}
                          >
                            {activeStarterCode}
                          </SyntaxHighlighter>
                        </div>
                      </div>
                    )}

                    {/* Progressive Hints */}
                    {activeProblem.hints && activeProblem.hints.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                          Progressive Interview Hints ({activeProblem.hints.length})
                        </h4>
                        <div className="space-y-2">
                          {activeProblem.hints.map((hint, idx) => {
                            const isRevealed = revealedHints.includes(idx);
                            return (
                              <div
                                key={idx}
                                className={`rounded-lg border transition-all ${
                                  isLight
                                    ? 'bg-slate-50 border-slate-200'
                                    : 'bg-slate-900/50 border-slate-800'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleHint(idx)}
                                  data-testid={`hint-toggle-btn-${idx}`}
                                  className="w-full px-4 py-2.5 flex items-center justify-between text-left text-xs font-medium hover:bg-white/5 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <HelpCircle size={13} className="text-amber-400" />
                                    <span>Hint {idx + 1}</span>
                                  </div>
                                  {isRevealed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                                {isRevealed && (
                                  <div
                                    className={`px-4 pb-3 pt-1 text-xs border-t leading-relaxed ${
                                      isLight
                                        ? 'border-slate-200 text-slate-700 bg-white/60'
                                        : 'border-slate-800/80 text-slate-300 bg-slate-950/40'
                                    }`}
                                  >
                                    {hint}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Reveal Solution Gate CTA */}
                    <div
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                        isLight
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                          : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                      }`}
                    >
                      <div>
                        <h4 className="font-bold text-sm">Ready to check your solution or get stuck?</h4>
                        <p className="text-xs opacity-80 mt-0.5">
                          Explore the canonical architecture, complexity bounds, and linked prerequisite knowledge nodes.
                        </p>
                      </div>
                      <button
                        onClick={openSolutionTab}
                        className="px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shrink-0"
                        data-testid="reveal-solution-btn"
                      >
                        <span>Reveal Solution</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB 2: SOLUTION & PREREQUISITES */}
            {activeTab === 'SOLUTION' && (
              <div className="space-y-6" data-testid="problem-solution-section">
                {/* Linked Prerequisite Knowledge Nodes Drawer */}
                {linkedPrereqs.length > 0 && (
                  <div
                    className={`p-4 rounded-xl border ${
                      isLight
                        ? 'bg-sky-50/60 border-sky-200 text-sky-950'
                        : 'bg-sky-950/20 border-sky-800/60 text-sky-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Compass size={16} className="text-sky-400" />
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider">
                          Required Prerequisite Concepts
                        </h4>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        Click concept to fly camera & open note
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {linkedPrereqs.map((topic) => (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => handlePrerequisiteClick(topic)}
                          data-testid={`prereq-topic-chip-${topic.id}`}
                          className={`p-2.5 rounded-lg border text-left transition-all flex items-start justify-between gap-2 group cursor-pointer ${
                            isLight
                              ? 'bg-white border-slate-200 hover:border-sky-500 hover:shadow-md'
                              : 'bg-slate-900/80 border-slate-800 hover:border-[#00f0ff] hover:shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                          }`}
                        >
                          <div className="min-w-0">
                            <span
                              className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase border"
                              style={{
                                borderColor: `${getDomainBaseColor(topic.category, isLight ? 'light' : 'dark')}50`,
                                color: getDomainBaseColor(topic.category, isLight ? 'light' : 'dark'),
                                backgroundColor: `${getDomainBaseColor(topic.category, isLight ? 'light' : 'dark')}15`
                              }}
                            >
                              {topic.category}
                            </span>
                            <div className="text-xs font-bold mt-1 group-hover:text-sky-400 truncate">
                              {topic.name}
                            </div>
                            <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                              {topic.summary}
                            </div>
                          </div>

                          <div className="flex flex-col items-end shrink-0">
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                topic.status === 'MASTERED'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : topic.status === 'DUE'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-sky-500/20 text-sky-400'
                              }`}
                            >
                              {Math.round(topic.mastery)}%
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* SOLUTION CONTENT (EDIT OR VIEW) */}
                {isEditing ? (
                  <div className="space-y-4">
                    {editTabMode === 'WRITE' ? (
                      <div>
                        <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                          Canonical Solution & Architectural Walkthrough (Markdown / Mermaid / Math)
                        </label>
                        <textarea
                          value={editSolution}
                          onChange={(e) => setEditSolution(e.target.value)}
                          data-testid="problem-edit-solution-textarea"
                          rows={18}
                          placeholder="Write the canonical solution in Markdown with ```mermaid diagrams and LaTeX formulas..."
                          className={`w-full p-4 rounded-xl font-mono text-xs border focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-y leading-relaxed ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                          }`}
                        />
                      </div>
                    ) : (
                      /* LIVE PREVIEW OF EDITED SOLUTION */
                      <div className="prose max-w-none">
                        <MarkdownContent content={editSolution} accentColor={isLight ? '#0284c7' : '#00f0ff'} />
                      </div>
                    )}
                  </div>
                ) : (
                  /* VIEW MODE FOR SOLUTION */
                  <div className="prose max-w-none">
                    <MarkdownContent content={activeProblem.solution} accentColor={isLight ? '#0284c7' : '#00f0ff'} />
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CONCEPT CHECKPOINTS */}
            {activeTab === 'QUIZ' && activeProblem.quizzes && activeProblem.quizzes.length > 0 && (
              <div className="space-y-6" data-testid="problem-quiz-section">
                <QuizViewer
                  questions={activeProblem.quizzes[0].questions}
                  topicTitle={activeProblem.title}
                />
              </div>
            )}

            {/* TAB 4: SUBMISSION HISTORY */}
            {activeTab === 'SUBMISSIONS' && (
              <div className="space-y-6" data-testid="problem-submissions-section">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <History size={16} className="text-sky-400" />
                      Submission History
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Review all past attempts, execution runtimes, memory usage, and solution telemetry.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('PROMPT')}
                    data-testid="return-to-code-btn"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all border flex items-center gap-1.5 cursor-pointer ${
                      isLight
                        ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                    }`}
                  >
                    <Code size={13} />
                    <span>Open Editor</span>
                  </button>
                </div>

                {submissions.length === 0 ? (
                  <div
                    className={`p-10 text-center rounded-xl border flex flex-col items-center justify-center gap-3 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
                    }`}
                    data-testid="no-submissions-message"
                  >
                    <div className="w-12 h-12 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400">
                      <Terminal size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">No Submissions Yet</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        You have not submitted a solution for this problem yet. Open the code workbench and click Submit to run against the complete test suite.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('PROMPT')}
                      className="mt-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
                    >
                      Solve Problem
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs font-mono" data-testid="submissions-table">
                      <thead
                        className={`text-[10px] uppercase font-bold tracking-wider ${
                          isLight ? 'bg-slate-100 text-slate-500 border-b border-slate-200' : 'bg-slate-950 text-slate-400 border-b border-slate-800'
                        }`}
                      >
                        <tr>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Language</th>
                          <th className="px-4 py-3">Runtime</th>
                          <th className="px-4 py-3">Memory</th>
                          <th className="px-4 py-3">Test Cases</th>
                          <th className="px-4 py-3">Submitted</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {submissions.map((sub, idx) => (
                          <tr
                            key={sub.id || idx}
                            data-testid="submission-history-row"
                            className={`transition-colors ${
                              isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-900/60'
                            }`}
                          >
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                  sub.status === 'ACCEPTED'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : sub.status === 'WRONG_ANSWER'
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                }`}
                              >
                                {sub.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 uppercase text-slate-300 font-bold">{sub.language}</td>
                            <td className="px-4 py-3 text-slate-300">{sub.runtimeMs} ms</td>
                            <td className="px-4 py-3 text-slate-300">{(sub.memoryKb / 1024).toFixed(1)} MB</td>
                            <td className="px-4 py-3 text-slate-300">
                              {sub.passedCount} / {sub.totalCount}
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                              {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSubmissionResult(sub);
                                  setIsSubmissionModalOpen(true);
                                }}
                                data-testid="view-submission-details-btn"
                                className="px-2.5 py-1 rounded text-[11px] font-bold bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 cursor-pointer"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: SYSTEM DESIGN FOLLOW-UPS */}
            {activeTab === 'SYSTEM_DESIGN' && (
              <div className="space-y-6" data-testid="problem-system-design-section">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <Layers size={16} className="text-purple-400" />
                      {activeProblem.type === 'CODING' ? 'Follow-Up Questions' : 'System Design Follow-Ups'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {activeProblem.type === 'CODING' ? 'Explore how the design changes when requirements change.' : 'Explore how this design changes at larger scale.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('PROMPT')}
                    data-testid="return-to-code-btn"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all border flex items-center gap-1.5 cursor-pointer ${
                      isLight
                        ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                    }`}
                  >
                    <Code size={13} />
                    <span>Back to Code</span>
                  </button>
                </div>

                {followUps.length === 0 ? (
                  <div
                    className={`p-10 text-center rounded-xl border flex flex-col items-center justify-center gap-3 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
                    }`}
                    data-testid="no-followups-message"
                  >
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <Layers size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{activeProblem.type === 'CODING' ? 'No Follow-Up Questions' : 'No System Design Follow-Ups'}</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        Follow-up questions have not been added yet.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Challenge Selector Pills */}
                    <div className="flex items-center gap-2 flex-wrap" data-testid="followup-challenge-selector">
                      {followUps.map((fu, idx) => {
                        const hasResponse = followUpResponses.some(
                          (r) => r.followUpId === fu.id && r.responseText && r.responseText.trim().length > 0
                        );
                        const isSelected = selectedFollowUpIndex === idx;
                        return (
                          <button
                            key={fu.id || idx}
                            type="button"
                            onClick={() => setSelectedFollowUpIndex(idx)}
                            data-testid={`followup-pill-${idx}`}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                              isSelected
                                ? isLight
                                  ? 'bg-purple-50 text-purple-700 border-purple-400 shadow-sm'
                                  : 'bg-purple-950/60 text-purple-300 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                                : isLight
                                ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:bg-slate-800/80 hover:text-slate-200'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono bg-purple-500/20 text-purple-400 font-bold">
                              {idx + 1}
                            </span>
                            <span className="truncate max-w-[220px]">{fu.title}</span>
                            {hasResponse && (
                              <span
                                title="Draft response saved"
                                className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {activeFollowUp && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* LEFT COLUMN: PROMPT, RUBRIC & HINTS */}
                        <div className={`space-y-6 ${followUpWorkbenchMode === 'DIAGRAM' ? 'lg:col-span-4' : 'lg:col-span-5'}`}>
                          {/* Prompt & Requirements Card */}
                          <div
                            className={`p-5 rounded-xl border ${
                              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'
                            }`}
                            data-testid="followup-prompt-card"
                          >
                            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/50">
                              <h4 className="text-sm font-bold flex items-center gap-2 text-purple-400 font-mono">
                                <Award size={14} />
                                Challenge #{selectedFollowUpIndex + 1}: {activeFollowUp.title}
                              </h4>
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                Scalability & Architecture
                              </span>
                            </div>

                            <div className="prose prose-invert prose-xs max-w-none text-slate-300">
                              <MarkdownContent content={activeFollowUp.prompt} />
                            </div>
                          </div>

                          {/* Architectural Rubric Breakdown */}
                          {activeFollowUp.rubric && Object.keys(activeFollowUp.rubric).length > 0 && (
                            <div
                              className={`p-5 rounded-xl border ${
                                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'
                              }`}
                              data-testid="followup-rubric-card"
                            >
                              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                                <Award size={14} className="text-amber-400" />
                                Architectural Evaluation Rubric
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {Object.entries(activeFollowUp.rubric).map(([criteria, weight]) => (
                                  <div
                                    key={criteria}
                                    className={`p-3 rounded-lg border flex flex-col justify-between ${
                                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between text-xs mb-1.5">
                                      <span className="font-medium capitalize text-slate-300">
                                        {criteria.replace(/_/g, ' ')}
                                      </span>
                                      <span className="font-mono font-bold text-amber-400">
                                        {weight}%
                                      </span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-amber-400 rounded-full"
                                        style={{ width: `${weight}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Progressive Hints Accordion */}
                          {activeFollowUp.hints && activeFollowUp.hints.length > 0 && (
                            <div
                              className={`p-5 rounded-xl border ${
                                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'
                              }`}
                              data-testid="followup-hints-card"
                            >
                              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                                <HelpCircle size={14} className="text-sky-400" />
                                Progressive Interview Hints ({activeFollowUp.hints.length})
                              </h4>
                              <div className="space-y-2">
                                {activeFollowUp.hints.map((hint, hintIdx) => {
                                  const isRevealed = revealedFollowUpHints.includes(hintIdx);
                                  return (
                                    <div
                                      key={hintIdx}
                                      className={`rounded-lg border transition-all ${
                                        isLight ? 'border-slate-200' : 'border-slate-800/80'
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (isRevealed) {
                                            setRevealedFollowUpHints(revealedFollowUpHints.filter((h) => h !== hintIdx));
                                          } else {
                                            setRevealedFollowUpHints([...revealedFollowUpHints, hintIdx]);
                                          }
                                        }}
                                        className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center justify-between cursor-pointer ${
                                          isRevealed
                                            ? isLight
                                              ? 'bg-sky-50 text-sky-800'
                                              : 'bg-sky-950/30 text-sky-300'
                                            : isLight
                                            ? 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                            : 'bg-slate-900/40 text-slate-400 hover:text-slate-200'
                                        }`}
                                        data-testid={`followup-hint-toggle-${hintIdx}`}
                                      >
                                        <span className="flex items-center gap-2">
                                          <Sparkles size={12} className="text-sky-400" />
                                          Hint #{hintIdx + 1}
                                        </span>
                                        {isRevealed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                      </button>
                                      {isRevealed && (
                                        <div
                                          className={`p-3.5 text-xs border-t ${
                                            isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-950 text-slate-300 border-slate-800/60'
                                          }`}
                                          data-testid={`followup-hint-content-${hintIdx}`}
                                        >
                                          <MarkdownContent content={hint} />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Reference Architecture Peeking */}
                          {activeFollowUp.sampleArchitecture && (
                            <div
                              className={`p-5 rounded-xl border ${
                                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setShowSampleArchitecture(!showSampleArchitecture)}
                                data-testid="toggle-sample-architecture-btn"
                                className="w-full text-left text-xs font-mono font-bold text-slate-400 hover:text-slate-200 flex items-center justify-between cursor-pointer"
                              >
                                <span className="flex items-center gap-2 text-purple-400">
                                  <BookOpen size={14} />
                                  Reference Solution & Canonical Topology
                                </span>
                                {showSampleArchitecture ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                              {showSampleArchitecture && (
                                <div className="mt-3 pt-3 border-t border-slate-800/60 text-xs text-slate-300 leading-relaxed font-mono">
                                  <MarkdownContent content={activeFollowUp.sampleArchitecture} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* RIGHT COLUMN: INTEGRATED ARCHITECTURE WORKBENCH & EXCALIDRAW CANVAS */}
                        <div className={`space-y-6 flex flex-col ${followUpWorkbenchMode === 'DIAGRAM' ? 'lg:col-span-8' : 'lg:col-span-7'}`}>
                          <div
                            className={`p-5 rounded-xl border flex-1 flex flex-col ${
                              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'
                            }`}
                            data-testid="followup-response-editor-card"
                          >
                            {/* Workbench Header & Mode Switcher */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/60 gap-3 flex-wrap">
                              <div>
                                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                                  <Edit3 size={13} className="text-purple-400" />
                                  Your Architecture Solution & Whiteboard
                                </h4>
                                <span className="text-[10px] text-slate-400">
                                  Draft system components, streaming topologies, and written capacity math.
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Mode Switcher Pills */}
                                <div
                                  className={`p-0.5 rounded-lg border flex items-center gap-1 text-[11px] font-mono font-bold ${
                                    isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
                                  }`}
                                  data-testid="workbench-mode-switcher"
                                >
                                  <button
                                    type="button"
                                    onClick={() => setFollowUpWorkbenchMode('DIAGRAM')}
                                    data-testid="workbench-mode-diagram"
                                    title="Full diagram canvas"
                                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                                      followUpWorkbenchMode === 'DIAGRAM'
                                        ? isLight
                                          ? 'bg-white text-purple-700 shadow-xs'
                                          : 'bg-purple-900/60 text-purple-300 shadow-xs'
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                  >
                                    <Layout size={12} />
                                    <span>Diagram</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setFollowUpWorkbenchMode('SPLIT')}
                                    data-testid="workbench-mode-split"
                                    title="Side-by-side diagram & written response"
                                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                                      followUpWorkbenchMode === 'SPLIT'
                                        ? isLight
                                          ? 'bg-white text-purple-700 shadow-xs'
                                          : 'bg-purple-900/60 text-purple-300 shadow-xs'
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                  >
                                    <Columns size={12} />
                                    <span>Split</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setFollowUpWorkbenchMode('WRITTEN')}
                                    data-testid="workbench-mode-written"
                                    title="Full written response text editor"
                                    className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                                      followUpWorkbenchMode === 'WRITTEN'
                                        ? isLight
                                          ? 'bg-white text-purple-700 shadow-xs'
                                          : 'bg-purple-900/60 text-purple-300 shadow-xs'
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                  >
                                    <Edit3 size={12} />
                                    <span>Written</span>
                                  </button>
                                </div>

                                {/* Status / Score Indicator */}
                                {gradingEvaluation ? (
                                  <span
                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                    data-testid="current-followup-score-badge"
                                  >
                                    Score: {gradingEvaluation.score}/100
                                  </span>
                                ) : followUpSavedSuccess ? (
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                                    <Check size={11} /> Saved
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono text-slate-500">
                                    {followUpResponseText.length} chars
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* WORKBENCH BODY: MODE-DRIVEN RENDERING */}
                            <div className="flex-1 flex flex-col space-y-4">
                              {/* DIAGRAM ONLY MODE */}
                              {followUpWorkbenchMode === 'DIAGRAM' && (
                                <div className="space-y-2">
                                  <ExcalidrawCanvas
                                    initialData={followUpDiagramData}
                                    onChange={setFollowUpDiagramData}
                                    isLight={isLight}
                                    height="540px"
                                  />
                                </div>
                              )}

                              {/* WRITTEN ONLY MODE */}
                              {followUpWorkbenchMode === 'WRITTEN' && (
                                <textarea
                                  value={followUpResponseText}
                                  onChange={(e) => setFollowUpResponseText(e.target.value)}
                                  placeholder={`# High-Level Architecture\n\n### 1. Ingestion & Partitioning\n- Kafka partitions keyed by WatershedID...\n\n### 2. Stream Processing Topology\n- Apache Flink stateful tumbling windows...\n\n### 3. Fault Tolerance & Out-of-Order Events\n- RocksDB checkpoints + watermark heuristics...`}
                                  data-testid="followup-response-textarea"
                                  className={`w-full flex-1 min-h-[460px] p-4 rounded-lg font-mono text-xs leading-relaxed resize-y focus:outline-none focus:ring-1 ${
                                    isLight
                                      ? 'bg-slate-50 border border-slate-200 text-slate-900 focus:ring-purple-500'
                                      : 'bg-slate-950/80 border border-slate-800 text-slate-100 focus:ring-purple-400'
                                  }`}
                                />
                              )}

                              {/* SPLIT VIEW MODE (DEFAULT) */}
                              {followUpWorkbenchMode === 'SPLIT' && (
                                <div className="space-y-4 flex flex-col">
                                  <div>
                                    <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                                      <span className="flex items-center gap-1.5">
                                        <Layers size={13} className="text-purple-400" />
                                        Visual Architecture Whiteboard
                                      </span>
                                      <span className="text-[10px] text-slate-500 lowercase">
                                        drag, connect, or use quick presets
                                      </span>
                                    </div>
                                    <ExcalidrawCanvas
                                      initialData={followUpDiagramData}
                                      onChange={setFollowUpDiagramData}
                                      isLight={isLight}
                                      height="380px"
                                    />
                                  </div>

                                  <div className="flex flex-col flex-1">
                                    <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                                      <Edit3 size={13} className="text-purple-400" />
                                      Written Specifications & Capacity Math
                                    </div>
                                    <textarea
                                      value={followUpResponseText}
                                      onChange={(e) => setFollowUpResponseText(e.target.value)}
                                      placeholder={`# High-Level Architecture\n\n### 1. Ingestion & Partitioning\n- Kafka partitions keyed by WatershedID...\n\n### 2. Stream Processing Topology\n- Apache Flink stateful tumbling windows...\n\n### 3. Fault Tolerance & Out-of-Order Events\n- RocksDB checkpoints + watermark heuristics...`}
                                      data-testid="followup-response-textarea"
                                      className={`w-full p-4 rounded-lg font-mono text-xs leading-relaxed min-h-[220px] resize-y focus:outline-none focus:ring-1 ${
                                        isLight
                                          ? 'bg-slate-50 border border-slate-200 text-slate-900 focus:ring-purple-500'
                                          : 'bg-slate-950/80 border border-slate-800 text-slate-100 focus:ring-purple-400'
                                      }`}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* WORKBENCH FOOTER & ACTION BUTTONS */}
                            <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800/60 flex-wrap gap-3">
                              <span className="text-[10px] text-slate-400 font-mono">
                                Markdown syntax and visual Excalidraw topology synchronized
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={handleSaveFollowUpResponse}
                                  disabled={isSavingFollowUp || isGradingFollowUp}
                                  data-testid="save-followup-response-btn"
                                  className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all border ${
                                    isLight
                                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                                  }`}
                                >
                                  {isSavingFollowUp ? (
                                    <>
                                      <Loader2 size={13} className="animate-spin" />
                                      <span>Saving...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Save size={13} />
                                      <span>Save Architecture Draft</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={handleGradeArchitecture}
                                  disabled={isGradingFollowUp || isSavingFollowUp}
                                  data-testid="grade-architecture-btn"
                                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border ${
                                    isGradingFollowUp
                                      ? 'bg-purple-900/60 border-purple-500 text-purple-200 cursor-not-allowed'
                                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-purple-400/30 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                                  }`}
                                >
                                  {isGradingFollowUp ? (
                                    <>
                                      <Loader2 size={13} className="animate-spin text-purple-300" />
                                      <span>Grading Architecture...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Bot size={14} className="text-purple-200" />
                                      <span>Grade Architecture with AI</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* INTERACTIVE AI GRADING REPORT CARD */}
                          {gradingEvaluation && (
                            <div
                              className={`p-6 rounded-xl border space-y-5 transition-all ${
                                isLight
                                  ? 'bg-purple-50/50 border-purple-200 shadow-sm'
                                  : 'bg-[#0f1424] border-purple-900/60 shadow-[0_0_30px_rgba(168,85,247,0.15)]'
                              }`}
                              data-testid="system-design-grading-report"
                            >
                              {/* Overall Evaluation Header */}
                              <div className="flex items-start justify-between pb-4 border-b border-purple-800/30 gap-4 flex-wrap">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center">
                                    <Bot size={22} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-sm font-bold text-slate-100">
                                        Staff+ AI Architectural Review & Bar Raiser Report
                                      </h4>
                                      <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                        Verified Rubric
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      Evaluation computed across visual whiteboard diagram elements, component boundaries, and written capacity math.
                                    </p>
                                  </div>
                                </div>

                                {/* Overall Score Badge */}
                                <div
                                  className={`px-4 py-2 rounded-xl border flex flex-col items-center justify-center ${
                                    gradingEvaluation.score >= 85
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                      : gradingEvaluation.score >= 70
                                      ? 'bg-purple-500/10 text-purple-300 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                  }`}
                                  data-testid="grading-overall-score"
                                >
                                  <span className="text-[10px] uppercase font-bold font-mono tracking-wider text-slate-400">
                                    Overall Score
                                  </span>
                                  <span className="text-2xl font-black font-mono">
                                    {gradingEvaluation.score} / 100
                                  </span>
                                  <span className="text-[9px] font-bold uppercase tracking-tight">
                                    {gradingEvaluation.score >= 85
                                      ? 'Exceeds Bar (Staff)'
                                      : gradingEvaluation.score >= 70
                                      ? 'Meets Bar (Senior)'
                                      : 'Revisions Needed'}
                                  </span>
                                </div>
                              </div>

                              {/* Rubric Breakdown Grid */}
                              {gradingEvaluation.rubricScores && Object.keys(gradingEvaluation.rubricScores).length > 0 && (
                                <div className="space-y-2.5" data-testid="grading-rubric-breakdown">
                                  <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <Award size={13} className="text-amber-400" />
                                    Rubric Criteria Breakdown
                                  </h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {Object.entries(gradingEvaluation.rubricScores).map(([key, item]) => {
                                      const pct = item.maxWeight > 0 ? Math.round((item.score / item.maxWeight) * 100) : 0;
                                      return (
                                        <div
                                          key={key}
                                          className={`p-3 rounded-lg border flex flex-col justify-between ${
                                            isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
                                          }`}
                                        >
                                          <div>
                                            <div className="flex items-center justify-between text-xs mb-1">
                                              <span className="font-semibold capitalize text-slate-200">
                                                {key.replace(/_/g, ' ')}
                                              </span>
                                              <span className="font-mono font-bold text-purple-400">
                                                {item.score} / {item.maxWeight}
                                              </span>
                                            </div>
                                            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mb-2">
                                              <div
                                                className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 rounded-full"
                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                              />
                                            </div>
                                          </div>
                                          <p className="text-[11px] text-slate-400 leading-tight">
                                            {item.feedback}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Scalability Assessment Card */}
                              {gradingEvaluation.scalabilityAssessment && (
                                <div
                                  className={`p-4 rounded-lg border ${
                                    isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900/60 border-slate-800 text-slate-300'
                                  }`}
                                  data-testid="grading-scalability-assessment"
                                >
                                  <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1.5">
                                    <TrendingUp size={14} />
                                    Scalability & Throughput Assessment
                                  </h5>
                                  <p className="text-xs leading-relaxed font-sans">
                                    {gradingEvaluation.scalabilityAssessment}
                                  </p>
                                </div>
                              )}

                              {/* Single Points of Failure (SPOFs) */}
                              {gradingEvaluation.singlePointsOfFailure && gradingEvaluation.singlePointsOfFailure.length > 0 && (
                                <div
                                  className={`p-4 rounded-lg border ${
                                    isLight ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-rose-950/20 border-rose-900/50 text-rose-200'
                                  }`}
                                  data-testid="grading-spofs-container"
                                >
                                  <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 mb-2 flex items-center gap-1.5">
                                    <AlertTriangle size={14} />
                                    Single Points of Failure (SPOFs) Identified ({gradingEvaluation.singlePointsOfFailure.length})
                                  </h5>
                                  <ul className="space-y-1.5 text-xs">
                                    {gradingEvaluation.singlePointsOfFailure.map((spof, idx) => (
                                      <li key={idx} className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                                        <span>{spof}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Trade-Off Critique */}
                              {gradingEvaluation.tradeOffCritique && (
                                <div
                                  className={`p-4 rounded-lg border ${
                                    isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900/60 border-slate-800 text-slate-300'
                                  }`}
                                  data-testid="grading-tradeoffs-critique"
                                >
                                  <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400 mb-1.5 flex items-center gap-1.5">
                                    <Layers size={14} />
                                    Distributed Systems Trade-Off Critique
                                  </h5>
                                  <p className="text-xs leading-relaxed font-sans">
                                    {gradingEvaluation.tradeOffCritique}
                                  </p>
                                </div>
                              )}

                              {/* Actionable Staff-Level Improvements */}
                              {gradingEvaluation.actionableImprovements && gradingEvaluation.actionableImprovements.length > 0 && (
                                <div
                                  className={`p-4 rounded-lg border ${
                                    isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-950/20 border-amber-900/50 text-amber-200'
                                  }`}
                                  data-testid="grading-improvements-container"
                                >
                                  <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                                    <Sparkles size={14} />
                                    Staff+ Architectural Recommendations ({gradingEvaluation.actionableImprovements.length})
                                  </h5>
                                  <div className="space-y-2 text-xs">
                                    {gradingEvaluation.actionableImprovements.map((imp, idx) => (
                                      <div key={idx} className="flex items-start gap-2">
                                        <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                          {idx + 1}
                                        </span>
                                        <span className="leading-relaxed">{imp}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* SUBMISSION RESULT MODAL OVERLAY */}
        {isSubmissionModalOpen && submissionResult && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            data-testid="submission-result-modal-backdrop"
            onClick={() => setIsSubmissionModalOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              data-testid="submission-result-modal"
              className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0b101e] border-slate-700/80 text-slate-100'
              } ${
                submissionResult.status === 'ACCEPTED'
                  ? 'shadow-[0_0_40px_rgba(16,185,129,0.2)]'
                  : 'shadow-[0_0_40px_rgba(244,63,94,0.2)]'
              }`}
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      submissionResult.status === 'ACCEPTED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : submissionResult.status === 'WRONG_ANSWER'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}
                  >
                    {submissionResult.status === 'ACCEPTED' ? (
                      <Trophy size={20} className="stroke-[2.5]" />
                    ) : submissionResult.status === 'WRONG_ANSWER' ? (
                      <XCircle size={20} className="stroke-[2.5]" />
                    ) : (
                      <AlertOctagon size={20} className="stroke-[2.5]" />
                    )}
                  </div>
                  <div>
                    <h3
                      data-testid="submission-verdict-title"
                      className={`text-xl font-black font-mono tracking-tight ${
                        submissionResult.status === 'ACCEPTED'
                          ? 'text-emerald-400'
                          : submissionResult.status === 'WRONG_ANSWER'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {submissionResult.status === 'ACCEPTED'
                        ? 'Accepted'
                        : submissionResult.status === 'WRONG_ANSWER'
                        ? 'Wrong Answer'
                        : submissionResult.status.replace('_', ' ')}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {submissionResult.status === 'ACCEPTED'
                        ? `All ${submissionResult.totalCount} test cases passed!`
                        : `${submissionResult.passedCount} / ${submissionResult.totalCount} test cases passed.`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSubmissionModalOpen(false)}
                  data-testid="close-submission-modal-btn"
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Metrics Cards */}
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div
                    className={`p-3 rounded-xl border text-center ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Runtime</span>
                    <span data-testid="submission-runtime-stat" className="text-base font-mono font-bold text-sky-400">
                      {submissionResult.runtimeMs} ms
                    </span>
                    <span className="block text-[9px] text-emerald-400 mt-0.5 font-sans">Beats 94.2%</span>
                  </div>

                  <div
                    className={`p-3 rounded-xl border text-center ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Memory</span>
                    <span data-testid="submission-memory-stat" className="text-base font-mono font-bold text-purple-400">
                      {(submissionResult.memoryKb / 1024).toFixed(1)} MB
                    </span>
                    <span className="block text-[9px] text-sky-400 mt-0.5 font-sans">Beats 86.5%</span>
                  </div>

                  <div
                    className={`p-3 rounded-xl border text-center ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Testcases</span>
                    <span data-testid="submission-passed-stat" className="text-base font-mono font-bold text-emerald-400">
                      {submissionResult.passedCount} / {submissionResult.totalCount}
                    </span>
                    <span className="block text-[9px] text-slate-400 mt-0.5 font-sans">
                      {Math.round((submissionResult.passedCount / Math.max(1, submissionResult.totalCount)) * 100)}% Passed
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-xl border text-center ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Language</span>
                    <span data-testid="submission-language-stat" className="text-base font-mono font-bold text-amber-400 uppercase">
                      {submissionResult.language}
                    </span>
                    <span className="block text-[9px] text-slate-400 mt-0.5 font-sans">Verified</span>
                  </div>
                </div>

                {/* Failed Test Case Details (if Wrong Answer or Error) */}
                {submissionResult.failedTestCase && (
                  <div
                    className={`p-4 rounded-xl border space-y-3 ${
                      isLight ? 'bg-rose-50/50 border-rose-200' : 'bg-rose-950/20 border-rose-900/60'
                    }`}
                    data-testid="submission-failed-panel"
                  >
                    <div className="flex items-center gap-2">
                      <AlertOctagon size={14} className="text-rose-400" />
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400">
                        Failing Test Case Details
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                      <div
                        className={`p-2.5 rounded border ${
                          isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Input:</span>
                        <pre data-testid="submission-failed-input" className="text-slate-200 whitespace-pre-wrap">
                          {formatValue(submissionResult.failedTestCase.input)}
                        </pre>
                      </div>

                      <div
                        className={`p-2.5 rounded border ${
                          isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Expected Output:</span>
                        <pre data-testid="submission-failed-expected" className="text-emerald-400 font-bold whitespace-pre-wrap">
                          {formatValue(submissionResult.failedTestCase.expected)}
                        </pre>
                      </div>
                    </div>

                    <div
                      className={`p-2.5 rounded border ${
                        isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Your Output:</span>
                      <pre data-testid="submission-failed-actual" className="text-rose-400 font-bold whitespace-pre-wrap">
                        {formatValue(submissionResult.failedTestCase.actual)}
                      </pre>
                    </div>

                    {submissionResult.failedTestCase.error && (
                      <div
                        className={`p-2.5 rounded border ${
                          isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <span className="block text-[10px] uppercase font-bold text-rose-400 mb-1">Error Traceback:</span>
                        <pre data-testid="submission-failed-error" className="text-rose-300 whitespace-pre-wrap">
                          {submissionResult.failedTestCase.error}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Standard Output (stdout) */}
                {submissionResult.stdout && (
                  <div
                    className={`p-3.5 rounded-xl border space-y-1.5 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <span className="block text-[10px] uppercase font-mono font-bold text-slate-400">
                      Standard Output (stdout):
                    </span>
                    <pre
                      data-testid="submission-stdout-display"
                      className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap"
                    >
                      {submissionResult.stdout}
                    </pre>
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div
                className={`px-6 py-4 border-t flex items-center justify-between gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmissionModalOpen(false);
                    setActiveTab('SUBMISSIONS');
                    fetchProblemSubmissions(activeProblem.id);
                  }}
                  data-testid="view-all-submissions-btn"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase transition-all text-sky-400 hover:text-sky-300 cursor-pointer"
                >
                  View All Submissions &rarr;
                </button>

                <button
                  type="button"
                  onClick={() => setIsSubmissionModalOpen(false)}
                  data-testid="back-to-code-btn"
                  className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-sky-600 hover:bg-sky-500 text-white shadow-md cursor-pointer"
                >
                  Back to Code
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
