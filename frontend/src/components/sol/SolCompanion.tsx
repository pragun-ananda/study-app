import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MessageCircle } from 'lucide-react';
import SolAvatar from './SolAvatar';
import SolChatDrawer from './SolChatDrawer';
import { useSolStore } from '../../store/useSolStore';
import { useStore } from '../../store/useStore';

export default function SolCompanion() {
  const isOpen = useSolStore((state) => state.isOpen);
  const toggleChat = useSolStore((state) => state.toggleChat);
  const hasUnreadGreeting = useSolStore((state) => state.hasUnreadGreeting);
  const dismissGreeting = useSolStore((state) => state.dismissGreeting);
  const theme = useStore((state) => state.theme);

  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    toggleChat();
  };

  return (
    <>
      {/* Sol Chat Drawer Popover */}
      <SolChatDrawer />

      {/* Floating Sol Container (Bottom-Right) */}
      <div
        className="fixed bottom-4 right-6 z-40 flex flex-col items-end pointer-events-auto"
        data-testid="sol-companion"
      >
        {/* Thought Bubble / Welcome Hint */}
        <AnimatePresence>
          {hasUnreadGreeting && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.9 }}
              transition={{ delay: 0.8, duration: 0.3 }}
              onClick={handleClick}
              className={`mb-1 mr-2 px-3 py-1.5 rounded-2xl shadow-lg border text-xs cursor-pointer flex items-center space-x-1.5 backdrop-blur-md group hover:scale-105 transition-all ${
                theme === 'light'
                  ? 'bg-white/95 border-cyan-300 text-slate-800 shadow-cyan-900/10'
                  : 'bg-[#081528]/95 border-cyan-400/40 text-cyan-200 shadow-cyan-950/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow shrink-0" />
              <span className="font-medium text-[11px] group-hover:text-cyan-400 transition-colors">
                Hi, I'm <strong className="text-cyan-400">Sol</strong>! Click to chat ✨
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissGreeting();
                }}
                className="text-slate-400 hover:text-slate-200 text-xs ml-1"
                aria-label="Dismiss greeting"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sol 3D Avatar Trigger Button */}
        <button
          type="button"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleClick}
          aria-label="Chat with Sol"
          data-testid="sol-trigger-button"
          className="relative w-24 h-24 flex items-center justify-center cursor-pointer transition-transform duration-200 active:scale-95 focus:outline-none"
        >
          {/* Sol 3D Canvas */}
          <div className="w-full h-full pointer-events-none">
            <SolAvatar isHovered={isHovered} />
          </div>

          {/* Mini Status Badge / Open Indicator */}
          <div
            className={`absolute bottom-1 right-2 w-6 h-6 rounded-full flex items-center justify-center border shadow-md transition-all duration-300 pointer-events-none ${
              isOpen
                ? 'bg-cyan-500 text-white border-white scale-110'
                : 'bg-slate-900/80 text-cyan-400 border-cyan-400/50'
            }`}
          >
            {isOpen ? (
              <span className="text-[10px] font-bold">✕</span>
            ) : (
              <MessageCircle className="w-3.5 h-3.5" />
            )}
          </div>
        </button>
      </div>
    </>
  );
}
