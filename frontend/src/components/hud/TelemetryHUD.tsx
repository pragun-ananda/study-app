import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  Square,
  BookOpen,
  Plus,
  Trash2,
  Award,
  ChevronLeft,
  ChevronRight,
  Eye,
  Target,
  Search,
  Compass,
  ArrowRight,
  ShieldAlert,
  Zap,
  X,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sun,
  Moon
} from 'lucide-react';
import NoteViewerModal from './NoteViewerModal';
import NotificationsDropdown from './NotificationsDropdown';
import DiffViewerModal from './DiffViewerModal';
import IngestionWalkthroughModal from './IngestionWalkthroughModal';
import { useStore } from '../../store/useStore';
import { TopicNode, DomainCategory, TodoPriority } from '../../types/telemetry';
import { DOMAIN_BASE_COLORS, DOMAIN_LIGHT_COLORS, getCategoryShade } from '../../utils/theme';
import { getTopologicalPrerequisites } from '../../utils/graph';

export default function TelemetryHUD() {
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);
  const isLight = theme === 'light';

  const hudVisible = useStore((state) => state.hudVisible);
  const setHudVisibility = useStore((state) => state.setHudVisibility);
  const selectedCategory = useStore((state) => state.selectedCategory);
  const setSelectedCategory = useStore((state) => state.setSelectedCategory);
  const searchQuery = useStore((state) => state.searchQuery);
  const setSearchQuery = useStore((state) => state.setSearchQuery);
  const isSearchOpen = useStore((state) => state.isSearchOpen);
  const setIsSearchOpen = useStore((state) => state.setIsSearchOpen);
  const isSidebarOpen = useStore((state) => state.isSidebarOpen);
  const setIsSidebarOpen = useStore((state) => state.setIsSidebarOpen);
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const topicNodes = useStore((state) => state.topicNodes);

  const selectedTopicId = useStore((state) => state.selectedTopicId);
  const setSelectedTopicId = useStore((state) => state.setSelectedTopicId);
  const isInspectorOpen = useStore((state) => state.isInspectorOpen);
  const setIsInspectorOpen = useStore((state) => state.setIsInspectorOpen);
  const setActiveNote = useStore((state) => state.setActiveNote);
  const setActiveQuiz = useStore((state) => state.setActiveQuiz);
  const updateTopicMastery = useStore((state) => state.updateTopicMastery);
  const todos = useStore((state) => state.todos);
  const addTodo = useStore((state) => state.addTodo);
  const toggleTodo = useStore((state) => state.toggleTodo);
  const deleteTodo = useStore((state) => state.deleteTodo);

  // Ingestion State & Actions
  const ingestUrl = useStore((state) => state.ingestUrl);
  const isIngesting = useStore((state) => state.isIngesting);
  const ingestError = useStore((state) => state.ingestError);

  const [activeTab, setActiveTab] = useState<'TOPICS' | 'TODOS'>('TOPICS');
  const [isSubgraphsOpen, setIsSubgraphsOpen] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoCategory, setNewTodoCategory] = useState<DomainCategory>('AI & ML');
  const [newTodoPriority, setNewTodoPriority] = useState<TodoPriority>('HIGH');

  // URL Ingest Plus-Icon Textbox State
  const [isUrlInputOpen, setIsUrlInputOpen] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [ingestSuccessMsg, setIngestSuccessMsg] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLDivElement>(null);

  // Click outside and Escape key handler for URL input
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (urlInputRef.current && !urlInputRef.current.contains(event.target as Node)) {
        setIsUrlInputOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isUrlInputOpen) {
        setIsUrlInputOpen(false);
      }
    };
    if (isUrlInputOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUrlInputOpen]);

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = inputUrl.trim();
    if (!url || isIngesting) return;

    try {
      setIngestSuccessMsg(null);
      await ingestUrl(url);
      setIngestSuccessMsg('Content staged to review queue!');
      setInputUrl('');
      setTimeout(() => {
        setIngestSuccessMsg(null);
        setIsUrlInputOpen(false);
      }, 2000);
    } catch {
      // Error is tracked in ingestError state
    }
  };

  // Auto expand panel when search is opened
  React.useEffect(() => {
    if (isSearchOpen) {
      setIsSidebarOpen(true);
      setActiveTab('TOPICS');
    }
  }, [isSearchOpen, setIsSidebarOpen]);


  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;
    addTodo({
      title: newTodoTitle.trim(),
      category: newTodoCategory,
      priority: newTodoPriority,
      completed: false,
      dueDate: 'Today'
    });
    setNewTodoTitle('');
  };

  const categories = ['ALL', 'AI & ML', 'CS', 'SYSTEMS', 'MATH', 'PHYSICS', 'CYBERSECURITY', 'ARCH'];
  const completedTodosCount = todos.filter((t) => t.completed).length;
  const selectedNode = topicNodes.find((n) => n.id === selectedTopicId);
  const selectedNodeColor = selectedNode
    ? getCategoryShade(selectedNode.id, selectedNode.category, theme)
    : (isLight ? '#0284c7' : '#00f0ff');
  const topologicalPrereqs = useMemo(
    () => (selectedNode ? getTopologicalPrerequisites(selectedNode.id, topicNodes) : []),
    [selectedNode?.id, topicNodes]
  );

  // Dynamic Mastery Score calculated per active Subgraph
  const activeSubgraphNodes = selectedCategory && selectedCategory !== 'ALL'
    ? topicNodes.filter((n) => n.category === selectedCategory)
    : topicNodes;

  if (!hudVisible) {
    return (
      <div className="pointer-events-none fixed inset-0 z-20 flex items-bottom justify-end p-6">
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setHudVisibility(true)}
          className={`pointer-events-auto px-4 py-2 backdrop-blur-md border text-xs tracking-widest font-mono rounded transition-all flex items-center gap-2 shadow-lg ${
            isLight
              ? 'bg-white/90 border-sky-300 text-sky-700 hover:bg-sky-50'
              : 'bg-[#080c16]/90 border-[#00f0ff]/40 text-[#00f0ff] hover:bg-[#00f0ff]/10 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
          }`}
        >
          <Eye size={14} /> RESTORE HUD [H]
        </motion.button>
      </div>
    );
  }

  const currentMasteryScore = Math.round(
    activeSubgraphNodes.reduce((acc, curr) => acc + curr.mastery, 0) / (activeSubgraphNodes.length || 1)
  );

  const activeCategoryLabel = selectedCategory && selectedCategory !== 'ALL'
    ? `${selectedCategory} MASTERY`
    : 'MASTERY';

  const filteredTopics = topicNodes.filter((t) => {
    const categoryMatch = !selectedCategory || selectedCategory === 'ALL' || t.category === selectedCategory;
    const searchMatch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && searchMatch;
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 md:p-6 overflow-hidden">
      {/* ================= TRANSPARENT TOP SUBGRAPHS & SEARCH BAR ================= */}
      <header className="pointer-events-auto flex items-center justify-between gap-4 bg-transparent py-1 px-1">
        {/* 1. Collapsible Subgraphs Navigation Bar (Minimized by default) */}
        <div className={`flex items-center border rounded-lg p-1 text-xs flex-shrink-0 backdrop-blur-md ${
          isLight ? 'bg-white/85 border-slate-200 shadow-sm' : 'bg-[#080c16]/70 border-white/10'
        }`}>
          <AnimatePresence initial={false} mode="wait">
            {isSubgraphsOpen ? (
              <motion.div
                key="subgraphs-expanded"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full no-scrollbar px-1"
              >
                <span className={`font-bold items-center gap-1.5 mr-1 flex flex-shrink-0 text-[11px] ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}>
                  <Compass size={13} className={isLight ? 'text-sky-600' : 'text-[#00f0ff]'} /> SUBGRAPHS:
                </span>
                {categories.map((cat) => {
                  const isSelected = (cat === 'ALL' && !selectedCategory) || selectedCategory === cat;
                  const catColor = cat === 'ALL'
                    ? (isLight ? '#0284c7' : '#00f0ff')
                    : (isLight ? DOMAIN_LIGHT_COLORS[cat] || '#0284c7' : DOMAIN_BASE_COLORS[cat] || '#00f0ff');
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat === 'ALL' ? null : cat)}
                      style={{
                        backgroundColor: isSelected ? `${catColor}25` : undefined,
                        borderColor: isSelected ? catColor : undefined,
                        color: isSelected ? catColor : undefined,
                        boxShadow: isSelected ? `0 0 12px ${catColor}60` : undefined
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all border whitespace-nowrap flex-shrink-0 cursor-pointer ${
                        isSelected
                          ? ''
                          : isLight
                            ? 'bg-slate-100/80 text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300'
                            : 'bg-slate-950/60 text-slate-400 border-white/10 hover:text-slate-200 hover:border-white/25'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setIsSubgraphsOpen(false)}
                  className={`p-1 flex-shrink-0 ml-1 ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-slate-100'}`}
                  title="Minimize Subgraphs"
                >
                  <X size={13} />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="subgraphs-minimized"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={() => setIsSubgraphsOpen(true)}
                className={`px-2.5 py-1 transition-colors rounded flex items-center gap-2 font-bold text-[11px] ${
                  isLight ? 'text-slate-700 hover:text-sky-600' : 'text-slate-300 hover:text-[#00f0ff]'
                }`}
                title="Open Subgraphs filter"
              >
                <Compass size={14} className={isLight ? 'text-sky-600' : 'text-[#00f0ff]'} />
                <span>SUBGRAPHS</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold border ${
                  isLight
                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                    : 'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/30'
                }`}>
                  {selectedCategory || 'ALL'}
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* 2. Top Right Cluster: URL Ingest Button + Theme Toggle + Notifications Dropdown + Quick Search Bar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Plus icon to open URL Ingest Textbox */}
          <div className="relative" ref={urlInputRef}>
            <button
              type="button"
              onClick={() => setIsUrlInputOpen(!isUrlInputOpen)}
              className={`p-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                isUrlInputOpen
                  ? (isLight ? 'bg-sky-500/20 border-sky-500 text-sky-600 shadow-sm' : 'bg-[#00f0ff]/20 border-[#00f0ff] text-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.3)]')
                  : (isLight ? 'bg-white/85 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm' : 'bg-[#080c16]/70 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20')
              }`}
              title="Add content from URL (+)"
              aria-label="Add content from URL"
              data-testid="ingest-url-btn"
            >
              <Plus size={15} />
            </button>

            <AnimatePresence>
              {isUrlInputOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className={`absolute right-0 mt-2 w-80 md:w-96 p-3 rounded-xl backdrop-blur-xl z-50 flex flex-col gap-2 border ${
                    isLight
                      ? 'bg-white/95 border-slate-200 text-slate-900 shadow-xl'
                      : 'bg-[#080c16]/95 border-[#00f0ff]/30 text-slate-100 shadow-2xl'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold tracking-wider flex items-center gap-1.5 ${
                      isLight ? 'text-sky-600' : 'text-[#00f0ff]'
                    }`}>
                      <Plus size={13} /> INGEST FROM URL
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsUrlInputOpen(false)}
                      className={`p-0.5 rounded cursor-pointer ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
                      title="Close"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  <form onSubmit={handleIngestSubmit} className="flex flex-col gap-2">
                    <div className={`flex items-center gap-2 border rounded-lg px-2.5 py-1.5 transition-all ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 focus-within:border-sky-500'
                        : 'bg-slate-950/80 border-white/10 focus-within:border-[#00f0ff]/50'
                    }`}>
                      <input
                        type="url"
                        autoFocus
                        required
                        placeholder="https://example.com/article..."
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        disabled={isIngesting}
                        className={`bg-transparent font-sans text-xs focus:outline-none flex-1 min-w-0 ${
                          isLight ? 'text-slate-900 placeholder-slate-400' : 'text-slate-100 placeholder-slate-500'
                        }`}
                        data-testid="ingest-url-input"
                      />
                      <button
                        type="submit"
                        disabled={isIngesting || !inputUrl.trim()}
                        className={`px-2.5 py-1 rounded disabled:opacity-40 disabled:cursor-not-allowed font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer flex-shrink-0 border ${
                          isLight
                            ? 'bg-sky-500/15 border-sky-500/40 text-sky-600 hover:bg-sky-500/25'
                            : 'bg-[#00f0ff]/20 border-[#00f0ff]/40 text-[#00f0ff] hover:bg-[#00f0ff]/30'
                        }`}
                        data-testid="ingest-url-submit-btn"
                      >
                        {isIngesting ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>INGESTING...</span>
                          </>
                        ) : (
                          <>
                            <span>INGEST</span>
                          </>
                        )}
                      </button>
                    </div>

                    {ingestError && (
                      <div className={`text-[10px] rounded p-1.5 flex items-start gap-1 border ${
                        isLight
                          ? 'text-rose-600 bg-rose-50 border-rose-200'
                          : 'text-red-400 bg-red-950/40 border-red-500/30'
                      }`}>
                        <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                        <span>{ingestError}</span>
                      </div>
                    )}

                    {ingestSuccessMsg && (
                      <div className={`text-[10px] rounded p-1.5 flex items-center gap-1 border ${
                        isLight
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'
                      }`}>
                        <CheckCircle2 size={12} className="flex-shrink-0" />
                        <span>{ingestSuccessMsg}</span>
                      </div>
                    )}
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Light / Dark Mode Toggle Button */}
          <button
            type="button"
            onClick={() => toggleTheme()}
            className={`p-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
              isLight
                ? 'bg-white/85 border-slate-200 text-amber-500 hover:text-amber-600 hover:border-slate-300 shadow-sm'
                : 'bg-[#080c16]/70 border-white/10 text-slate-300 hover:text-[#00f0ff] hover:border-white/20'
            }`}
            title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode [T]`}
            aria-label={`Switch to ${isLight ? 'dark' : 'light'} mode`}
            data-testid="theme-toggle-btn"
          >
            {isLight ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <NotificationsDropdown />

          <div className={`flex items-center border rounded-lg p-1 text-xs flex-shrink-0 backdrop-blur-md ${
            isLight ? 'bg-white/85 border-slate-200' : 'bg-[#080c16]/70 border-white/10'
          }`}>
            <AnimatePresence initial={false} mode="wait">
              {isSearchOpen ? (
                <motion.div
                  key="search-expanded"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 px-1.5 py-0.5 overflow-hidden"
                >
                  <Search size={14} className={isLight ? 'text-sky-600 flex-shrink-0' : 'text-[#00f0ff] flex-shrink-0'} />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search 220+ concepts..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (!isSidebarOpen) {
                        setIsSidebarOpen(true);
                      }
                      if (activeTab !== 'TOPICS') {
                        setActiveTab('TOPICS');
                      }
                    }}
                    className={`bg-transparent font-sans text-xs focus:outline-none w-36 md:w-48 ${
                      isLight ? 'text-slate-900 placeholder-slate-400' : 'text-slate-100 placeholder-slate-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchOpen(false);
                      setIsSidebarOpen(false);
                    }}
                    className={`p-0.5 flex-shrink-0 ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-slate-100'}`}
                    title="Close search"
                  >
                    <X size={13} />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="search-icon"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  onClick={() => {
                    setIsSearchOpen(true);
                    setIsSidebarOpen(true);
                    setActiveTab('TOPICS');
                  }}
                  className={`p-1 transition-colors rounded flex items-center gap-1.5 ${
                    isLight ? 'text-slate-500 hover:text-sky-600' : 'text-slate-400 hover:text-[#00f0ff]'
                  }`}
                  title="Open concept search"
                >
                  <Search size={15} />
                  {searchQuery && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-sky-600' : 'bg-[#00f0ff]'}`} />
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ================= MIDDLE REGION (SIDEBAR & INSPECTOR) ================= */}
      <main className="flex-1 flex justify-between items-start my-2 pointer-events-none overflow-hidden relative">
        {/* Left Study Sidebar */}
        <motion.div
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          onWheel={(e) => e.stopPropagation()}
          className={`pointer-events-auto glass-panel rounded-xl p-4 transition-all duration-300 relative flex flex-col max-h-[calc(100vh-180px)] ${
            isSidebarOpen ? 'w-80 md:w-96' : 'w-12'
          }`}
        >
          <button
            onClick={() => toggleSidebar()}
            aria-label="Toggle study panel"
            className={`absolute -right-3 top-4 border p-1 rounded-full transition-colors z-30 ${
              isLight
                ? 'bg-white border-slate-300 text-slate-600 hover:text-sky-600 shadow-sm'
                : 'bg-[#080c16] border-white/20 text-slate-300 hover:text-[#00f0ff]'
            }`}
          >
            {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>

          {isSidebarOpen ? (
            <div className="flex flex-col h-full space-y-4 overflow-hidden">

              <div className={`flex items-center justify-between border-b pb-2 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                <div className={`flex items-center gap-1 p-1 rounded-lg ${isLight ? 'bg-slate-200/70' : 'bg-slate-950/60'}`}>
                  <button
                    onClick={() => setActiveTab('TOPICS')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeTab === 'TOPICS'
                        ? (isLight ? 'bg-sky-600 text-white shadow-sm' : 'bg-[#00f0ff] text-slate-950 shadow-[0_0_10px_rgba(0,240,255,0.3)]')
                        : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')
                    }`}
                  >
                    <BookOpen size={13} /> GRAPH NODES ({filteredTopics.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('TODOS')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeTab === 'TODOS'
                        ? (isLight ? 'bg-sky-600 text-white shadow-sm' : 'bg-[#00f0ff] text-slate-950 shadow-[0_0_10px_rgba(0,240,255,0.3)]')
                        : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')
                    }`}
                  >
                    <CheckSquare size={13} /> TASKS ({completedTodosCount}/{todos.length})
                  </button>
                </div>
              </div>

              {/* TAB 1: 200+ TOPICS GRAPH LIST */}
              {activeTab === 'TOPICS' && (
                <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                  <div className={`flex justify-between items-center text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    <span>Click any node title to focus camera:</span>
                    <span className={`font-bold ${isLight ? 'text-sky-600' : 'text-[#00f0ff]'}`}>{filteredTopics.length} Nodes</span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1.5 pb-6 overscroll-contain" onWheel={(e) => e.stopPropagation()}>
                    {filteredTopics.map((topic) => (
                      <div
                        key={topic.id}
                        data-testid="sidebar-topic-card"
                        onClick={() => setSelectedTopicId(topic.id)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          selectedTopicId === topic.id
                            ? (isLight ? 'border-sky-500 bg-sky-50 shadow-sm' : 'border-[#00f0ff] bg-[#00f0ff]/15 shadow-[0_0_12px_rgba(0,240,255,0.25)]')
                            : (isLight ? 'border-slate-200 bg-white/90 hover:border-slate-300 shadow-sm' : 'border-white/10 bg-slate-950/70 hover:border-white/20')
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`font-sans font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{topic.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            topic.status === 'MASTERED'
                              ? (isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-[#00ff9d]/20 text-[#00ff9d]')
                              : topic.status === 'LEARNING'
                              ? (isLight ? 'bg-sky-100 text-sky-700' : 'bg-[#00f0ff]/20 text-[#00f0ff]')
                              : topic.status === 'DUE'
                              ? (isLight ? 'bg-amber-100 text-amber-700' : 'bg-[#ffaa00]/20 text-[#ffaa00]')
                              : (isLight ? 'bg-rose-100 text-rose-700' : 'bg-[#ff3366]/20 text-[#ff3366]')
                          }`}>
                            {topic.status}
                          </span>
                        </div>

                        <div className="mt-1.5">
                          <div className={`flex justify-between text-[10px] mb-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            <span>{topic.category}</span>
                            <span className={`font-bold ${isLight ? 'text-sky-600' : 'text-[#00f0ff]'}`}>{topic.mastery}% Mastery</span>
                          </div>
                          <div className={`w-full rounded-full h-1 overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-900'}`}>
                            <div
                              className={`h-full transition-all duration-300 ${isLight ? 'bg-sky-500' : 'bg-[#00f0ff]'}`}
                              style={{ width: `${topic.mastery}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="h-10 w-full flex-shrink-0 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* TAB 2: TODAY'S TO-DO LIST */}
              {activeTab === 'TODOS' && (
                <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                  <form onSubmit={handleAddTodo} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add new study goal..."
                      value={newTodoTitle}
                      onChange={(e) => setNewTodoTitle(e.target.value)}
                      className={`flex-1 border rounded px-2.5 py-1.5 text-xs focus:outline-none transition-colors ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-500'
                          : 'bg-slate-950/80 border-white/10 text-slate-100 placeholder-slate-500 focus:border-[#00f0ff]'
                      }`}
                    />
                    <button
                      type="submit"
                      className={`p-1.5 rounded transition-colors ${
                        isLight
                          ? 'bg-sky-600 text-white hover:bg-sky-700'
                          : 'bg-[#00f0ff] text-slate-950 hover:bg-[#00f0ff]/80'
                      }`}
                    >
                      <Plus size={16} />
                    </button>
                  </form>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1.5 pb-6 overscroll-contain" onWheel={(e) => e.stopPropagation()}>
                    {todos.map((todo) => (
                      <div
                        key={todo.id}
                        data-testid="sidebar-todo-item"
                        className={`p-2.5 rounded-lg border text-xs transition-all flex items-start justify-between gap-2 ${
                          todo.completed
                            ? (isLight ? 'bg-slate-100/70 border-slate-200 opacity-60' : 'bg-slate-950/30 border-white/5 opacity-60')
                            : (isLight ? 'bg-white/95 border-slate-200 hover:border-sky-300 text-slate-800 shadow-sm' : 'bg-slate-950/70 border-white/10 hover:border-[#00f0ff]/40')
                        }`}
                      >
                        <div className="flex items-start gap-2 flex-1">
                          <button
                            type="button"
                            onClick={() => toggleTodo(todo.id)}
                            className={`mt-0.5 transition-colors ${isLight ? 'text-slate-400 hover:text-sky-600' : 'text-slate-400 hover:text-[#00f0ff]'}`}
                          >
                            {todo.completed ? (
                              <CheckSquare size={15} className={isLight ? 'text-emerald-600' : 'text-[#00ff9d]'} />
                            ) : (
                              <Square size={15} />
                            )}
                          </button>
                          <div>
                            <p className={`font-semibold ${
                              todo.completed
                                ? (isLight ? 'text-slate-400 line-through' : 'text-slate-500 line-through')
                                : (isLight ? 'text-slate-800' : 'text-slate-200')
                            }`}>
                              {todo.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px]">
                              <span className={isLight ? 'text-sky-600 font-medium' : 'text-[#00f0ff]'}>{todo.category}</span>
                              <span className={`px-1 rounded font-bold ${
                                todo.priority === 'HIGH'
                                  ? (isLight ? 'bg-rose-100 text-rose-700' : 'bg-[#ff3366]/20 text-[#ff3366]')
                                  : todo.priority === 'MEDIUM'
                                  ? (isLight ? 'bg-amber-100 text-amber-700' : 'bg-[#ffaa00]/20 text-[#ffaa00]')
                                  : (isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-slate-400')
                              }`}>
                                {todo.priority}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <div className="h-10 w-full flex-shrink-0 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4 text-slate-400">
              <BookOpen size={18} />
              <CheckSquare size={18} />
            </div>
          )}
        </motion.div>

        {/* Floating "EXPLORE" Action Button on the Bottom Right of the Screen */}
        <AnimatePresence>
          {selectedNode && !isInspectorOpen && (
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.9 }}
              className="pointer-events-auto fixed bottom-6 right-6 z-30"
            >
              <button
                data-testid="explore-topic-btn"
                onClick={() => setIsInspectorOpen(true)}
                style={{
                  borderColor: selectedNodeColor,
                  boxShadow: isLight ? `0 4px 20px rgba(0,0,0,0.12)` : `0 0 24px ${selectedNodeColor}50`,
                  backgroundColor: isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(8, 12, 22, 0.92)'
                }}
                className={`px-5 py-3 rounded-xl border font-sans text-xs font-bold tracking-wider hover:scale-105 transition-all flex items-center gap-3 backdrop-blur-md shadow-2xl cursor-pointer ${
                  isLight ? 'text-slate-800' : 'text-slate-100'
                }`}
              >
                <BookOpen size={16} style={{ color: selectedNodeColor }} />
                <span>EXPLORE:</span>
                <span className="uppercase font-sans font-bold" style={{ color: selectedNodeColor }}>
                  {selectedNode.name}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                    isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/80 border-white/10'
                  }`}
                  style={{ color: selectedNodeColor }}
                >
                  {selectedNode.mastery}%
                </span>
                <span className="text-sm font-bold" style={{ color: selectedNodeColor }}>→</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Selected Knowledge Concept Inspector Card (Opens on EXPLORE click) */}
        <AnimatePresence>
          {selectedNode && isInspectorOpen && (
            <motion.div
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              onWheel={(e) => e.stopPropagation()}
              className="pointer-events-auto glass-panel p-4 md:p-5 rounded-xl w-80 md:w-96 text-xs space-y-3.5 mr-6 max-h-[calc(100vh-140px)] flex flex-col shadow-2xl overscroll-contain"
            >
              {/* Fixed Header */}
              <div className={`flex items-center justify-between border-b pb-2.5 flex-shrink-0 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                <div className="flex items-center gap-2">
                  <Target size={15} className={isLight ? 'text-sky-600' : 'text-[#00f0ff]'} />
                  <span className={`font-sans font-bold uppercase tracking-wider truncate max-w-[220px] ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    {selectedNode.name}
                  </span>
                </div>
                <button
                  onClick={() => setIsInspectorOpen(false)}
                  className={`p-1 font-bold ${isLight ? 'text-slate-400 hover:text-slate-800' : 'text-slate-400 hover:text-slate-100'}`}
                  title="Close Inspector"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Inspector Body */}
              <div
                className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 pb-4 overscroll-contain"
                onWheel={(e) => e.stopPropagation()}
              >
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                  {selectedNode.summary}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className={`p-2.5 rounded border ${isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-950/60 border-white/5'}`}>
                    <span className={`block mb-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>CATEGORY</span>
                    <span className="font-bold" style={{ color: selectedNodeColor }}>{selectedNode.category}</span>
                  </div>
                  <div className={`p-2.5 rounded border ${isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-950/60 border-white/5'}`}>
                    <span className={`block mb-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>MASTERY</span>
                    <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-[#00ff9d]'}`}>{selectedNode.mastery}%</span>
                  </div>
                </div>

                {/* 1. TOPOLOGICAL PREREQUISITES SECTION */}
                <div className={`pt-2.5 border-t space-y-2 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <div className="flex items-center gap-1.5 text-amber-600">
                      <ShieldAlert size={13} />
                      <span>PREREQUISITES (TOPOLOGICAL ORDER)</span>
                    </div>
                    {topologicalPrereqs.length > 0 && (
                      <span className="text-[10px] text-amber-600 font-bold">
                        {topologicalPrereqs.length} STEPS
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {topologicalPrereqs.length > 0 ? (
                      topologicalPrereqs.map((prereqNode, idx) => (
                        <div
                          key={prereqNode.id}
                          onClick={() => setSelectedTopicId(prereqNode.id)}
                          className={`p-2 rounded border text-[11px] cursor-pointer transition-all flex items-center justify-between group ${
                            isLight
                              ? 'bg-white/90 border-amber-500/30 hover:border-amber-500 text-slate-800 shadow-sm'
                              : 'bg-slate-950/80 border-[#ffaa00]/30 hover:border-[#ffaa00] text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded flex-shrink-0 ${
                              isLight ? 'text-amber-700 bg-amber-100' : 'text-[#ffaa00] bg-[#ffaa00]/15'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className={`truncate font-sans font-bold group-hover:text-amber-600 ${
                              isLight ? 'text-slate-800' : 'text-slate-200'
                            }`}>
                              {prereqNode.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-amber-600 font-bold ml-2 flex-shrink-0">
                            {prereqNode.mastery}%
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-[10px] text-slate-400 italic p-1">
                        No prerequisites required for this foundational topic.
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. NOTES SECTION */}
                <div className={`pt-2.5 border-t space-y-2 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <div className="flex items-center gap-1.5" style={{ color: selectedNodeColor }}>
                      <FileText size={13} />
                      <span>NOTES</span>
                    </div>
                    {selectedNode.notes && selectedNode.notes.length > 0 && (
                      <span
                        className="text-[10px] font-bold"
                        style={{ color: selectedNodeColor }}
                      >
                        {selectedNode.notes.length} FILE{selectedNode.notes.length > 1 ? 'S' : ''}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {selectedNode.notes && selectedNode.notes.length > 0 ? (
                      selectedNode.notes.map((note) => (
                        <div
                          key={note.id}
                          data-testid="inspector-note-item"
                          onClick={() => setActiveNote(note)}
                          style={{
                            borderColor: `${selectedNodeColor}40`
                          }}
                          className={`p-2 rounded border text-[11px] cursor-pointer transition-all flex items-center justify-between group shadow-sm ${
                            isLight
                              ? 'bg-white/90 hover:bg-slate-50 text-slate-800'
                              : 'bg-slate-950/80 hover:bg-slate-900 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText
                              size={13}
                              className="flex-shrink-0 group-hover:scale-110 transition-transform"
                              style={{ color: selectedNodeColor }}
                            />
                            <span className={`truncate font-semibold ${isLight ? 'text-slate-800 group-hover:text-slate-950' : 'text-slate-200 group-hover:text-white'}`}>
                              {note.title}
                            </span>
                          </div>
                          {note.updatedAt && (
                            <span className={`text-[10px] font-mono ml-2 flex-shrink-0 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              {note.updatedAt}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-[10px] text-slate-400 italic p-1">
                        No notes attached to this topic.
                      </div>
                    )}

                    {/* Add New Note Button */}
                    <button
                      onClick={() => {
                        setActiveNote(
                          {
                            id: '',
                            title: 'Untitled Note',
                            content: '',
                            updatedAt: 'Just now'
                          },
                          true
                        );
                      }}
                      style={{
                        borderColor: `${selectedNodeColor}35`,
                        color: selectedNodeColor
                      }}
                      className={`w-full mt-1 p-2 rounded-lg border border-dashed hover:border-solid text-[11px] font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm group ${
                        isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-900/80'
                      }`}
                    >
                      <Plus size={13} className="group-hover:scale-125 transition-transform" />
                      <span>+ ADD NOTE</span>
                    </button>
                  </div>
                </div>

                {/* 2.5 PRACTICE QUIZZES SECTION */}
                {selectedNode.quizzes && selectedNode.quizzes.length > 0 && (
                  <div className={`pt-2.5 border-t space-y-2 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <div className="flex items-center gap-1.5" style={{ color: selectedNodeColor }}>
                        <HelpCircle size={13} />
                        <span>PRACTICE QUIZZES</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-80" style={{ color: selectedNodeColor }}>
                        {selectedNode.quizzes.length} BANK{selectedNode.quizzes.length > 1 ? 'S' : ''}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {selectedNode.quizzes.map((quiz) => (
                        <div
                          key={quiz.id}
                          data-testid="inspector-quiz-item"
                          onClick={() => setActiveQuiz(quiz)}
                          style={{
                            borderColor: `${selectedNodeColor}40`
                          }}
                          className={`p-2 rounded border text-[11px] cursor-pointer transition-all flex items-center justify-between group shadow-sm ${
                            isLight
                              ? 'bg-white/90 hover:bg-slate-50 text-slate-800'
                              : 'bg-slate-950/80 hover:bg-slate-900 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <HelpCircle
                              size={13}
                              className="flex-shrink-0 group-hover:scale-110 transition-transform"
                              style={{ color: selectedNodeColor }}
                            />
                            <span className={`truncate font-semibold ${isLight ? 'text-slate-800 group-hover:text-slate-950' : 'text-slate-200 group-hover:text-white'}`}>
                              {quiz.title}
                            </span>
                          </div>
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ml-2 flex-shrink-0"
                            style={{
                              backgroundColor: `${selectedNodeColor}20`,
                              color: selectedNodeColor
                            }}
                          >
                            {quiz.questions?.length || 0} Qs
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. LEARN NEXT SECTION */}
                <div className={`pt-2.5 border-t space-y-2 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                  <div className={`flex items-center gap-1.5 text-[11px] font-bold ${isLight ? 'text-emerald-700' : 'text-[#00ff9d]'}`}>
                    <Zap size={13} />
                    <span>LEARN NEXT</span>
                  </div>

                  <div className="space-y-1.5">
                    {selectedNode.unlocks.length > 0 ? (
                      selectedNode.unlocks.map((unlockId) => {
                        const unlockNode = topicNodes.find((n) => n.id === unlockId);
                        if (!unlockNode) return null;

                        return (
                          <div
                            key={unlockId}
                            onClick={() => setSelectedTopicId(unlockNode.id)}
                            className={`p-2 rounded border text-[11px] cursor-pointer transition-all flex items-center justify-between group ${
                              isLight
                                ? 'bg-white/90 border-emerald-500/30 hover:border-emerald-500 text-slate-800 shadow-sm'
                                : 'bg-slate-950/80 border-[#00ff9d]/30 hover:border-[#00ff9d] text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <ArrowRight size={12} className={`flex-shrink-0 group-hover:translate-x-0.5 transition-transform ${isLight ? 'text-emerald-600' : 'text-[#00ff9d]'}`} />
                              <span className={`truncate font-semibold ${isLight ? 'text-slate-800 group-hover:text-emerald-700' : 'text-slate-200 group-hover:text-[#00ff9d]'}`}>
                                {unlockNode.name}
                              </span>
                            </div>
                            <span className={`text-[10px] font-bold ml-2 ${isLight ? 'text-emerald-700' : 'text-[#00ff9d]'}`}>
                              {unlockNode.mastery}%
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-[10px] text-slate-400 italic p-1">
                        Advanced topic (end of current domain path).
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-10 w-full flex-shrink-0 pointer-events-none" />
              </div>

              {/* Action Button at bottom */}
              <div className="pt-2 flex-shrink-0">
                <button
                  onClick={() => updateTopicMastery(selectedNode.id, selectedNode.mastery + 10)}
                  style={{
                    backgroundColor: selectedNodeColor,
                    boxShadow: isLight ? `0 2px 10px rgba(0,0,0,0.15)` : `0 0 14px ${selectedNodeColor}60`
                  }}
                  className={`w-full py-2 rounded font-bold text-center hover:opacity-90 transition-opacity shadow-md cursor-pointer ${
                    isLight ? 'text-white' : 'text-slate-950'
                  }`}
                >
                  +10% MASTERY RECALL
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ================= BOTTOM LEFT STUDY STATS ================= */}
      <footer className="pointer-events-auto flex items-center justify-start gap-3 mt-2">
        {/* Mastery Box (Dynamic per Subgraph) */}
        <div className="glass-panel px-3.5 py-2 rounded-lg flex items-center gap-2 font-mono text-xs shadow-lg">
          <Award size={14} className={isLight ? 'text-emerald-600' : 'text-[#00ff9d]'} />
          <span className={`uppercase ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{activeCategoryLabel}:</span>
          <span className={`font-bold ${isLight ? 'text-emerald-600' : 'text-[#00ff9d]'}`}>
            {currentMasteryScore}%
          </span>
        </div>
      </footer>

      {/* Markdown Note Viewing Modal */}
      <NoteViewerModal />

      {/* Review Diff Modal (FRO-11) */}
      <DiffViewerModal />

      {/* Ingestion Pedagogical Walkthrough Modal */}
      <IngestionWalkthroughModal />
    </div>
  );
}


