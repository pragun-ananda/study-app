import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import * as llmClientModule from '../../src/services/llmClient.js';

describe('Integration: Sol AI Persona (POST /api/sol/chat)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects requests with missing or empty message with 400 Bad Request', async () => {
    const res = await request(app).post('/api/sol/chat').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Message is required');
  });

  it('successfully replies to a user question with Sol persona and active context', async () => {
    const mockReply = "✨ *Twinkles!* Dynamic Programming remembers past answers so you never repeat work!";
    const mockLLM = {
      complete: vi.fn().mockResolvedValue(mockReply)
    };
    vi.spyOn(llmClientModule, 'getLLMClient').mockReturnValue(mockLLM as any);

    const res = await request(app)
      .post('/api/sol/chat')
      .send({
        message: 'What is memoization in DP?',
        context: {
          currentTopic: {
            name: 'Dynamic Programming',
            category: 'ALGORITHMS',
            mastery: 45,
            summary: 'Algorithmic optimization breaking problems into overlapping subproblems.'
          }
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe(mockReply);
    expect(res.body.timestamp).toBeDefined();
    expect(mockLLM.complete).toHaveBeenCalled();

    const callArgs = mockLLM.complete.mock.calls[0][0];
    expect(callArgs.systemPrompt).toContain('Sol');
    expect(callArgs.prompt).toContain('Dynamic Programming');
    expect(callArgs.prompt).toContain('What is memoization in DP?');
  });
});
