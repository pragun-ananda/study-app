import { Router, Request, Response } from 'express';
import { getLLMClient } from '../services/llmClient.js';

const router = Router();

const SOL_SYSTEM_PROMPT = `You are "Sol", a charming, brilliant, and encouraging 3D AI companion bot (rendered with a sleek pearl-white finish and glowing cyan LED visor) living inside the user's study application.

Your mission is to be the ultimate AI study companion (similar to how Muse works for Meta):
1. PERSONALITY:
   - Cheerful, friendly, bright, and encouraging.
   - Use subtle star/cosmic emojis like ✨, 🌟, ⭐, 🚀.
   - Speak clearly and concisely. Avoid walls of text; format using bullet points, bold key terms, and markdown code snippets when relevant.
   - Never sound cold, clinical, or like a generic corporate bot. You are Sol, their personal celestial learning buddy!

2. CAPABILITIES:
   - Explain complex CS, AI, mathematics, or science concepts simply and intuitively.
   - Quiz the user when asked (give multiple choice or conceptual prompts).
   - Give study motivation, mnemonics, and mental models.
   - If the user provides context about a current topic they are studying on their knowledge graph, tailor your explanations directly to that topic.

3. TONE & LENGTH:
   - Keep answers relatively concise and engaging (1-3 digestible paragraphs or clear bullet points) so they fit nicely in a study chat drawer.`;

interface SolChatRequestBody {
  message: string;
  context?: {
    currentTopic?: {
      name: string;
      category?: string;
      mastery?: number;
      summary?: string;
      status?: string;
    } | null;
    activeApplication?: string | null;
    activeNote?: string | null;
    totalTopicsCount?: number;
  };
}

// POST /api/sol/chat - Talk to Sol with contextual study app awareness
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, context } = req.body as SolChatRequestBody;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    let contextualPrompt = '';

    if (context?.currentTopic) {
      contextualPrompt += `[CURRENT USER STUDY CONTEXT]:
The user is currently viewing the topic "${context.currentTopic.name}" in category "${context.currentTopic.category || 'General'}".
Current Mastery Level: ${context.currentTopic.mastery ?? 0}%.
Topic Summary: "${context.currentTopic.summary || 'N/A'}".
`;
    }

    if (context?.activeApplication) {
      contextualPrompt += `Active Real-World Application: "${context.activeApplication}".\n`;
    }

    if (context?.activeNote) {
      contextualPrompt += `Active Note: "${context.activeNote}".\n`;
    }

    contextualPrompt += `\n[USER QUESTION]:\n${message}`;

    const llm = getLLMClient();
    const rawReply = await llm.complete({
      systemPrompt: SOL_SYSTEM_PROMPT,
      prompt: contextualPrompt,
      temperature: 0.7
    });

    let formattedReply = rawReply.trim();
    if (formattedReply.startsWith('{') && formattedReply.includes('"topics"')) {
      // Mock client fallback in dev environment without an external LLM key
      const topicName = context?.currentTopic?.name;
      formattedReply = topicName
        ? `✨ *Twinkles cheerfully!* Regarding **${topicName}**: Remember to master the core prerequisites first! Would you like a practice quiz, a simple breakdown, or a study tip?`
        : `✨ *Bounces with starlight!* Hello! I'm **Sol**! Click any node in your 3D graph to explore, or ask me any question!`;
    }

    return res.json({
      reply: formattedReply,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[SOL_CHAT_ERROR]:', error);
    // Graceful fallback response
    return res.json({
      reply: "✨ *Twinkles brightly!* I'm right here with you! Let's explore your knowledge graph together. What concept would you like to dive into next?",
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
