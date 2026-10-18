import { create } from 'zustand';
import { useStore } from './useStore';

export interface SolMessage {
  id: string;
  sender: 'sol' | 'user';
  text: string;
  timestamp: number;
}

export type SolMood = 'idle' | 'happy' | 'thinking' | 'talking';

export type SolReactionTrigger = 'nod' | 'jump' | 'wave' | 'thumbsUp' | 'dance';

export interface SolReaction {
  trigger: SolReactionTrigger;
  timestamp: number;
}

interface SolState {
  isOpen: boolean;
  solMood: SolMood;
  messages: SolMessage[];
  isLoading: boolean;
  hasUnreadGreeting: boolean;
  lastReaction: SolReaction | null;

  // Actions
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  setIsOpen: (open: boolean) => void;
  setSolMood: (mood: SolMood) => void;
  triggerReaction: (trigger: SolReactionTrigger) => void;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
  dismissGreeting: () => void;
}

const INITIAL_MESSAGES: SolMessage[] = [
  {
    id: 'sol-welcome',
    sender: 'sol',
    text: "✨ *Twinkle twinkle!* Hi there! I'm **Sol**, your cosmic study companion! Whenever you're exploring the knowledge graph, reviewing notes, or tackling quizzes, click on me anytime! What are we learning today?",
    timestamp: Date.now()
  }
];

export const useSolStore = create<SolState>((set, get) => ({
  isOpen: false,
  solMood: 'idle',
  messages: INITIAL_MESSAGES,
  isLoading: false,
  hasUnreadGreeting: true,
  lastReaction: null,

  toggleChat: () => {
    const next = !get().isOpen;
    set({
      isOpen: next,
      hasUnreadGreeting: false,
      solMood: next ? 'happy' : 'idle'
    });
  },

  openChat: () => set({ isOpen: true, hasUnreadGreeting: false, solMood: 'happy' }),
  closeChat: () => set({ isOpen: false, solMood: 'idle' }),
  setIsOpen: (open: boolean) =>
    set({
      isOpen: open,
      solMood: open ? 'happy' : 'idle',
      ...(open ? { hasUnreadGreeting: false } : {})
    }),
  setSolMood: (mood: SolMood) => set({ solMood: mood }),
  triggerReaction: (trigger: SolReactionTrigger) => {
    set({ lastReaction: { trigger, timestamp: Date.now() } });
  },
  dismissGreeting: () => set({ hasUnreadGreeting: false }),

  clearMessages: () => set({ messages: INITIAL_MESSAGES }),

  sendMessage: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || get().isLoading) return;

    const userMessage: SolMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: 'user',
      text: trimmed,
      timestamp: Date.now()
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      solMood: 'thinking'
    }));

    try {
      // Collect study context from main store
      const mainState = useStore.getState();
      const selectedTopic = mainState.topicNodes.find((n) => n.id === mainState.selectedTopicId);
      const activeApp = mainState.activeApplication;
      const activeNote = mainState.activeNote;

      const contextPayload = {
        message: trimmed,
        context: {
          currentTopic: selectedTopic
            ? {
                name: selectedTopic.name,
                category: selectedTopic.category,
                mastery: selectedTopic.mastery,
                summary: selectedTopic.summary,
                status: selectedTopic.status
              }
            : null,
          activeApplication: activeApp ? activeApp.title : null,
          activeNote: activeNote ? activeNote.title : null,
          totalTopicsCount: mainState.topicNodes.length
        }
      };

      let replyText = '';

      // Try contacting the backend chat endpoint
      try {
        const response = await fetch('/api/sol/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contextPayload)
        });

        if (response.ok) {
          const data = await response.json();
          replyText = data.reply;
        } else {
          throw new Error(`Server returned ${response.status}`);
        }
      } catch (err) {
        // High quality offline / fallback response generator if backend is not reachable or during dev
        replyText = generateLocalSolReply(trimmed, selectedTopic?.name);
      }

      const solReply: SolMessage = {
        id: `sol-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: 'sol',
        text: replyText,
        timestamp: Date.now()
      };

      set((state) => ({
        messages: [...state.messages, solReply],
        isLoading: false,
        solMood: 'happy'
      }));

      // Return to idle after celebrating
      setTimeout(() => {
        if (get().solMood === 'happy') {
          set({ solMood: 'idle' });
        }
      }, 3500);
    } catch (error) {
      console.error('Failed to get response from Sol:', error);
      const errorReply: SolMessage = {
        id: `sol-err-${Date.now()}`,
        sender: 'sol',
        text: "✨ *Puff...* My cosmic stardust flickered for a second! Could you try asking me that again?",
        timestamp: Date.now()
      };

      set((state) => ({
        messages: [...state.messages, errorReply],
        isLoading: false,
        solMood: 'idle'
      }));
    }
  }
}));

function generateLocalSolReply(input: string, activeTopicName?: string): string {
  const lower = input.toLowerCase();

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return `✨ *Bounces cheerfully!* Hi friend! I'm **Sol**! Ready to blast off into some studying? ${
      activeTopicName ? `I see you're looking at **${activeTopicName}** right now!` : "Pick any node on the graph and let's explore!"
    }`;
  }

  if (lower.includes('quiz') || lower.includes('test')) {
    return activeTopicName
      ? `🌟 Ooh, quiz time! On **${activeTopicName}**, what do you think is the most important prerequisite or core mechanism? Explain it to me in your own words and I'll grade it with cosmic stars!`
      : "🌟 Pick a topic on the 3D map first, and I'll give you a fun pop quiz to boost your mastery level!";
  }

  if (lower.includes('hint') || lower.includes('explain') || lower.includes('help')) {
    return activeTopicName
      ? `💡 Here is a celestial hint for **${activeTopicName}**: Break it down into its fundamental inputs and outputs first! Check the notes attached to this node for code snippets and examples.`
      : "💡 I can explain any concept, summarize complex papers, or break down formulas. Just click on a node or type your question!";
  }

  if (lower.includes('who are you') || lower.includes('what are you')) {
    return "🤖 I'm **Sol**! Your 3D AI study companion bot with a sleek pearl-white finish and glowing cyan LED visor! I live right here inside your study app to keep you company, give study tips, and illuminate tricky concepts!";
  }

  return `✨ *Twinkles with starlight!* That's a great question! Regarding ${
    activeTopicName ? `**${activeTopicName}**` : 'your studies'
  }, remember that active recall and connecting ideas across your knowledge graph is the fastest way to master it! Need me to generate a quiz question or explain a tricky part?`;
}
