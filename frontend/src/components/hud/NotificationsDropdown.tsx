import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  X,
  FileCode,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Layers,
  Award
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { GraphUpdateStatus, DomainCategory, ReviewQueueItemDTO, GraphUpdate } from '../../types/telemetry';
import { DOMAIN_BASE_COLORS } from '../../utils/theme';

export default function NotificationsDropdown() {
  const isNotificationsOpen = useStore((state) => state.isNotificationsOpen);
  const setIsNotificationsOpen = useStore((state) => state.setIsNotificationsOpen);
  const graphUpdates = useStore((state) => state.graphUpdates);
  const queueItems = useStore((state) => state.queueItems);
  const setActiveDiffUpdateId = useStore((state) => state.setActiveDiffUpdateId);
  const setActiveWalkthroughQueueId = useStore((state) => state.setActiveWalkthroughQueueId);
  const approveGraphUpdate = useStore((state) => state.approveGraphUpdate);
  const rejectGraphUpdate = useStore((state) => state.rejectGraphUpdate);
  const approveEntireQueueItem = useStore((state) => state.approveEntireQueueItem);
  const rejectEntireQueueItem = useStore((state) => state.rejectEntireQueueItem);
  const resetGraphUpdates = useStore((state) => state.resetGraphUpdates);

  const [activeFilter, setActiveFilter] = useState<'PENDING' | 'ALL' | 'CHANGES_REQUESTED'>('PENDING');
  const [viewGrouping, setViewGrouping] = useState<'SOURCE' | 'ALL'>('SOURCE');
  const [collapsedSources, setCollapsedSources] = useState<Record<string, boolean>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pendingUpdates = graphUpdates.filter((u) => u.status === 'PENDING');
  const pendingCount = pendingUpdates.length;

  const toggleSourceCollapse = (id: string) => {
    setCollapsedSources((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Group updates by queueItem / source batch
  const sourceGroups = useMemo(() => {
    // Collect all queue items, plus any synthetic source groups for updates without a queueItem
    const groups: Array<{
      queueItem: ReviewQueueItemDTO | null;
      id: string;
      title: string;
      sourceUrl?: string;
      domain?: string;
      score?: number;
      walkthroughAvailable: boolean;
      updates: GraphUpdate[];
    }> = [];

    const mappedUpdateIds = new Set<string>();

    // 1. First map from explicit queueItems
    queueItems.forEach((item) => {
      // Find matching updates in graphUpdates
      const itemUpdates = graphUpdates.filter(
        (u) => u.queueId === item.id || item.updates?.some((iu) => iu.id === u.id)
      );

      const visibleUpdates = itemUpdates.filter((u) => {
        if (activeFilter === 'PENDING') return u.status === 'PENDING';
        if (activeFilter === 'CHANGES_REQUESTED') return u.status === 'CHANGES_REQUESTED';
        return true;
      });

      if (visibleUpdates.length > 0) {
        groups.push({
          queueItem: item,
          id: item.id,
          title: item.sourceMetadata?.title || item.sourceUrl || `Source Batch ${item.id}`,
          sourceUrl: item.sourceUrl,
          domain: item.sourceMetadata?.domain,
          score: item.walkthrough?.quizCoverageJustification?.coverageScore ?? item.auditReport?.score,
          walkthroughAvailable: Boolean(item.walkthrough),
          updates: visibleUpdates
        });
      }

      itemUpdates.forEach((u) => mappedUpdateIds.add(u.id));
    });

    // 2. Map any leftover updates not attached to an explicit queueItem
    const leftoverUpdates = graphUpdates.filter((u) => !mappedUpdateIds.has(u.id));
    if (leftoverUpdates.length > 0) {
      // Group by queueId or sourceUrl if available
      const unattachedBySource = new Map<string, GraphUpdate[]>();
      leftoverUpdates.forEach((u) => {
        const key = u.queueId || u.sourceUrl || 'general-updates';
        const list = unattachedBySource.get(key) || [];
        list.push(u);
        unattachedBySource.set(key, list);
      });

      unattachedBySource.forEach((updates, key) => {
        const visibleUpdates = updates.filter((u) => {
          if (activeFilter === 'PENDING') return u.status === 'PENDING';
          if (activeFilter === 'CHANGES_REQUESTED') return u.status === 'CHANGES_REQUESTED';
          return true;
        });

        if (visibleUpdates.length > 0) {
          const first = visibleUpdates[0];
          groups.push({
            queueItem: null,
            id: key,
            title: first.sourceTitle || first.sourceUrl || 'Direct Graph Proposals',
            sourceUrl: first.sourceUrl,
            domain: undefined,
            score: undefined,
            walkthroughAvailable: false,
            updates: visibleUpdates
          });
        }
      });
    }

    return groups;
  }, [queueItems, graphUpdates, activeFilter]);

  const filteredUpdates = useMemo(() => {
    return graphUpdates.filter((u) => {
      if (activeFilter === 'PENDING') return u.status === 'PENDING';
      if (activeFilter === 'CHANGES_REQUESTED') return u.status === 'CHANGES_REQUESTED';
      return true;
    });
  }, [graphUpdates, activeFilter]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotificationsOpen, setIsNotificationsOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Bell Button in Header */}
      <button
        type="button"
        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
        className={`relative p-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
          isNotificationsOpen
            ? 'bg-[#00f0ff]/20 border-[#00f0ff] text-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.3)]'
            : pendingCount > 0
            ? 'bg-[#080c16]/80 border-[#00f0ff]/40 text-slate-200 hover:border-[#00f0ff] hover:text-[#00f0ff]'
            : 'bg-[#080c16]/70 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
        }`}
        title="Review Updates / Notifications"
        aria-label="Review Updates / Notifications"
        data-testid="notifications-bell-btn"
      >
        <Bell size={15} />
        {pendingCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#00f0ff] text-[9px] font-extrabold text-slate-950 shadow-[0_0_8px_#00f0ff] animate-pulse">
            {pendingCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isNotificationsOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-84 sm:w-96 max-h-[520px] flex flex-col bg-[#080c16]/95 border border-[#00f0ff]/30 rounded-xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden"
          >
            {/* Top Accent Line */}
            <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent opacity-80" />

            {/* Dropdown Header */}
            <div className="p-3 bg-slate-950/80 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileCode size={14} className="text-[#00f0ff]" />
                <span className="text-xs font-bold text-slate-100 tracking-wider">REVIEW QUEUE</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/30 font-bold">
                  {pendingCount} PENDING
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center rounded bg-slate-900 border border-white/10 p-0.5 text-[9px]">
                  <button
                    type="button"
                    onClick={() => setViewGrouping('SOURCE')}
                    className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                      viewGrouping === 'SOURCE'
                        ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Group updates by source batch"
                  >
                    BY SOURCE
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewGrouping('ALL')}
                    className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                      viewGrouping === 'ALL'
                        ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Show flat list of updates"
                  >
                    FLAT
                  </button>
                </div>

                <button
                  type="button"
                  onClick={resetGraphUpdates}
                  className="p-1 text-slate-400 hover:text-[#00f0ff] rounded hover:bg-slate-900 transition-colors cursor-pointer"
                  title="Reset Mock Updates Feed"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-950/40 border-b border-white/5 text-[10px]">
              {(['PENDING', 'CHANGES_REQUESTED', 'ALL'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveFilter(tab)}
                  className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                    activeFilter === tab
                      ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab === 'CHANGES_REQUESTED' ? 'FEEDBACK' : tab}
                </button>
              ))}
            </div>

            {/* Updates List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-3 overscroll-contain">
              {viewGrouping === 'SOURCE' ? (
                /* Source-Grouped View */
                sourceGroups.length > 0 ? (
                  sourceGroups.map((group) => {
                    const isCollapsed = collapsedSources[group.id] ?? false;
                    const pendingInGroup = group.updates.filter((u) => u.status === 'PENDING').length;

                    return (
                      <div
                        key={group.id}
                        className="rounded-xl border border-white/10 bg-slate-950/70 overflow-hidden shadow-sm hover:border-[#00f0ff]/30 transition-all"
                        data-testid={`source-group-${group.id}`}
                      >
                        {/* Source Batch Header */}
                        <div className="p-2.5 bg-slate-900/80 border-b border-white/5 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => toggleSourceCollapse(group.id)}
                              className="flex items-start gap-1.5 text-left flex-1 min-w-0 group cursor-pointer"
                            >
                              <span className="text-slate-400 group-hover:text-[#00f0ff] mt-0.5 transition-colors">
                                {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-100 group-hover:text-[#00f0ff] transition-colors truncate">
                                  {group.title}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {group.domain && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {group.domain}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-500">•</span>
                                  <span className="text-[10px] text-slate-400">
                                    {group.updates.length} change{group.updates.length > 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                            </button>

                            {group.score !== undefined && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#00ff9d]/15 text-[#00ff9d] border border-[#00ff9d]/30 flex-shrink-0">
                                <Award size={10} />
                                {group.score}%
                              </span>
                            )}
                          </div>

                          {/* Source Actions Row */}
                          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
                            {/* Walkthrough Button */}
                            {group.queueItem && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveWalkthroughQueueId(group.id);
                                  setIsNotificationsOpen(false);
                                }}
                                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] border border-[#00f0ff]/30 font-bold transition-all cursor-pointer"
                                data-testid={`view-walkthrough-btn-${group.id}`}
                              >
                                <Sparkles size={11} />
                                View Walkthrough
                              </button>
                            )}

                            {/* Batch Approve / Reject */}
                            {pendingInGroup > 0 && group.queueItem && (
                              <div className="flex items-center gap-1 ml-auto">
                                <button
                                  type="button"
                                  onClick={() => approveEntireQueueItem(group.id)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#00ff9d]/15 hover:bg-[#00ff9d]/30 text-[#00ff9d] border border-[#00ff9d]/30 font-bold transition-all cursor-pointer"
                                  title="Approve all updates in this source"
                                  data-testid={`batch-approve-btn-${group.id}`}
                                >
                                  <Check size={11} />
                                  Approve All
                                </button>
                                <button
                                  type="button"
                                  onClick={() => rejectEntireQueueItem(group.id)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#ff3366]/15 hover:bg-[#ff3366]/30 text-[#ff3366] border border-[#ff3366]/30 font-bold transition-all cursor-pointer"
                                  title="Reject all updates in this source"
                                  data-testid={`batch-reject-btn-${group.id}`}
                                >
                                  <X size={11} />
                                  Reject All
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Collapsible Children Updates */}
                        {!isCollapsed && (
                          <div className="p-2 space-y-1.5 bg-slate-950/40">
                            {group.updates.map((update) => (
                              <SingleUpdateCard
                                key={update.id}
                                update={update}
                                onReviewDiff={() => {
                                  setActiveDiffUpdateId(update.id);
                                  setIsNotificationsOpen(false);
                                }}
                                onApprove={() => approveGraphUpdate(update.id)}
                                onReject={() => rejectGraphUpdate(update.id)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <EmptyState />
                )
              ) : (
                /* Flat Updates View */
                filteredUpdates.length > 0 ? (
                  filteredUpdates.map((update) => (
                    <SingleUpdateCard
                      key={update.id}
                      update={update}
                      onReviewDiff={() => {
                        setActiveDiffUpdateId(update.id);
                        setIsNotificationsOpen(false);
                      }}
                      onApprove={() => approveGraphUpdate(update.id)}
                      onReject={() => rejectGraphUpdate(update.id)}
                    />
                  ))
                ) : (
                  <EmptyState />
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SingleUpdateCard({
  update,
  onReviewDiff,
  onApprove,
  onReject
}: {
  update: GraphUpdate;
  onReviewDiff: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const catColor = DOMAIN_BASE_COLORS[update.category as DomainCategory] || '#00f0ff';
  const commentCount = update.comments?.length || 0;

  return (
    <div
      className={`p-2.5 rounded-lg border text-xs transition-all flex flex-col gap-2 ${
        update.status === 'PENDING'
          ? 'bg-slate-950/80 border-white/10 hover:border-[#00f0ff]/50 shadow-sm'
          : update.status === 'CHANGES_REQUESTED'
          ? 'bg-slate-950/80 border-[#ffaa00]/30 hover:border-[#ffaa00]'
          : update.status === 'APPROVED'
          ? 'bg-slate-950/40 border-[#00ff9d]/20 opacity-75'
          : 'bg-slate-950/30 border-[#ff3366]/20 opacity-60'
      }`}
    >
      {/* Top Row: Type Badge + Status + Time */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            style={{
              backgroundColor: `${catColor}20`,
              borderColor: `${catColor}50`,
              color: catColor
            }}
            className="px-1.5 py-0.5 rounded text-[9px] font-bold border"
          >
            {update.type.replace('_', ' ')}
          </span>
          <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
            {update.targetName}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {update.status === 'APPROVED' && (
            <span className="flex items-center gap-1 text-[9px] text-[#00ff9d] font-bold">
              <CheckCircle2 size={11} /> APPROVED
            </span>
          )}
          {update.status === 'REJECTED' && (
            <span className="flex items-center gap-1 text-[9px] text-[#ff3366] font-bold">
              <XCircle size={11} /> REJECTED
            </span>
          )}
          {update.status === 'CHANGES_REQUESTED' && (
            <span className="flex items-center gap-1 text-[9px] text-[#ffaa00] font-bold">
              <AlertCircle size={11} /> FEEDBACK
            </span>
          )}
          {update.status === 'PENDING' && (
            <span className="text-[9px] text-slate-500">{update.createdAt}</span>
          )}
        </div>
      </div>

      {/* Middle: Title & Description */}
      <div onClick={onReviewDiff} className="cursor-pointer group">
        <p className="font-bold text-slate-200 group-hover:text-[#00f0ff] transition-colors leading-tight">
          {update.title}
        </p>
        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
          {update.description}
        </p>
      </div>

      {/* Bottom Row: Comments pill & Quick Action buttons */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <div className="flex items-center gap-2">
          {commentCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-[#ffaa00] bg-[#ffaa00]/10 px-1.5 py-0.5 rounded border border-[#ffaa00]/25">
              <MessageSquare size={10} /> {commentCount} note{commentCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onReviewDiff}
            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 text-[10px] font-bold transition-all cursor-pointer"
          >
            Review Diff
          </button>

          {update.status === 'PENDING' && (
            <>
              <button
                type="button"
                onClick={onApprove}
                className="p-1 rounded bg-[#00ff9d]/15 hover:bg-[#00ff9d]/30 text-[#00ff9d] border border-[#00ff9d]/30 transition-all cursor-pointer"
                title="Quick Approve & Merge"
                aria-label="Quick Approve & Merge"
              >
                <Check size={12} />
              </button>
              <button
                type="button"
                onClick={onReject}
                className="p-1 rounded bg-[#ff3366]/15 hover:bg-[#ff3366]/30 text-[#ff3366] border border-[#ff3366]/30 transition-all cursor-pointer"
                title="Quick Reject"
                aria-label="Quick Reject"
              >
                <X size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-8 text-center text-slate-500 text-xs">
      <CheckCircle2 size={24} className="mx-auto mb-2 text-[#00ff9d]/80" />
      <p className="text-slate-300 font-bold">All neural feeds synchronized</p>
      <p className="text-[11px] text-slate-500 mt-0.5">0 updates in current view</p>
    </div>
  );
}
