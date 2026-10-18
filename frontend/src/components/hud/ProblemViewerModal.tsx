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
  Maximize2
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useStore } from '../../store/useStore';
import { getCategoryShade, getDomainBaseColor } from '../../utils/theme';
import { MarkdownContent } from './MarkdownContent';
import { QuizViewer } from './QuizViewer';
import { ProblemDifficulty, ProblemType, TopicNode, ProblemItem, DomainCategory } from '../../types/telemetry';

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

  const [activeTab, setActiveTab] = useState<'PROMPT' | 'SOLUTION' | 'QUIZ'>('PROMPT');
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [copiedStarter, setCopiedStarter] = useState(false);
  const [userCodeByLang, setUserCodeByLang] = useState<Record<string, string>>({});
  const [editorFontSize, setEditorFontSize] = useState<number>(13);
  const [workbenchLayout, setWorkbenchLayout] = useState<'split' | 'full'>('split');
  const [copiedEditorCode, setCopiedEditorCode] = useState<boolean>(false);
  const bodyRef = useRef<HTMLDivElement>(null);

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
    }
  }, [activeProblem?.id]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [activeTab, activeProblem?.id]);

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

              <button
                onClick={() => setActiveTab('SOLUTION')}
                data-testid="problem-tab-solution"
                className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'SOLUTION'
                    ? isLight
                      ? 'border-sky-600 text-sky-600'
                      : 'border-[#00f0ff] text-[#00f0ff]'
                    : isLight
                    ? 'border-transparent text-slate-500 hover:text-slate-800'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
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
                ? 'overflow-hidden p-4 lg:p-6'
                : 'overflow-y-auto p-6 space-y-6'
            }`}
          >
            {/* TAB 1: PROMPT */}
            {activeTab === 'PROMPT' && (
              <div
                className={
                  workbenchLayout === 'split' && !isEditing
                    ? 'h-full flex flex-col lg:flex-row gap-6'
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
                          onClick={() => setActiveTab('SOLUTION')}
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
                      className={`w-full lg:w-1/2 h-full flex flex-col rounded-xl border overflow-hidden shadow-xl ${
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
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[calc(100%-250px)] py-0.5">
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
                      <div className="flex-1 min-h-[350px] relative bg-slate-950/20" data-testid="monaco-editor-container">
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
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border cursor-pointer ${
                              isLight
                                ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-500'
                            }`}
                            title="Run code against sample test cases (Step 3 WASM runner)"
                          >
                            <Play size={13} className={isLight ? 'text-sky-600 fill-sky-600' : 'text-sky-400 fill-sky-400'} />
                            <span>Run Code</span>
                          </button>

                          <button
                            type="button"
                            data-testid="submit-solution-btn"
                            className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md font-sans cursor-pointer"
                            title="Submit code against all test cases (Step 4 Judge)"
                          >
                            <Check size={14} className="stroke-[2.5]" />
                            <span>Submit</span>
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
                        onClick={() => setActiveTab('SOLUTION')}
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
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
