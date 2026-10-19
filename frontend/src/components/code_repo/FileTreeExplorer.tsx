import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  File,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  MessageSquare
} from 'lucide-react';
import { RepoTreeNode, CodeAnnotationDTO } from '../../types/telemetry';

export interface FileTreeExplorerProps {
  tree: RepoTreeNode[];
  activeFilePath: string | null;
  annotations: CodeAnnotationDTO[];
  onSelectFile: (filePath: string) => void;
  isLight?: boolean;
}

export function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'py':
    case 'c':
    case 'h':
    case 'cpp':
    case 'hpp':
    case 'rs':
    case 'go':
    case 'java':
    case 'proto':
      return <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />;
    case 'md':
    case 'txt':
    case 'json':
    case 'yml':
    case 'yaml':
    case 'toml':
      return <FileText className="w-4 h-4 text-emerald-400 shrink-0" />;
    default:
      return <File className="w-4 h-4 text-neutral-400 shrink-0" />;
  }
}

export const FileTreeExplorer: React.FC<FileTreeExplorerProps> = ({
  tree,
  activeFilePath,
  annotations,
  onSelectFile,
  isLight = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'src': true,
    'lib': true
  });

  // Count annotations per file path
  const annotationsByFile = useMemo(() => {
    const map: Record<string, number> = {};
    if (Array.isArray(annotations)) {
      for (const ann of annotations) {
        map[ann.filePath] = (map[ann.filePath] || 0) + 1;
      }
    }
    return map;
  }, [annotations]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };

  // Flatten tree if searching
  const filteredFlatFiles = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    const result: RepoTreeNode[] = [];

    const walk = (nodes: RepoTreeNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file' && node.path.toLowerCase().includes(query)) {
          result.push(node);
        }
        if (node.children) {
          walk(node.children);
        }
      }
    };
    walk(tree);
    return result;
  }, [tree, searchQuery]);

  const renderNode = (node: RepoTreeNode, depth: number = 0) => {
    const isDir = node.type === 'dir' || (node.type as string) === 'directory';
    const isExpanded = expandedFolders[node.path] ?? false;
    const isActive = activeFilePath === node.path;
    const noteCount = annotationsByFile[node.path] || 0;

    return (
      <div key={node.path} className="select-none">
        <div
          data-testid={`tree-node-${node.path.replace(/\//g, '-')}`}
          onClick={() => {
            if (isDir) {
              toggleFolder(node.path);
            } else {
              onSelectFile(node.path);
            }
          }}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={`flex items-center justify-between py-1 px-2 text-xs font-mono cursor-pointer transition-colors group ${
            isActive
              ? isLight
                ? 'bg-sky-100 text-sky-900 font-semibold border-l-2 border-sky-600'
                : 'bg-cyan-950/70 text-cyan-200 font-semibold border-l-2 border-cyan-400'
              : isLight
              ? 'hover:bg-neutral-100 text-neutral-700'
              : 'hover:bg-white/5 text-neutral-300'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            {isDir ? (
              <>
                <span className="text-neutral-400">
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </span>
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                )}
              </>
            ) : (
              <>
                <span className="w-3.5" />
                {getFileIcon(node.name)}
              </>
            )}
            <span className="truncate">{node.name}</span>
          </div>

          {noteCount > 0 && (
            <span
              title={`${noteCount} note${noteCount > 1 ? 's' : ''}`}
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded-full font-sans bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0 ml-1"
            >
              <MessageSquare className="w-2.5 h-2.5" />
              {noteCount}
            </span>
          )}
        </div>

        {isDir && isExpanded && node.children && (
          <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div
      data-testid="file-tree-explorer"
      className={`h-full flex flex-col border-r ${
        isLight ? 'bg-neutral-50/50 border-neutral-200' : 'bg-neutral-950/60 border-white/10'
      }`}
    >
      {/* Search Header */}
      <div className={`p-2 border-b ${isLight ? 'border-neutral-200' : 'border-white/10'}`}>
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className={`w-full pl-7 pr-6 py-1 text-xs rounded font-mono outline-none transition-all ${
              isLight
                ? 'bg-white border border-neutral-200 text-neutral-900 focus:border-sky-500'
                : 'bg-white/5 border border-white/10 text-neutral-200 focus:border-cyan-500'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-neutral-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto py-1">
        {filteredFlatFiles !== null ? (
          filteredFlatFiles.length > 0 ? (
            filteredFlatFiles.map((f) => renderNode(f, 0))
          ) : (
            <div className="p-4 text-center text-xs text-neutral-500 font-mono">
              No matching files found
            </div>
          )
        ) : tree.length > 0 ? (
          tree.map((node) => renderNode(node, 0))
        ) : (
          <div className="p-4 text-center text-xs text-neutral-500 font-mono">
            Loading repository tree...
          </div>
        )}
      </div>
    </div>
  );
};
