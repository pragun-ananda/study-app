import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractHighFidelityTopics,
  safeParseJson,
  getExistingDomains,
  clearDomainsCache,
  MIN_CONTENT_CHARS
} from '../../src/services/topicExtractor.js';
import {
  MockLLMClient,
  OpenAIClient,
  LLMServiceError
} from '../../src/services/llmClient.js';
import {
  normalizeDomainCategory,
  registerDomainCategory,
  VALID_CATEGORIES
} from '../../src/utils/validation.js';

describe('Unit: Topic Extractor Service (src/services/topicExtractor.ts)', () => {
  beforeEach(() => {
    clearDomainsCache();
  });

  describe('Pre-check and Short Content Guard', () => {
    it('returns empty topics without invoking LLM when content is empty or below MIN_CONTENT_CHARS', async () => {
      const mockClient = new MockLLMClient();

      const emptyResult = await extractHighFidelityTopics('', { llmClient: mockClient });
      expect(emptyResult.topics).toEqual([]);
      expect(emptyResult.validationReport?.totalApproved).toBe(0);
      expect(mockClient.getCallHistory().length).toBe(0);

      const shortContent = 'This is too short.';
      expect(shortContent.length).toBeLessThan(MIN_CONTENT_CHARS);

      const shortResult = await extractHighFidelityTopics(shortContent, { llmClient: mockClient });
      expect(shortResult.topics).toEqual([]);
      expect(mockClient.getCallHistory().length).toBe(0);
    });
  });

  describe('Extraction & Mapping to Existing Domains', () => {
    it('extracts high-fidelity topics and maps to existing AI & ML domain', async () => {
      const mockClient = new MockLLMClient();
      const content = `
# Attention Is All You Need

The Transformer is a deep learning architecture that eschews recurrence and convolutions entirely,
relying solely on self-attention mechanisms to draw global dependencies between input and output tokens.
Multi-Head Attention enables the model to jointly attend to information from different representation subspaces.
Scalable training allows unprecedented parallelization on modern GPU clusters.
      `.repeat(3);

      const result = await extractHighFidelityTopics(content, { llmClient: mockClient });

      expect(result.topics.length).toBeGreaterThan(0);
      expect(result.topics.some((t) => t.name === 'Transformer Self-Attention')).toBe(true);
      expect(result.topics[0].category).toBe('AI & ML');
      expect(result.topics[0].summary.length).toBeGreaterThan(10);
      expect(result.validationReport?.totalApproved).toBe(result.topics.length);
      expect(mockClient.getCallHistory().length).toBe(2); // Generator + Critic
    });
  });

  describe('Dynamic Domain Emergence (e.g. Photography Subgraph)', () => {
    it('proposes new PHOTOGRAPHY domain for photography content and flags isNewDomain', async () => {
      const mockClient = new MockLLMClient();
      const photoContent = `
# Mastering the Exposure Triangle in Modern Photography

Photography requires balancing three critical pillars: Aperture, Shutter Speed, and ISO.
The Exposure Triangle dictates how photons interact with the camera sensor to create a balanced exposure.
Aperture controls the depth of field: wide apertures produce a shallow depth of field with creamy bokeh,
while narrow apertures ensure foreground-to-background sharpness in landscape photography.
Shutter speed controls motion blur and action freezing.
      `.repeat(3);

      const result = await extractHighFidelityTopics(photoContent, { llmClient: mockClient });

      expect(result.topics.length).toBeGreaterThan(0);
      expect(result.suggestedNewDomains).toContain('PHOTOGRAPHY');

      const exposureTopic = result.topics.find((t) => t.name === 'Exposure Triangle');
      expect(exposureTopic).toBeDefined();
      expect(exposureTopic?.category).toBe('PHOTOGRAPHY');
      expect(exposureTopic?.isNewDomain).toBe(true);

      // Verify domain was registered into VALID_CATEGORIES
      expect(VALID_CATEGORIES).toContain('PHOTOGRAPHY');
    });
  });

  describe('Critic Evaluation & Granularity Filtering', () => {
    it('critic filters out overly broad umbrellas and trivial code syntax', async () => {
      const mockClient = new MockLLMClient();

      // Custom handler where Generator proposes mix of good, too broad, and too narrow
      mockClient.setHandler((options) => {
        const isCritic = options.systemPrompt.includes('Critic') || options.systemPrompt.includes('Validator');
        if (!isCritic) {
          return JSON.stringify({
            topics: [
              { name: 'Computer Science', category: 'CS', summary: 'The study of computers.' },
              { name: 'Binary Search Tree Balancing', category: 'CS', summary: 'AVL self-balancing rotation algorithms.' },
              { name: 'x = i + 1', category: 'CS', summary: 'Incrementing loop variable.' }
            ]
          });
        } else {
          return JSON.stringify({
            approvedTopics: [
              {
                name: 'Binary Search Tree Balancing',
                category: 'CS',
                summary: 'AVL self-balancing rotation algorithms.',
                proposedPrerequisites: []
              }
            ],
            rejectedTopics: [
              { name: 'Computer Science', reason: 'Too broad - discipline umbrella' },
              { name: 'x = i + 1', reason: 'Too narrow - single line code variable' }
            ]
          });
        }
      });

      const substantiveContent = 'Binary search trees maintain sorted keys for logarithmic search operations.'.repeat(10);
      const result = await extractHighFidelityTopics(substantiveContent, { llmClient: mockClient });

      expect(result.topics.length).toBe(1);
      expect(result.topics[0].name).toBe('Binary Search Tree Balancing');
      expect(result.validationReport?.rejectedTopics.length).toBe(2);
      expect(result.validationReport?.rejectedTopics[0].name).toBe('Computer Science');
    });
  });

  describe('Critic Fallback Resilience', () => {
    it('gracefully falls back to sanitized Generator candidates if Critic times out or fails', async () => {
      const mockClient = new MockLLMClient();
      let criticCalls = 0;

      mockClient.setHandler((options) => {
        const isCritic = options.systemPrompt.includes('Critic') || options.systemPrompt.includes('Validator');
        if (!isCritic) {
          return JSON.stringify({
            topics: [
              {
                name: 'Gradient Descent Optimization',
                category: 'AI & ML',
                summary: 'First-order iterative optimization algorithm for finding a local minimum of a differentiable function.',
                proposedPrerequisites: ['Calculus Derivatives']
              }
            ]
          });
        } else {
          criticCalls++;
          throw new LLMServiceError(504, 'Critic timeout after 6000ms');
        }
      });

      const content = 'Gradient descent iteratively steps in direction of negative gradient.'.repeat(10);
      const result = await extractHighFidelityTopics(content, { llmClient: mockClient });

      expect(criticCalls).toBe(1);
      // Fallback succeeded without throwing
      expect(result.topics.length).toBe(1);
      expect(result.topics[0].name).toBe('Gradient Descent Optimization');
      expect(result.topics[0].category).toBe('AI & ML');
    });
  });

  describe('Post-Processing & Safety Guards', () => {
    it('eliminates self-referential prerequisites (chk_no_self_prerequisite)', async () => {
      const mockClient = new MockLLMClient((options) => {
        return JSON.stringify({
          topics: [
            {
              name: 'Recursion Fundamentals',
              category: 'CS',
              summary: 'Functions calling themselves with base cases.',
              proposedPrerequisites: ['Recursion Fundamentals', 'Stack Memory']
            }
          ],
          approvedTopics: [
            {
              name: 'Recursion Fundamentals',
              category: 'CS',
              summary: 'Functions calling themselves with base cases.',
              proposedPrerequisites: ['Recursion Fundamentals', 'Stack Memory']
            }
          ],
          rejectedTopics: []
        });
      });

      const content = 'Recursion involves dividing a problem into smaller instances.'.repeat(10);
      const result = await extractHighFidelityTopics(content, { llmClient: mockClient });

      expect(result.topics[0].prerequisites).not.toContain('Recursion Fundamentals');
      expect(result.topics[0].prerequisites).toContain('Stack Memory');
    });

    it('deduplicates duplicate candidate names case-insensitively', async () => {
      const mockClient = new MockLLMClient((options) => {
        return JSON.stringify({
          topics: [
            { name: 'Backpropagation', category: 'AI & ML', summary: 'Reverse autograd.' },
            { name: 'backpropagation', category: 'AI & ML', summary: 'Duplicate lowercase.' }
          ],
          approvedTopics: [
            { name: 'Backpropagation', category: 'AI & ML', summary: 'Reverse autograd.' },
            { name: 'backpropagation', category: 'AI & ML', summary: 'Duplicate lowercase.' }
          ],
          rejectedTopics: []
        });
      });

      const content = 'Backpropagation computes the gradient of loss function with respect to weights.'.repeat(10);
      const result = await extractHighFidelityTopics(content, { llmClient: mockClient });

      expect(result.topics.length).toBe(1);
      expect(result.topics[0].name).toBe('Backpropagation');
    });
  });

  describe('Utilities & Parsing', () => {
    it('safeParseJson correctly handles markdown code fences', () => {
      const rawWithFences = '```json\n{"key": "value"}\n```';
      expect(safeParseJson<{ key: string }>(rawWithFences)).toEqual({ key: 'value' });

      const rawWithoutFences = '{"key": "value2"}';
      expect(safeParseJson<{ key: string }>(rawWithoutFences)).toEqual({ key: 'value2' });
    });

    it('normalizes domain categories to uppercase without symbols', () => {
      expect(normalizeDomainCategory('photography')).toBe('PHOTOGRAPHY');
      expect(normalizeDomainCategory('cyber-security')).toBe('CYBER SECURITY');
      expect(normalizeDomainCategory('  systems_architecture  ')).toBe('SYSTEMS ARCHITECTURE');
    });

    it('getExistingDomains merges default domains with custom domains', async () => {
      const domains = await getExistingDomains(['NEUROSCIENCE', 'AI & ML']);
      expect(domains).toContain('NEUROSCIENCE');
      expect(domains).toContain('AI & ML');
      expect(domains).toContain('MATH');
    });
  });
});
