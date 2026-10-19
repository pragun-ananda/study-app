import React, { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { X, AlertCircle } from 'lucide-react';
import { getFileIcon } from './FileTreeExplorer';
import { CodeAnnotationDTO } from '../../types/telemetry';

export interface MonacoRepoViewerProps {
  openFiles: string[];
  activeFilePath: string | null;
  fileContent: string;
  isTruncated?: boolean;
  isLoading?: boolean;
  annotations?: CodeAnnotationDTO[];
  onSelectFile: (path: string) => void;
  onCloseFile: (path: string) => void;
  onSelectLineRange?: (startLine: number, endLine: number, snippet: string) => void;
  theme?: 'dark' | 'light';
}

export function detectMonacoLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'py':
      return 'python';
    case 'c':
    case 'h':
      return 'c';
    case 'cpp':
    case 'hpp':
    case 'cc':
      return 'cpp';
    case 'go':
      return 'go';
    case 'rs':
      return 'rust';
    case 'java':
      return 'java';
    case 'sql':
      return 'sql';
    case 'proto':
      return 'protobuf';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    default:
      return 'plaintext';
  }
}

export const MonacoRepoViewer: React.FC<MonacoRepoViewerProps> = ({
  openFiles,
  activeFilePath,
  fileContent,
  isTruncated = false,
  isLoading = false,
  annotations = [],
  onSelectFile,
  onCloseFile,
  onSelectLineRange,
  theme = 'dark'
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const isLight = theme === 'light';

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Listen to selection changes for line annotations
    editor.onDidChangeCursorSelection((e) => {
      const selection = e.selection;
      if (!selection.isEmpty()) {
        const startLine = selection.startLineNumber;
        const endLine = selection.endLineNumber;
        const model = editor.getModel();
        if (model && onSelectLineRange) {
          const selectedText = model.getValueInRange(selection);
          onSelectLineRange(startLine, endLine, selectedText);
        }
      }
    });

    updateDecorations();
  };

  const updateDecorations = () => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    // Filter annotations for this active file
    const fileAnnotations = annotations.filter((a) => a.filePath === activeFilePath);

    const newDecorations = fileAnnotations.map((ann) => ({
      range: new monaco.Range(ann.startLine, 1, ann.endLine, 1),
      options: {
        isWholeLine: true,
        className: isLight ? 'bg-purple-100/60' : 'bg-purple-950/40',
        glyphMarginClassName: 'annotation-glyph-marker',
        glyphMarginHoverMessage: { value: `**${ann.title}**\n\n${ann.content}` }
      }
    }));

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  };

  useEffect(() => {
    updateDecorations();
  }, [annotations, activeFilePath]);

  // Clean up unused Monaco models to protect Mac mini memory
  useEffect(() => {
    return () => {
      if (monacoRef.current) {
        const models = monacoRef.current.editor.getModels();
        for (const model of models) {
          // Dispose models that are no longer in openFiles
          const modelUri = model.uri.path;
          const isStillOpen = openFiles.some((f) => modelUri.endsWith(f));
          if (!isStillOpen) {
            model.dispose();
          }
        }
      }
    };
  }, [openFiles]);

  const activeLanguage = activeFilePath ? detectMonacoLanguage(activeFilePath) : 'plaintext';

  return (
    <div
      data-testid="monaco-repo-viewer"
      className={`h-full flex flex-col ${
        isLight ? 'bg-white text-neutral-900' : 'bg-neutral-950 text-neutral-100'
      }`}
    >
      {/* File Tab Bar */}
      <div
        className={`flex items-center overflow-x-auto border-b text-xs font-mono select-none ${
          isLight ? 'bg-neutral-100 border-neutral-200' : 'bg-neutral-900/80 border-white/10'
        }`}
      >
        {openFiles.length > 0 ? (
          openFiles.map((path) => {
            const isActive = path === activeFilePath;
            const fileName = path.split('/').pop() || path;
            return (
              <div
                key={path}
                data-testid={`tab-${path.replace(/\//g, '-')}`}
                onClick={() => onSelectFile(path)}
                className={`group flex items-center gap-2 px-3 py-2 border-r cursor-pointer transition-all ${
                  isActive
                    ? isLight
                      ? 'bg-white text-sky-900 font-semibold border-b-2 border-b-sky-600'
                      : 'bg-neutral-950 text-cyan-300 font-semibold border-b-2 border-b-cyan-400'
                    : isLight
                    ? 'hover:bg-neutral-200/60 text-neutral-600'
                    : 'hover:bg-white/5 text-neutral-400'
                }`}
              >
                {getFileIcon(fileName)}
                <span className="truncate max-w-[140px]">{fileName}</span>
                <button
                  data-testid={`close-tab-${path.replace(/\//g, '-')}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseFile(path);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })
        ) : (
          <div className="py-2 px-3 text-neutral-500 italic">No files open</div>
        )}
      </div>

      {/* Truncation warning if > 1MB on Mac mini */}
      {isTruncated && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs font-mono">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>File exceeds 1MB and was truncated to protect Mac mini memory.</span>
        </div>
      )}

      {/* Editor Body */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-neutral-500">
            Fetching file blob...
          </div>
        ) : activeFilePath ? (
          <Editor
            height="100%"
            path={activeFilePath}
            language={activeLanguage}
            value={fileContent}
            theme={isLight ? 'light' : 'vs-dark'}
            onMount={handleEditorDidMount}
            options={{
              readOnly: true,
              domReadOnly: true,
              minimap: { enabled: true, scale: 0.75 },
              glyphMargin: true,
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              smoothScrolling: true,
              wordWrap: 'on'
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center font-mono text-xs text-neutral-500">
            Select a file from the repository tree to begin studying
          </div>
        )}
      </div>
    </div>
  );
};
