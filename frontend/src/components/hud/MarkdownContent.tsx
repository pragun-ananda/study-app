import React, { useState } from 'react';
import {
  Terminal,
  Copy,
  Check,
  Info,
  AlertTriangle,
  Lightbulb,
  CheckSquare,
  Square
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import { MermaidDiagram } from './MermaidDiagram';
import { useStore } from '../../store/useStore';

interface CodeBlockProps {
  language: string;
  codeString: string;
  nodeColor: string;
  isLight?: boolean;
}

export function CodeBlock({ language, codeString, nodeColor, isLight = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative my-4 rounded-xl overflow-hidden border shadow-xl ${
      isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-[#060a14]'
    }`}>
      {/* Code Header Bar */}
      <div className={`flex items-center justify-between px-3.5 py-1.5 border-b text-[11px] font-mono ${
        isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-950/90 border-white/10 text-slate-400'
      }`}>
        <div className="flex items-center gap-2">
          <Terminal size={12} style={{ color: nodeColor }} />
          <span className="font-bold tracking-wider" style={{ color: nodeColor }}>
            {language ? language.toUpperCase() : 'CODE'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] transition-colors border cursor-pointer ${
            isLight
              ? 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200'
              : 'text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border-white/5'
          }`}
          title="Copy code snippet"
        >
          {copied ? (
            <>
              <Check size={11} className={isLight ? "text-emerald-600" : "text-[#00ff9d]"} />
              <span className={isLight ? "text-emerald-600 font-bold" : "text-[#00ff9d] font-bold"}>COPIED</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>COPY</span>
            </>
          )}
        </button>
      </div>

      {/* Syntax Highlighted Body */}
      <div className="overflow-x-auto text-[11.5px] font-mono leading-relaxed">
        <SyntaxHighlighter
          language={language || 'text'}
          style={isLight ? oneLight : dracula}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '11.5px',
            lineHeight: '1.6'
          }}
          codeTagProps={{
            style: {
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
            }
          }}
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export interface MarkdownContentProps {
  content: string;
  accentColor?: string;
  className?: string;
}

export function MarkdownContent({
  content,
  accentColor = '#00f0ff',
  className = ''
}: MarkdownContentProps) {
  const theme = useStore((state) => state.theme);
  const isLight = theme === 'light';

  if (!content) return null;

  return (
    <div className={`prose ${isLight ? 'prose-slate' : 'prose-invert'} max-w-none text-sm leading-relaxed font-sans ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
        components={{
          h1: ({ node, ...props }) => (
            <h1
              className={`text-xl sm:text-2xl font-black font-sans tracking-wide border-b pb-3 mb-5 mt-2 flex items-center gap-2.5 ${
                isLight ? 'border-slate-200' : ''
              }`}
              style={{
                color: accentColor,
                borderColor: isLight ? undefined : `${accentColor}35`
              }}
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className={`text-lg font-bold font-sans tracking-wide mt-8 mb-3.5 pb-2 border-b flex items-center gap-2 ${
                isLight ? 'text-slate-900 border-slate-200' : 'text-slate-100 border-white/10'
              }`}
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className="text-base font-bold font-sans tracking-wide mt-6 mb-2.5 flex items-center gap-2"
              style={{ color: accentColor }}
              {...props}
            />
          ),
          h4: ({ node, ...props }) => (
            <h4
              className={`text-sm font-bold font-sans tracking-wide mt-4 mb-2 flex items-center gap-2 ${
                isLight ? 'text-slate-800' : 'text-slate-200'
              }`}
              {...props}
            />
          ),
          h5: ({ node, ...props }) => (
            <h5
              className={`text-xs font-bold font-sans uppercase tracking-wider mt-3 mb-1.5 ${
                isLight ? 'text-slate-700' : 'text-slate-300'
              }`}
              {...props}
            />
          ),
          h6: ({ node, ...props }) => (
            <h6
              className={`text-xs font-semibold font-sans uppercase tracking-wider mt-2 mb-1 ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}
              {...props}
            />
          ),
          p: ({ node, ...props }) => (
            <p className={`text-sm leading-relaxed mb-3.5 font-sans ${isLight ? 'text-slate-700' : 'text-slate-300'}`} {...props} />
          ),
          ul: ({ node, className: ulClassName, ...props }) => {
            const isTaskList = ulClassName?.includes('contains-task-list');
            return (
              <ul
                className={`space-y-2 mb-4 text-sm font-sans ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                } ${
                  isTaskList ? 'list-none pl-0' : 'list-disc list-outside pl-5'
                }`}
                {...props}
              />
            );
          },
          ol: ({ node, ...props }) => (
            <ol className={`list-decimal list-outside pl-5 space-y-2 mb-4 text-sm font-sans ${isLight ? 'text-slate-700' : 'text-slate-300'}`} {...props} />
          ),
          li: ({ node, className: liClassName, children, ...props }) => {
            const isTaskItem = liClassName?.includes('task-list-item');
            return (
              <li
                className={`text-sm font-sans leading-relaxed ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                } ${
                  isTaskItem ? `flex items-start gap-2.5 my-1.5 p-2 rounded-lg ${isLight ? 'bg-slate-100 border border-slate-200 shadow-sm' : 'bg-slate-950/60 border border-white/5'}` : 'mb-1.5'
                }`}
                {...props}
              >
                {children}
              </li>
            );
          },
          input: ({ node, type, checked, ...props }) => {
            if (type === 'checkbox') {
              return (
                <span className="flex-shrink-0 mt-0.5">
                  {checked ? (
                    <CheckSquare size={14} className={isLight ? 'text-emerald-600' : 'text-[#00ff9d]'} />
                  ) : (
                    <Square size={14} className={isLight ? 'text-slate-400' : 'text-slate-500'} />
                  )}
                </span>
              );
            }
            return <input type={type} checked={checked} {...props} />;
          },
          code: ({ node, className: codeClassName, children, ...props }) => {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const codeString = String(children).replace(/\n$/, '');
            const isInline = !match && !String(children).includes('\n');
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded font-mono text-[11px] font-medium"
                  style={{
                    backgroundColor: `${accentColor}${isLight ? '15' : '18'}`,
                    color: accentColor,
                    borderColor: `${accentColor}${isLight ? '40' : '35'}`,
                    borderWidth: '1px'
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            if (match && match[1]?.toLowerCase() === 'mermaid') {
              return <MermaidDiagram codeString={codeString} nodeColor={accentColor} />;
            }
            return (
              <CodeBlock
                language={match ? match[1] : ''}
                codeString={codeString}
                nodeColor={accentColor}
                isLight={isLight}
              />
            );
          },
          blockquote: ({ node, children, ...props }) => {
            const text = String(children);
            const isWarning = text.includes('[!WARNING]') || text.includes('[!CAUTION]');
            const isTip = text.includes('[!TIP]') || text.includes('[!IMPORTANT]');
            const borderColor = isWarning
              ? (isLight ? '#e11d48' : '#ff3366')
              : isTip
              ? (isLight ? '#059669' : '#00ff9d')
              : accentColor;

            return (
              <blockquote
                className={`border-l-3 pl-3.5 py-2.5 my-4 rounded-r-lg font-sans text-xs leading-relaxed ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
                style={{
                  borderLeftColor: borderColor,
                  backgroundColor: `${borderColor}${isLight ? '10' : '0d'}`
                }}
                {...props}
              >
                {children}
              </blockquote>
            );
          },
          table: ({ node, ...props }) => (
            <div className={`overflow-x-auto my-5 border rounded-xl shadow-md ${
              isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-slate-950/60'
            }`}>
              <table className={`w-full text-xs border-collapse font-sans ${isLight ? 'text-slate-700' : 'text-slate-300'}`} {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th
              className={`border-b p-3 text-left font-mono font-bold text-[11px] tracking-wider ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/90 border-white/15'
              }`}
              style={{ color: accentColor }}
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td
              className={`border-b p-3 font-sans text-xs leading-relaxed ${
                isLight ? 'border-slate-100 text-slate-700' : 'border-white/5'
              }`}
              {...props}
            />
          ),
          hr: ({ node, ...props }) => (
            <hr className={`my-6 ${isLight ? 'border-slate-200' : 'border-white/10'}`} {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className={`font-bold font-sans tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`} {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="not-italic font-medium font-sans" style={{ color: accentColor }} {...props} />
          ),
          img: ({ node, src, alt, ...props }) => (
            <span className={`block my-4 rounded-xl overflow-hidden border shadow-xl ${
              isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#060a14]'
            }`}>
              <img
                src={src}
                alt={alt}
                className={`w-full max-h-[360px] object-contain p-2 ${isLight ? 'bg-slate-50' : 'bg-slate-950/60'}`}
                loading="lazy"
                {...props}
              />
              {alt && (
                <span className={`block text-center text-[10px] py-1.5 px-3 border-t font-mono ${
                  isLight ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-white/5 bg-slate-950/80 text-slate-400'
                }`}>
                  {alt}
                </span>
              )}
            </span>
          ),
          a: ({ node, href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline transition-colors font-medium ${isLight ? 'hover:text-cyan-700' : 'hover:text-[#00ff9d]'}`}
              style={{ color: accentColor }}
              {...props}
            >
              {children}
            </a>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownContent;
