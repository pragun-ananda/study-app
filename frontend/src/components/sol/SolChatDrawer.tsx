import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, RefreshCw, BookOpen, HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useSolStore } from '../../store/useSolStore';
import { useStore } from '../../store/useStore';

export default function SolChatDrawer() {
  const isOpen = useSolStore((state) => state.isOpen);
  const closeChat = useSolStore((state) => state.closeChat);
  const messages = useSolStore((state) => state.messages);
  const isLoading = useSolStore((state) => state.isLoading);
  const sendMessage = useSolStore((state) => state.sendMessage);
  const clearMessages = useSolStore((state) => state.clearMessages);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Active Context from Knowledge Graph
  const selectedTopicId = useStore((state) => state.selectedTopicId);
  const topicNodes = useStore((state) => state.topicNodes);
  const activeTopic = topicNodes.find((n) => n.id === selectedTopicId);
  const theme = useStore((state) => state.theme);
  const isSidebarOpen = useStore((state) => state.isSidebarOpen);
  const isInspectorOpen = useStore((state) => state.isInspectorOpen);
  const hasOtherPanelsOpen = Boolean(isSidebarOpen || isInspectorOpen);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const handleQuickPrompt = (promptText: string) => {
    if (isLoading) return;
    sendMessage(promptText);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className={`fixed inset-y-0 right-0 z-40 w-full ${
            hasOtherPanelsOpen
              ? 'sm:w-[350px] md:w-[380px] lg:w-[400px]'
              : 'sm:w-[400px] md:w-[440px] lg:w-[460px]'
          } h-full flex flex-col border-l shadow-2xl backdrop-blur-xl overflow-hidden ${
            theme === 'light'
              ? 'bg-white/95 border-slate-200 text-slate-800'
              : 'bg-[#060c18]/95 border-cyan-500/20 shadow-cyan-950/50 text-slate-100'
          }`}
          data-testid="sol-chat-drawer"
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b flex-shrink-0 ${
              theme === 'light'
                ? 'bg-gradient-to-r from-cyan-500/10 via-sky-500/5 to-transparent border-slate-200'
                : 'bg-gradient-to-r from-cyan-950/60 via-slate-900/60 to-transparent border-cyan-500/20'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <div className="relative w-7 h-7 rounded-full bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-400/30">
                <Sparkles className="w-4 h-4 animate-spin-slow" />
              </div>
              <div className="flex items-center">
                <span className="font-semibold text-sm tracking-wide text-cyan-400">Sol</span>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={clearMessages}
                title="Restart conversation"
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={closeChat}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700/30 transition-colors"
                aria-label="Close Sol Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Graph Context Banner */}
          {activeTopic && (
            <div
              className={`px-3.5 py-1.5 text-xs flex items-center justify-between border-b ${
                theme === 'light'
                  ? 'bg-cyan-50/80 text-cyan-900 border-cyan-200/50'
                  : 'bg-cyan-950/30 text-cyan-300 border-cyan-900/40'
              }`}
            >
              <div className="flex items-center space-x-1.5 truncate">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-[11px] text-slate-400">Current Topic:</span>
                <span className="font-medium text-cyan-400 truncate">{activeTopic.name}</span>
              </div>
              <span className="text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                {activeTopic.mastery}% mastery
              </span>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs custom-scrollbar">
            {messages.map((msg) => {
              const isSol = msg.sender === 'sol';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isSol ? 'justify-start' : 'justify-end'}`}
                >
                  {isSol && (
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 text-[10px] shrink-0 mt-0.5">
                      ⭐
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-sm leading-relaxed ${
                      isSol
                        ? theme === 'light'
                          ? 'bg-slate-100 border border-slate-200/80 text-slate-800'
                          : 'bg-cyan-950/30 border border-cyan-500/20 text-slate-200'
                        : theme === 'light'
                        ? 'bg-cyan-600 text-white rounded-br-none'
                        : 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-100 rounded-br-none'
                    }`}
                  >
                    {isSol ? (
                      <div className="prose prose-invert prose-xs max-w-none prose-p:my-1 prose-headings:my-1 prose-pre:my-1">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Sol Thinking Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 text-[10px] shrink-0 animate-bounce">
                  ⭐
                </div>
                <div
                  className={`rounded-2xl px-3.5 py-2.5 border text-xs flex items-center space-x-1.5 ${
                    theme === 'light'
                      ? 'bg-slate-100 border-slate-200/80 text-cyan-700'
                      : 'bg-cyan-950/30 border-cyan-500/20 text-cyan-300'
                  }`}
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="font-medium text-[11px]">Sol is thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Prompt Chips */}
          <div className="px-3.5 py-2 border-t border-slate-700/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() =>
                handleQuickPrompt(
                  activeTopic
                    ? `Can you quiz me on ${activeTopic.name}?`
                    : 'Can you give me a quick study quiz?'
                )
              }
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border flex items-center space-x-1 ${
                theme === 'light'
                  ? 'bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100'
                  : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/50'
              }`}
            >
              <HelpCircle className="w-3 h-3 text-cyan-400" />
              <span>Quiz me</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickPrompt(
                  activeTopic
                    ? `Explain ${activeTopic.name} like I'm 5 years old.`
                    : 'How should I start studying this knowledge graph?'
                )
              }
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border flex items-center space-x-1 ${
                theme === 'light'
                  ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Explain simply</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickPrompt('Give me a cosmic study motivation tip!')}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border flex items-center space-x-1 ${
                theme === 'light'
                  ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span>🚀 Motivation</span>
            </button>
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSubmit}
            className={`p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t flex items-center gap-2 ${
              theme === 'light'
                ? 'bg-slate-50/90 border-slate-200'
                : 'bg-slate-900/60 border-cyan-500/20'
            }`}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Sol anything about your studies..."
              className={`flex-1 px-3.5 py-2 text-base sm:text-xs rounded-xl border focus:outline-none focus:ring-1 transition-all ${
                theme === 'light'
                  ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500'
                  : 'bg-[#081528] border-cyan-900/60 text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:ring-cyan-400'
              }`}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`p-2 rounded-xl text-white transition-all shadow-md ${
                !input.trim() || isLoading
                  ? 'opacity-40 cursor-not-allowed bg-slate-700'
                  : 'bg-gradient-to-r from-cyan-500 to-sky-500 hover:brightness-110 active:scale-95 shadow-cyan-500/20'
              }`}
              aria-label="Send message to Sol"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
