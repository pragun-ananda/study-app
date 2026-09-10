import React, { useState, useEffect } from 'react';
import mermaid from 'mermaid';
import { Terminal, Copy, Check } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useStore } from '../../store/useStore';

if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'antiscript',
    themeVariables: {
      darkMode: true,
      background: '#060a14',
      primaryColor: '#00f0ff',
      primaryTextColor: '#f8fafc',
      primaryBorderColor: '#00f0ff40',
      lineColor: '#64748b',
      secondaryColor: '#1e293b',
      tertiaryColor: '#0f172a'
    }
  });
}

export interface MermaidDiagramProps {
  codeString: string;
  nodeColor?: string;
}

export function MermaidDiagram({ codeString, nodeColor = '#00f0ff' }: MermaidDiagramProps) {
  const theme = useStore((state) => state.theme);
  const isLight = theme === 'light';

  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'DIAGRAM' | 'CODE'>('DIAGRAM');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: isLight ? 'default' : 'dark',
          securityLevel: 'antiscript',
          themeVariables: isLight
            ? {
                darkMode: false,
                background: '#ffffff',
                primaryColor: nodeColor,
                primaryTextColor: '#0f172a',
                primaryBorderColor: `${nodeColor}60`,
                lineColor: '#64748b',
                secondaryColor: '#f1f5f9',
                tertiaryColor: '#e2e8f0'
              }
            : {
                darkMode: true,
                background: '#060a14',
                primaryColor: '#00f0ff',
                primaryTextColor: '#f8fafc',
                primaryBorderColor: '#00f0ff40',
                lineColor: '#64748b',
                secondaryColor: '#1e293b',
                tertiaryColor: '#0f172a'
              }
        });

        const cleanCode = codeString.trim();
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const result = await mermaid.render(id, cleanCode);
        if (isMounted) {
          setSvg(result.svg);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to render diagram');
        }
      }
    };

    renderDiagram();
    return () => {
      isMounted = false;
    };
  }, [codeString, isLight, nodeColor]);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error || viewMode === 'CODE' || !svg) {
    return (
      <div className={`relative my-4 rounded-xl overflow-hidden border shadow-xl ${
        isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#060a14]'
      }`}>
        <div className={`flex items-center justify-between px-3.5 py-1.5 border-b text-[11px] font-mono ${
          isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-950/90 border-white/10 text-slate-400'
        }`}>
          <div className="flex items-center gap-2">
            <Terminal size={12} style={{ color: nodeColor }} />
            <span className="font-bold tracking-wider" style={{ color: error ? (isLight ? '#e11d48' : '#f43f5e') : nodeColor }}>
              {error ? 'MERMAID CODE (SYNTAX ERROR)' : 'MERMAID CODE'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {svg && (
              <button
                onClick={() => setViewMode('DIAGRAM')}
                className={`px-2 py-0.5 rounded text-[10px] border cursor-pointer ${
                  isLight
                    ? 'text-cyan-700 bg-white border-cyan-300 hover:bg-cyan-50'
                    : 'text-cyan-400 bg-slate-900/90 hover:bg-slate-800 border-cyan-500/30'
                }`}
              >
                SHOW DIAGRAM
              </button>
            )}
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] transition-colors border cursor-pointer ${
                isLight
                  ? 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200'
                  : 'text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border-white/5'
              }`}
              title="Copy diagram code"
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
        </div>
        {error && (
          <div className={`px-3.5 py-1.5 border-b text-[11px] font-mono leading-tight ${
            isLight ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            {error}
          </div>
        )}
        <div className="overflow-x-auto text-[11.5px] font-mono leading-relaxed">
          <SyntaxHighlighter
            language="mermaid"
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

  return (
    <div className={`relative my-4 rounded-xl overflow-hidden border shadow-xl ${
      isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#060a14]'
    }`}>
      <div className={`flex items-center justify-between px-3.5 py-1.5 border-b text-[11px] font-mono ${
        isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-950/90 border-white/10 text-slate-400'
      }`}>
        <div className="flex items-center gap-2">
          <Terminal size={12} style={{ color: nodeColor }} />
          <span className="font-bold tracking-wider" style={{ color: nodeColor }}>
            MERMAID DIAGRAM
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('CODE')}
            className={`px-2 py-0.5 rounded text-[10px] transition-colors border cursor-pointer ${
              isLight
                ? 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200'
                : 'text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border-white/5'
            }`}
          >
            VIEW CODE
          </button>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] transition-colors border cursor-pointer ${
              isLight
                ? 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200'
                : 'text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border-white/5'
            }`}
            title="Copy diagram definition"
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
      </div>
      <div
        className="p-4 flex justify-center items-center overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

export default MermaidDiagram;
