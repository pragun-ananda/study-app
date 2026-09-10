import React, { useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import { MermaidDiagram } from './MermaidDiagram';

interface CodeBlockProps {
  language: string;
  codeString: string;
  nodeColor: string;
}

export function CodeBlock({ language, codeString, nodeColor }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-white/10 bg-[#060a14] shadow-2xl">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-950/90 border-b border-white/10 text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <Terminal size={12} style={{ color: nodeColor }} />
          <span className="font-bold tracking-wider" style={{ color: nodeColor }}>
            {language ? language.toUpperCase() : 'CODE'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 transition-colors border border-white/5 cursor-pointer"
          title="Copy code snippet"
        >
          {copied ? (
            <>
              <Check size={11} className="text-[#00ff9d]" />
              <span className="text-[#00ff9d] font-bold">COPIED</span>
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
          style={dracula}
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
  if (!content) return null;

  return (
    <div className={`prose prose-invert max-w-none text-sm leading-relaxed font-sans ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
        components={{
          h1: ({ node, ...props }) => (
            <h1
              className="text-lg font-bold font-sans tracking-wide border-b pb-2 mb-4 mt-2 flex items-center gap-2"
              style={{
                color: accentColor,
                borderColor: `${accentColor}30`
              }}
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className="text-base font-bold text-slate-100 font-sans tracking-wide mt-6 mb-3 flex items-center gap-2"
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className="text-sm font-semibold font-sans tracking-wide mt-4 mb-2"
              style={{ color: accentColor }}
              {...props}
            />
          ),
          p: ({ node, ...props }) => (
            <p className="text-slate-300 text-sm leading-relaxed mb-3 font-sans" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside space-y-1.5 mb-4 text-slate-300 text-sm font-sans" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside space-y-1.5 mb-4 text-slate-300 text-sm font-sans" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-slate-300 text-sm font-sans leading-relaxed" {...props} />
          ),
          code: ({ node, className: codeClassName, children, ...props }) => {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const codeString = String(children).replace(/\n$/, '');
            const isInline = !match && !String(children).includes('\n');
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded font-mono text-[11px]"
                  style={{
                    backgroundColor: `${accentColor}15`,
                    color: accentColor,
                    borderColor: `${accentColor}30`,
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
              />
            );
          },
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-2 pl-3 py-1.5 text-slate-400 italic my-3 rounded-r font-mono text-xs"
              style={{
                borderLeftColor: accentColor,
                backgroundColor: `${accentColor}0d`
              }}
              {...props}
            />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4 border border-white/10 rounded-lg">
              <table className="w-full text-xs text-slate-300 border-collapse font-mono" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th
              className="bg-slate-900 border-b border-white/10 p-2.5 text-left font-mono font-bold text-[11px]"
              style={{ color: accentColor }}
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td
              className="border-b border-white/5 p-2.5 font-mono text-[11px] bg-slate-950/40"
              {...props}
            />
          ),
          hr: ({ node, ...props }) => <hr className="border-white/10 my-4" {...props} />,
          strong: ({ node, ...props }) => <strong className="text-slate-100 font-bold font-mono" {...props} />,
          em: ({ node, ...props }) => (
            <em className="not-italic font-medium font-mono" style={{ color: accentColor }} {...props} />
          ),
          img: ({ node, src, alt, ...props }) => (
            <span className="block my-4 rounded-xl overflow-hidden border border-white/10 bg-[#060a14] shadow-xl">
              <img
                src={src}
                alt={alt}
                className="w-full max-h-[360px] object-contain bg-slate-950/60 p-2"
                loading="lazy"
                {...props}
              />
              {alt && (
                <span className="block text-center text-[10px] text-slate-400 py-1.5 px-3 border-t border-white/5 bg-slate-950/80 font-mono">
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
              className="underline hover:text-[#00ff9d] transition-colors"
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
