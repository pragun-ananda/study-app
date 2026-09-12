import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, X, Loader2, AlertCircle, Network, ShieldAlert } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { DEFAULT_DOMAINS, DomainCategory, TopicStatus } from '../../types/telemetry';
import { getDomainBaseColor } from '../../utils/theme';
import { calculateNewNodeCoordinates } from '../../utils/graph';

export default function CreateNodeModal() {
  const theme = useStore((state) => state.theme);
  const isLight = theme === 'light';

  const isCreateNodeOpen = useStore((state) => state.isCreateNodeOpen);
  const setIsCreateNodeOpen = useStore((state) => state.setIsCreateNodeOpen);
  const topicNodes = useStore((state) => state.topicNodes);
  const addTopicNode = useStore((state) => state.addTopicNode);
  const addPrerequisiteEdge = useStore((state) => state.addPrerequisiteEdge);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<DomainCategory>('CS');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<TopicStatus>('NEW');
  const [selectedPrereqs, setSelectedPrereqs] = useState<string[]>([]);
  const [prereqSearch, setPrereqSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeColor = getDomainBaseColor(category, theme);

  // Reset state when opening
  useEffect(() => {
    if (isCreateNodeOpen) {
      setName('');
      setCategory('CS');
      setSummary('');
      setStatus('NEW');
      setSelectedPrereqs([]);
      setPrereqSearch('');
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isCreateNodeOpen]);

  // Global Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCreateNodeOpen && !isSubmitting) {
        setIsCreateNodeOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateNodeOpen, isSubmitting, setIsCreateNodeOpen]);

  const availablePrereqs = useMemo(() => {
    const query = prereqSearch.trim().toLowerCase();
    const filtered = topicNodes.filter((node) => {
      if (!query) return true;
      return (
        node.name.toLowerCase().includes(query) ||
        node.category.toLowerCase().includes(query) ||
        (node.summary && node.summary.toLowerCase().includes(query)) ||
        node.id.toLowerCase().includes(query)
      );
    });

    return [...filtered].sort((a, b) => {
      const aSelected = selectedPrereqs.includes(a.id);
      const bSelected = selectedPrereqs.includes(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [topicNodes, prereqSearch, selectedPrereqs]);

  const togglePrereq = (nodeId: string) => {
    setSelectedPrereqs((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Concept name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const coordinates = calculateNewNodeCoordinates(category, topicNodes);

      const created = await addTopicNode({
        name: trimmedName,
        category,
        summary: summary.trim(),
        status,
        mastery: 0,
        coordinates,
        lastReviewed: 'Never',
        prerequisites: [],
        unlocks: []
      });

      if (!created) {
        const storeError = useStore.getState().error;
        setErrorMessage(storeError || 'Failed to create topic node. Please check your inputs and try again.');
        setIsSubmitting(false);
        return;
      }

      // Link chosen prerequisites
      if (selectedPrereqs.length > 0) {
        await Promise.allSettled(
          selectedPrereqs.map((prereqId) => addPrerequisiteEdge(created.id, prereqId))
        );
      }

      setIsCreateNodeOpen(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create topic node');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isCreateNodeOpen && (
        <div
          data-testid="create-node-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 pointer-events-auto font-sans"
        >
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => !isSubmitting && setIsCreateNodeOpen(false)}
            className={`absolute inset-0 backdrop-blur-md cursor-pointer transition-colors duration-200 ${
              isLight ? 'bg-slate-900/40' : 'bg-black/80'
            }`}
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-node-modal-title"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              borderColor: isLight ? `${activeColor}40` : `${activeColor}70`,
              boxShadow: isLight
                ? `0 12px 40px rgba(0, 0, 0, 0.15), 0 0 20px ${activeColor}15`
                : `0 0 50px ${activeColor}30, 0 0 20px ${activeColor}15`
            }}
            className={`relative w-full max-w-xl max-h-[90vh] flex flex-col border rounded-2xl overflow-hidden font-sans z-50 shadow-2xl transition-colors duration-200 ${
              isLight ? 'bg-white/95 border-slate-200 text-slate-900' : 'bg-[#080c16]/95 border-white/10 text-slate-100'
            }`}
          >
            {/* Top Accent Scanline Bar */}
            <div
              className="h-1 w-full opacity-90 transition-all duration-300"
              style={{
                background: `linear-gradient(90deg, transparent, ${activeColor}, transparent)`
              }}
            />

            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0 transition-colors duration-200 ${
              isLight ? 'border-slate-200 bg-slate-50/90' : 'border-white/10 bg-slate-950/70'
            }`}>
              <div className="flex items-center gap-2.5">
                <div
                  className="p-1.5 rounded-lg transition-colors"
                  style={{
                    backgroundColor: isLight ? `${activeColor}15` : `${activeColor}20`,
                    color: activeColor
                  }}
                >
                  <PlusCircle size={17} />
                </div>
                <div>
                  <h2 id="create-node-modal-title" className={`font-bold text-sm tracking-wider uppercase ${
                    isLight ? 'text-slate-900' : 'text-slate-100'
                  }`}>
                    Create Concept Node
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateNodeOpen(false)}
                disabled={isSubmitting}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  isLight
                    ? 'border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100'
                    : 'border-white/10 hover:border-white/25 text-slate-400 hover:text-white bg-slate-900/60'
                }`}
                title="Close (ESC)"
              >
                <X size={15} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className={`flex-1 overflow-y-auto p-5 space-y-4 text-xs overscroll-contain transition-colors ${
                isLight ? 'text-slate-800' : 'text-slate-200'
              }`}>
                {/* Error Banner */}
                {errorMessage && (
                  <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                    isLight
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-red-950/50 border-red-500/40 text-red-300'
                  }`}>
                    <AlertCircle size={15} className={`flex-shrink-0 mt-0.5 ${isLight ? 'text-rose-500' : 'text-red-400'}`} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Node Name */}
                <div className="space-y-1">
                  <label htmlFor="create-node-name-input" className={`text-[11px] font-bold tracking-wider flex items-center justify-between ${
                    isLight ? 'text-slate-700' : 'text-slate-300'
                  }`}>
                    <span>CONCEPT *</span>
                    <span className={`text-[10px] font-normal ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Required</span>
                  </label>
                  <input
                    id="create-node-name-input"
                    type="text"
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Diffusion Models, Transformer Attention..."
                    disabled={isSubmitting}
                    className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none transition-colors ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-500'
                        : 'bg-slate-900/90 border-white/15 text-slate-100 placeholder-slate-500 focus:border-[#00f0ff]'
                    }`}
                    data-testid="create-node-name-input"
                  />
                </div>

                {/* Category & Status Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Category */}
                  <div className="space-y-1">
                    <label htmlFor="create-node-category-select" className={`text-[11px] font-bold tracking-wider ${
                      isLight ? 'text-slate-700' : 'text-slate-300'
                    }`}>
                      DOMAIN
                    </label>
                    <select
                      id="create-node-category-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as DomainCategory)}
                      disabled={isSubmitting}
                      className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none transition-colors cursor-pointer ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
                          : 'bg-slate-900/90 border-white/15 text-slate-100 focus:border-[#00f0ff]'
                      }`}
                      data-testid="create-node-category-select"
                    >
                      {DEFAULT_DOMAINS.map((dom) => (
                        <option key={dom} value={dom} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-950 text-slate-100'}>
                          {dom}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label htmlFor="create-node-status-select" className={`text-[11px] font-bold tracking-wider ${
                      isLight ? 'text-slate-700' : 'text-slate-300'
                    }`}>
                      STATUS
                    </label>
                    <select
                      id="create-node-status-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TopicStatus)}
                      disabled={isSubmitting}
                      className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none transition-colors cursor-pointer ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
                          : 'bg-slate-900/90 border-white/15 text-slate-100 focus:border-[#00f0ff]'
                      }`}
                      data-testid="create-node-status-select"
                    >
                      <option value="NEW" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-950 text-slate-100'}>NEW</option>
                      <option value="LEARNING" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-950 text-slate-100'}>LEARNING</option>
                      <option value="MASTERED" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-950 text-slate-100'}>MASTERED</option>
                      <option value="DUE" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-950 text-slate-100'}>DUE</option>
                    </select>
                  </div>
                </div>



                {/* Summary */}
                <div className="space-y-1">
                  <div className={`flex justify-between items-center text-[11px] font-bold tracking-wider ${
                    isLight ? 'text-slate-700' : 'text-slate-300'
                  }`}>
                    <label htmlFor="create-node-summary-input">SUMMARY</label>
                    <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{summary.length} chars</span>
                  </div>
                  <textarea
                    id="create-node-summary-input"
                    rows={3}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Brief description of the topic concept..."
                    disabled={isSubmitting}
                    className={`w-full border rounded-lg p-2.5 text-xs focus:outline-none transition-colors resize-none leading-relaxed ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-500'
                        : 'bg-slate-900/90 border-white/15 text-slate-100 placeholder-slate-500 focus:border-[#00f0ff]'
                    }`}
                    data-testid="create-node-summary-input"
                  />
                </div>

                {/* Prerequisites Picker */}
                <div className={`space-y-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                  <div className={`flex items-center justify-between text-[11px] font-bold ${
                    isLight ? 'text-slate-700' : 'text-slate-300'
                  }`}>
                    <span className={`flex items-center gap-1.5 ${isLight ? 'text-amber-600' : 'text-[#ffaa00]'}`}>
                      <ShieldAlert size={13} />
                      PREREQUISITES ({selectedPrereqs.length} SELECTED)
                    </span>
                    <span className={`text-[10px] font-normal ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Optional</span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Filter existing topics to link..."
                      value={prereqSearch}
                      onChange={(e) => setPrereqSearch(e.target.value)}
                      disabled={isSubmitting}
                      className={`w-full border rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none transition-colors ${
                        prereqSearch ? 'pr-7' : ''
                      } ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                          : 'bg-slate-900/60 border-white/10 text-slate-200 placeholder-slate-500 focus:border-[#ffaa00]'
                      }`}
                      data-testid="create-node-prereq-search"
                    />
                    {prereqSearch && (
                      <button
                        type="button"
                        onClick={() => setPrereqSearch('')}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded cursor-pointer ${
                          isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-500 hover:text-slate-200'
                        }`}
                        title="Clear search"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <div className={`max-h-44 overflow-y-auto space-y-1 border rounded-lg p-1.5 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-white/10'
                  }`}>
                    {availablePrereqs.length > 0 ? (
                      availablePrereqs.map((node) => {
                        const isChecked = selectedPrereqs.includes(node.id);
                        return (
                          <label
                            key={node.id}
                            className={`px-2 py-1.5 rounded text-xs flex items-center justify-between cursor-pointer transition-colors ${
                              isChecked
                                ? (isLight
                                    ? 'bg-amber-100/70 border border-amber-300 text-amber-900'
                                    : 'bg-[#ffaa00]/20 border border-[#ffaa00]/40 text-[#ffaa00]')
                                : (isLight
                                    ? 'hover:bg-slate-200/60 text-slate-700'
                                    : 'hover:bg-slate-900/80 text-slate-300')
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isSubmitting}
                                onChange={() => togglePrereq(node.id)}
                                aria-label={node.name}
                                className={`cursor-pointer ${isLight ? 'accent-amber-600' : 'accent-[#ffaa00]'}`}
                              />
                              <span className="truncate font-medium">{node.name}</span>
                            </div>
                            <span className={`text-[10px] font-mono ml-2 flex-shrink-0 ${
                              isLight ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              {node.category}
                            </span>
                          </label>
                        );
                      })
                    ) : (
                      <div className={`p-3 text-center text-[11px] italic ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                        {topicNodes.length === 0 ? 'No existing topics in the graph yet.' : 'No topics match your search.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className={`px-5 py-3 border-t flex items-center justify-end gap-2.5 flex-shrink-0 transition-colors duration-200 ${
                isLight ? 'border-slate-200 bg-slate-50/90' : 'border-white/10 bg-slate-950/70'
              }`}>
                <button
                  type="button"
                  onClick={() => setIsCreateNodeOpen(false)}
                  disabled={isSubmitting}
                  className={`px-3.5 py-1.5 rounded-lg border text-xs font-mono cursor-pointer transition-all disabled:opacity-50 ${
                    isLight
                      ? 'border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100'
                      : 'border-white/10 hover:border-white/20 text-slate-300 hover:text-white bg-slate-900/60'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  style={{
                    backgroundColor: activeColor,
                    boxShadow: isLight ? `0 2px 10px ${activeColor}40` : `0 0 15px ${activeColor}50`
                  }}
                  className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105 active:scale-95 ${
                    isLight ? 'text-white' : 'text-slate-950'
                  }`}
                  data-testid="create-node-submit-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>CREATING...</span>
                    </>
                  ) : (
                    <>
                      <Network size={13} />
                      <span>CREATE CONCEPT NODE</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
