import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch,
  Star,
  GitFork,
  X,
  Plus,
  FolderGit2,
  Code2,
  Layout,
  Columns,
  Maximize2,
  MessageSquarePlus,
  Trash2,
  Sparkles
} from 'lucide-react';
import { useRepoStore, RepoViewMode } from '../../store/useRepoStore';
import { useStore } from '../../store/useStore';
import { FileTreeExplorer } from './FileTreeExplorer';
import { MonacoRepoViewer } from './MonacoRepoViewer';
import { AnnotationDock } from './AnnotationDock';
import { DesignCategory } from '../../types/telemetry';

export const RepoViewerModal: React.FC = () => {
  const isRepoViewerOpen = useRepoStore((state) => state.isRepoViewerOpen);
  const closeRepoViewer = useRepoStore((state) => state.closeRepoViewer);
  const repositories = useRepoStore((state) => state.repositories);
  const activeRepo = useRepoStore((state) => state.activeRepo);
  const treeManifest = useRepoStore((state) => state.treeManifest);
  const openFiles = useRepoStore((state) => state.openFiles);
  const activeFilePath = useRepoStore((state) => state.activeFilePath);
  const fileBlobs = useRepoStore((state) => state.fileBlobs);
  const annotations = useRepoStore((state) => state.annotations);
  const viewMode = useRepoStore((state) => state.viewMode);
  const isImportModalOpen = useRepoStore((state) => state.isImportModalOpen);
  const isLoadingTree = useRepoStore((state) => state.isLoadingTree);
  const isLoadingBlob = useRepoStore((state) => state.isLoadingBlob);

  const selectRepository = useRepoStore((state) => state.selectRepository);
  const openFile = useRepoStore((state) => state.openFile);
  const closeFile = useRepoStore((state) => state.closeFile);
  const setViewMode = useRepoStore((state) => state.setViewMode);
  const setIsImportModalOpen = useRepoStore((state) => state.setIsImportModalOpen);
  const importRepo = useRepoStore((state) => state.importRepo);
  const createAnnotation = useRepoStore((state) => state.createAnnotation);
  const deleteAnnotation = useRepoStore((state) => state.deleteAnnotation);

  const theme = useStore((state) => state.theme);
  const isLight = theme === 'light';

  // Import Dialog State
  const [importInput, setImportInput] = useState('');
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Quick Annotation Draft State
  const [selectedLines, setSelectedLines] = useState<{ start: number; end: number; snippet: string } | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annCategory, setAnnCategory] = useState<DesignCategory>('ARCHITECTURE');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Load repositories when modal opens
  useEffect(() => {
    if (isRepoViewerOpen && repositories.length === 0) {
      useRepoStore.getState().fetchRepositories();
    }
  }, [isRepoViewerOpen, repositories.length]);

  if (!isRepoViewerOpen) return null;

  const safeAnnotations = Array.isArray(annotations) ? annotations : [];
  const activeBlobData = activeFilePath ? fileBlobs[activeFilePath] : null;

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importInput.trim()) return;

    try {
      setIsSubmittingImport(true);
      setImportError(null);
      await importRepo({ url: importInput.trim() });
      setImportInput('');
      setIsImportModalOpen(false);
    } catch (err: any) {
      setImportError(err.message || 'Failed to import repository');
    } finally {
      setIsSubmittingImport(false);
    }
  };

  const handleSaveAnnotation = async () => {
    if (!activeRepo || !activeFilePath || !selectedLines || !annTitle.trim()) return;

    try {
      await createAnnotation({
        repositoryId: activeRepo.id,
        commitSha: activeRepo.activeCommitSha,
        filePath: activeFilePath,
        startLine: selectedLines.start,
        endLine: selectedLines.end,
        title: annTitle.trim(),
        content: annContent.trim(),
        anchorCodeSnippet: selectedLines.snippet,
        designCategory: annCategory
      });

      // Reset note form
      setAnnTitle('');
      setAnnContent('');
      setSelectedLines(null);
      setIsAddingNote(false);
    } catch (err) {
      console.error('[SAVE_ANNOTATION_ERROR]:', err);
    }
  };

  return (
    <div
      data-testid="repo-viewer-modal"
      className="fixed inset-0 z-[60] pointer-events-auto flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/75 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className={`w-full h-full max-w-7xl flex flex-col rounded-xl border shadow-2xl overflow-hidden ${
          isLight ? 'bg-white border-neutral-300 text-neutral-900' : 'bg-neutral-900 border-white/10 text-neutral-100'
        }`}
      >
        {/* Top Header */}
        <header
          className={`flex items-center justify-between px-4 py-3 border-b select-none ${
            isLight ? 'bg-neutral-100/90 border-neutral-200' : 'bg-neutral-950/90 border-white/10'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-cyan-400 shrink-0" />
              <span className="font-mono text-sm font-bold tracking-tight">Code Repository Studio</span>
            </div>

            {/* Repo Selector Dropdown */}
            <div className="relative">
              <select
                data-testid="repo-selector"
                value={activeRepo?.id || ''}
                onChange={(e) => selectRepository(e.target.value)}
                className={`text-xs font-mono font-semibold py-1 px-2.5 rounded border outline-none cursor-pointer ${
                  isLight
                    ? 'bg-white border-neutral-300 text-neutral-800'
                    : 'bg-white/5 border-white/15 text-cyan-300'
                }`}
              >
                {repositories.map((repo) => (
                  <option key={repo.id} value={repo.id}>
                    {repo.fullName} ({repo.language || 'Code'})
                  </option>
                ))}
              </select>
            </div>

            {/* + Import Button */}
            <button
              data-testid="open-import-modal-button"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1 text-xs font-mono py-1 px-2 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>

            {/* Active Repo Badges */}
            {activeRepo && (
              <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-neutral-400">
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                  <GitBranch className="w-3 h-3 text-emerald-400" />
                  <span>{activeRepo.defaultBranch}</span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    ({activeRepo.activeCommitSha.slice(0, 7)})
                  </span>
                </span>

                {activeRepo.starsCount > 0 && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                    <Star className="w-3 h-3 text-amber-400" />
                    <span>{activeRepo.starsCount.toLocaleString()}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right Controls: View Mode & Close */}
          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div
              className={`flex items-center p-0.5 rounded-lg border text-xs font-mono ${
                isLight ? 'bg-neutral-200/60 border-neutral-300' : 'bg-white/5 border-white/10'
              }`}
            >
              <button
                data-testid="viewmode-tree-code"
                onClick={() => setViewMode('TREE_CODE')}
                title="Tree and Code"
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'TREE_CODE'
                    ? isLight
                      ? 'bg-white text-sky-700 shadow-sm'
                      : 'bg-cyan-500/20 text-cyan-300'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
              </button>

              <button
                data-testid="viewmode-full-code"
                onClick={() => setViewMode('FULL_CODE')}
                title="Full Code"
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'FULL_CODE'
                    ? isLight
                      ? 'bg-white text-sky-700 shadow-sm'
                      : 'bg-cyan-500/20 text-cyan-300'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              <button
                data-testid="viewmode-split-notes"
                onClick={() => setViewMode('SPLIT_ANNOTATIONS')}
                title="Split Annotations"
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'SPLIT_ANNOTATIONS'
                    ? isLight
                      ? 'bg-white text-sky-700 shadow-sm'
                      : 'bg-cyan-500/20 text-cyan-300'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Layout className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Close Modal Button */}
            <button
              data-testid="close-repo-viewer-button"
              onClick={closeRepoViewer}
              title="Close Studio (Esc)"
              className="p-1.5 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Workspace Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: File Tree Explorer */}
          {viewMode !== 'FULL_CODE' && (
            <div className="w-64 sm:w-72 md:w-80 h-full shrink-0">
              <FileTreeExplorer
                tree={treeManifest?.tree || []}
                activeFilePath={activeFilePath}
                annotations={safeAnnotations}
                onSelectFile={openFile}
                isLight={isLight}
              />
            </div>
          )}

          {/* Center: Monaco Code Viewer */}
          <div className="flex-1 h-full min-w-0">
            <MonacoRepoViewer
              openFiles={openFiles}
              activeFilePath={activeFilePath}
              fileContent={activeBlobData?.content || ''}
              isTruncated={activeBlobData?.isTruncated || false}
              isLoading={isLoadingBlob}
              annotations={safeAnnotations}
              onSelectFile={openFile}
              onCloseFile={closeFile}
              onSelectLineRange={(start, end, snippet) => {
                setSelectedLines({ start, end, snippet });
                setIsAddingNote(true);
              }}
              theme={isLight ? 'light' : 'dark'}
            />
          </div>

          {/* Right: Annotations & AI Dock */}
          {viewMode === 'SPLIT_ANNOTATIONS' && (
            <div
              data-testid="annotations-dock"
              className={`w-80 sm:w-96 md:w-[420px] h-full flex flex-col border-l shrink-0 ${
                isLight ? 'bg-neutral-50/70 border-neutral-200' : 'bg-neutral-950/70 border-white/10'
              }`}
            >
              {/* Note Creator Form if line range selected */}
              {isAddingNote && selectedLines && (
                <div className="p-3 border-b bg-purple-950/20 border-purple-500/30 text-xs font-mono">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-purple-300">
                      Annotate Lines {selectedLines.start}–{selectedLines.end}
                    </span>
                    <button
                      onClick={() => setIsAddingNote(false)}
                      className="text-neutral-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="Note title (e.g. In-memory indexing logic)"
                    className="w-full mb-2 p-1.5 rounded bg-black/40 border border-white/10 text-neutral-200 outline-none focus:border-purple-500"
                  />

                  <select
                    value={annCategory}
                    onChange={(e) => setAnnCategory(e.target.value as DesignCategory)}
                    className="w-full mb-2 p-1.5 rounded bg-black/40 border border-white/10 text-neutral-300 outline-none"
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
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    placeholder="Why was this designed this way? Architectural critique..."
                    className="w-full mb-2 p-1.5 rounded bg-black/40 border border-white/10 text-neutral-200 outline-none focus:border-purple-500"
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsAddingNote(false)}
                      className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-neutral-400"
                    >
                      Cancel
                    </button>
                    <button
                      data-testid="save-annotation-button"
                      onClick={handleSaveAnnotation}
                      className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold cursor-pointer"
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-hidden">
                <AnnotationDock
                  currentFileContent={activeBlobData?.content || ''}
                  isLight={isLight}
                />
              </div>
            </div>
          )}
        </div>

        {/* Import Repo Modal Dialog */}
        <AnimatePresence>
          {isImportModalOpen && (
            <div
              data-testid="import-repo-dialog"
              className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`w-full max-w-md p-5 rounded-xl border shadow-2xl ${
                  isLight ? 'bg-white border-neutral-300' : 'bg-neutral-900 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="w-5 h-5 text-cyan-400" />
                    <h3 className="font-mono text-sm font-bold">Import Public Repository</h3>
                  </div>
                  <button
                    onClick={() => setIsImportModalOpen(false)}
                    className="text-neutral-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleImportSubmit}>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    GitHub URL or Shorthand
                  </label>
                  <input
                    type="text"
                    data-testid="import-repo-input"
                    value={importInput}
                    onChange={(e) => setImportInput(e.target.value)}
                    placeholder="e.g. https://github.com/redis/redis or expressjs/express"
                    className="w-full mb-3 p-2 text-xs font-mono rounded bg-black/40 border border-white/15 text-neutral-100 outline-none focus:border-cyan-400"
                  />

                  {importError && (
                    <div className="mb-3 text-xs font-mono text-red-400">{importError}</div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsImportModalOpen(false)}
                      className="px-3 py-1.5 rounded text-xs font-mono text-neutral-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      data-testid="submit-import-button"
                      disabled={isSubmittingImport || !importInput.trim()}
                      className="px-4 py-1.5 rounded text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-neutral-950 disabled:opacity-50"
                    >
                      {isSubmittingImport ? 'Importing...' : 'Import Repository'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
