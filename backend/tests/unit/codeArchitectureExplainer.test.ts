import { describe, it, expect } from 'vitest';
import {
  codeArchitectureExplainer,
  CodeArchitectureExplainer,
  ExplainCodeInput
} from '../../src/services/codeArchitectureExplainer.js';

describe('Unit: Code Architecture Explainer (codeArchitectureExplainer.ts)', () => {
  const sampleLockingInput: ExplainCodeInput = {
    repositoryName: 'redis/redis',
    filePath: 'src/server.c',
    language: 'c',
    startLine: 120,
    endLine: 145,
    codeSnippet: `
      pthread_mutex_lock(&server.lock);
      dictEntry *de = dictFind(server.db[0].dict, key);
      if (de) {
        val = dictGetVal(de);
        val->refcount++;
      }
      pthread_mutex_unlock(&server.lock);
    `,
    userNote: 'Why does Redis lock dictionary access here?'
  };

  const sampleAsyncInput: ExplainCodeInput = {
    repositoryName: 'nodejs/node',
    filePath: 'lib/internal/net.js',
    language: 'javascript',
    startLine: 50,
    endLine: 75,
    codeSnippet: `
      async function handleSocket(socket) {
        const stream = await socket.createReadStream();
        stream.on('data', (chunk) => {
          processBuffer(chunk);
        });
      }
    `
  };

  it('generateHeuristicExplanation accurately identifies locking concurrency patterns', () => {
    const explanation = codeArchitectureExplainer.generateHeuristicExplanation(sampleLockingInput);

    expect(explanation).toBeDefined();
    expect(explanation.summary).toContain('server.c');
    expect(explanation.architecturalRationale).toBeDefined();
    expect(explanation.designPatterns).toContain('Critical Section / Mutex Concurrency Control');
    expect(explanation.concurrencyAndFailureModes.raceConditionsAndDeadlocks).toContain('lock acquisition');
    expect(explanation.complexityAnalysis.timeComplexity).toBeDefined();
    expect(explanation.suggestedStudyQuestions.length).toBeGreaterThan(0);
  });

  it('generateHeuristicExplanation accurately identifies async event loop patterns', () => {
    const explanation = codeArchitectureExplainer.generateHeuristicExplanation(sampleAsyncInput);

    expect(explanation.designPatterns).toContain('Asynchronous Non-Blocking Event Loop');
    expect(explanation.concurrencyAndFailureModes.raceConditionsAndDeadlocks).toContain('Stateless or thread-confined');
    expect(explanation.suggestedStudyQuestions[0].question).toBeDefined();
  });

  it('explainCode returns complete valid explanation object with graceful fallback', async () => {
    const explainer = new CodeArchitectureExplainer();
    const explanation = await explainer.explainCode(sampleLockingInput);

    expect(explanation.summary).toBeTruthy();
    expect(explanation.architecturalRationale).toBeTruthy();
    expect(Array.isArray(explanation.designPatterns)).toBe(true);
    expect(explanation.concurrencyAndFailureModes).toHaveProperty('raceConditionsAndDeadlocks');
    expect(explanation.concurrencyAndFailureModes).toHaveProperty('memoryTradeoffs');
    expect(explanation.concurrencyAndFailureModes).toHaveProperty('spofOrBottleneck');
    expect(explanation.complexityAnalysis).toHaveProperty('timeComplexity');
    expect(explanation.complexityAnalysis).toHaveProperty('spaceComplexity');
    expect(explanation.suggestedStudyQuestions.length).toBeGreaterThanOrEqual(1);
  });
});
