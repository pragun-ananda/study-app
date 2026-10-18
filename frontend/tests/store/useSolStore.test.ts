import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useSolStore } from '../../src/store/useSolStore';
import { useStore } from '../../src/store/useStore';

describe('Sol AI Persona Store (useSolStore)', () => {
  beforeEach(() => {
    useSolStore.getState().clearMessages();
    useSolStore.getState().closeChat();
    useStore.getState().resetState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default welcome message and closed state', () => {
    const state = useSolStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.solMood).toBe('idle');
    expect(state.messages.length).toBeGreaterThan(0);
    expect(state.messages[0].sender).toBe('sol');
    expect(state.messages[0].text).toContain('Sol');
  });

  it('toggles chat drawer state and sets mood to happy on open', () => {
    expect(useSolStore.getState().isOpen).toBe(false);

    useSolStore.getState().toggleChat();
    expect(useSolStore.getState().isOpen).toBe(true);
    expect(useSolStore.getState().hasUnreadGreeting).toBe(false);
    expect(useSolStore.getState().solMood).toBe('happy');

    useSolStore.getState().toggleChat();
    expect(useSolStore.getState().isOpen).toBe(false);
    expect(useSolStore.getState().solMood).toBe('idle');
  });

  it('dismisses unread greeting badge', () => {
    useSolStore.setState({ hasUnreadGreeting: true });
    useSolStore.getState().dismissGreeting();
    expect(useSolStore.getState().hasUnreadGreeting).toBe(false);
  });

  it('sends user message and receives Sol reply with fallback or mock', async () => {
    // Mock global fetch to test API response
    const mockReply = '✨ *Twinkle!* Binary Search divides the search space in half each step!';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: mockReply, timestamp: new Date().toISOString() })
    } as any);

    await useSolStore.getState().sendMessage('How does binary search work?');

    const messages = useSolStore.getState().messages;
    expect(messages.length).toBe(3); // Initial welcome + user message + sol reply
    expect(messages[1].sender).toBe('user');
    expect(messages[1].text).toBe('How does binary search work?');
    expect(messages[2].sender).toBe('sol');
    expect(messages[2].text).toBe(mockReply);
    expect(useSolStore.getState().isLoading).toBe(false);
  });

  it('falls back to local heuristic reply when backend is offline', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline'));

    await useSolStore.getState().sendMessage('Can you quiz me?');

    const messages = useSolStore.getState().messages;
    expect(messages.length).toBe(3);
    expect(messages[2].sender).toBe('sol');
    expect(messages[2].text).toContain('quiz');
    expect(useSolStore.getState().isLoading).toBe(false);
  });
});
