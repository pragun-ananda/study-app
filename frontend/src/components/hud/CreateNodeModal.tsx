import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, X, Loader2, AlertCircle, Network, ShieldAlert } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { DEFAULT_DOMAINS, DomainCategory, TopicStatus } from '../../types/telemetry';
import { DOMAIN_BASE_COLORS } from '../../utils/theme';
import { calculateNewNodeCoordinates } from '../../utils/graph';

export default function CreateNodeModal() {
  const isCreateNodeOpen = useStore((state) => state.isCreateNodeOpen);
  const setIsCreateNodeOpen = useStore((state) => state.setIsCreateNodeOpen);
  const topicNodes = useStore((state) => state.topicNodes);
  const addTopicNode = useStore((state) => state.addTopicNode);
  const addPrerequisiteEdge = useStore((state) => state.addPrerequisiteEdge);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<DomainCategory>('CS');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<TopicStatus>('NEW');
  const [mastery, setMastery] = useState<number>(0);
  const [selectedPrereqs, setSelectedPrereqs] = useState<string[]>([]);
  const [prereqSearch, setPrereqSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeColor = DOMAIN_BASE_COLORS[category] || '#00f0ff';

  // Reset state when opening
  useEffect(() => {
    if (isCreateNodeOpen) {
      setName('');
      setCategory('CS');
      setSummary('');
      setStatus('NEW');
      setMastery(0);
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
    return topicNodes.filter((node) => {
      if (!prereqSearch) return true;
      return (
        node.name.toLowerCase().includes(prereqSearch.toLowerCase()) ||
        node.category.toLowerCase().includes(prereqSearch.toLowerCase())
      );
    });
  }, [topicNodes, prereqSearch]);

  const togglePrereq = (nodeId: string) => {
    setSelectedPrereqs((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Topic name is required');
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
        mastery: Math.max(0, Math.min(100, Number(mastery) || 0)),
        coordinates,
        lastReviewed: 'Never',
        prerequisites: [],
        unlocks: []
      });

      if (!created) {
        setErrorMessage('Failed to create topic node. Please check your inputs and try again.');
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
            className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              borderColor: `${activeColor}70`,
              boxShadow: `0 0 50px ${activeColor}30, 0 0 20px ${activeColor}15`
            }}
            className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-[#080c16]/95 border rounded-2xl overflow-hidden font-sans z-50 shadow-2xl"
          >
            {/* Top Accent Scanline Bar */}
            <div
              className="h-1 w-full opacity-90 transition-all duration-300"
              style={{
                background: `linear-gradient(90deg, transparent, ${activeColor}, transparent)`
              }}
            />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-slate-950/70 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div
                  className="p-1.5 rounded-lg"
                  style={{
                    backgroundColor: `${activeColor}20`,
                    color: activeColor
                  }}
                >
                  <PlusCircle size={17} />
                </div>
                <div>
                  <h2 className="text-slate-100 font-bold text-sm tracking-wider uppercase">
                    Create Knowledge Node
                  </h2>
                  <p className="text-[10px] text-slate-400">
                    Add a manual concept node with automated 3D spatial positioning
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateNodeOpen(false)}
                disabled={isSubmitting}
                className="p-1.5 rounded-lg border border-white/10 hover:border-white/25 text-slate-400 hover:text-white bg-slate-900/60 transition-all cursor-pointer"
                title="Close (ESC)"
              >
                <X size={15} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-slate-200 overscroll-contain">
                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-start gap-2">
                    <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-red-400" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Node Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 tracking-wider flex items-center justify-between">
                    <span>TOPIC NAME *</span>
                    <span className="text-[10px] text-slate-500 font-normal">Required</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Diffusion Models, Transformer Attention..."
                    disabled={isSubmitting}
                    className="w-full bg-slate-900/90 border border-white/15 focus:border-[#00f0ff] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                    data-testid="create-node-name-input"
                  />
                </div>

                {/* Category & Status Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Category */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 tracking-wider">
                      DOMAIN CATEGORY
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as DomainCategory)}
                      disabled={isSubmitting}
                      className="w-full bg-slate-900/90 border border-white/15 focus:border-[#00f0ff] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none transition-colors cursor-pointer"
                      data-testid="create-node-category-select"
                    >
                      {DEFAULT_DOMAINS.map((dom) => (
                        <option key={dom} value={dom} className="bg-slate-950 text-slate-100">
                          {dom}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 tracking-wider">
                      INITIAL STATUS
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TopicStatus)}
                      disabled={isSubmitting}
                      className="w-full bg-slate-900/90 border border-white/15 focus:border-[#00f0ff] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none transition-colors cursor-pointer"
                      data-testid="create-node-status-select"
                    >
                      <option value="NEW" className="bg-slate-950 text-slate-100">NEW</option>
                      <option value="LEARNING" className="bg-slate-950 text-slate-100">LEARNING</option>
                      <option value="MASTERED" className="bg-slate-950 text-slate-100">MASTERED</option>
                      <option value="DUE" className="bg-slate-950 text-slate-100">DUE</option>
                    </select>
                  </div>
                </div>

                {/* Mastery Level */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-300">
                    <span>INITIAL MASTERY</span>
                    <span className="text-[#00ff9d] font-mono">{mastery}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={mastery}
                      onChange={(e) => setMastery(Number(e.target.value))}
                      disabled={isSubmitting}
                      className="flex-1 accent-[#00f0ff] cursor-pointer"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={mastery}
                      onChange={(e) => setMastery(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                      disabled={isSubmitting}
                      className="w-16 bg-slate-900/90 border border-white/15 rounded-lg px-2 py-1 text-center text-xs font-mono text-slate-100 focus:outline-none focus:border-[#00f0ff]"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-300 tracking-wider">
                    <span>SUMMARY & CONCEPTS</span>
                    <span className="text-[10px] text-slate-500 font-mono">{summary.length} chars</span>
                  </div>
                  <textarea
                    rows={3}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Brief description of the topic concept..."
                    disabled={isSubmitting}
                    className="w-full bg-slate-900/90 border border-white/15 focus:border-[#00f0ff] rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors resize-none leading-relaxed"
                    data-testid="create-node-summary-input"
                  />
                </div>

                {/* Prerequisites Picker */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                    <span className="flex items-center gap-1.5 text-[#ffaa00]">
                      <ShieldAlert size={13} />
                      PREREQUISITES ({selectedPrereqs.length} SELECTED)
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Optional</span>
                  </div>

                  <input
                    type="text"
                    placeholder="Filter existing topics to link..."
                    value={prereqSearch}
                    onChange={(e) => setPrereqSearch(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-slate-900/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#ffaa00]"
                  />

                  <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-950/70 border border-white/10 rounded-lg p-1.5">
                    {availablePrereqs.length > 0 ? (
                      availablePrereqs.slice(0, 25).map((node) => {
                        const isChecked = selectedPrereqs.includes(node.id);
                        return (
                          <div
                            key={node.id}
                            onClick={() => !isSubmitting && togglePrereq(node.id)}
                            className={`px-2 py-1.5 rounded text-xs flex items-center justify-between cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-[#ffaa00]/20 border border-[#ffaa00]/40 text-[#ffaa00]'
                                : 'hover:bg-slate-900/80 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="accent-[#ffaa00] cursor-pointer"
                              />
                              <span className="truncate font-medium">{node.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono ml-2 flex-shrink-0">
                              {node.category}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-slate-500 text-[11px] italic">
                        No topics match your search.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-white/10 bg-slate-950/70 flex items-center justify-end gap-2.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateNodeOpen(false)}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-slate-300 hover:text-white bg-slate-900/60 transition-all text-xs font-mono cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  style={{
                    backgroundColor: activeColor,
                    boxShadow: `0 0 15px ${activeColor}50`
                  }}
                  className="px-4 py-1.5 rounded-lg text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 active:scale-95"
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
                      <span>CREATE NODE</span>
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
