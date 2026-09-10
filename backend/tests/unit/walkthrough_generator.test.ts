import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateIngestionWalkthrough,
  extractDomainFromUrl
} from '../../src/services/walkthroughGenerator';
import { MockLLMClient } from '../../src/services/llmClient';
import { ExtractedTopic, GeneratedNote } from '../../src/types';

describe('Unit: Walkthrough Generator (src/services/walkthroughGenerator.ts)', () => {
  let mockLLM: MockLLMClient;

  beforeEach(() => {
    mockLLM = new MockLLMClient();
  });

  describe('extractDomainFromUrl', () => {
    it('extracts clean hostnames without protocol or www prefix', () => {
      expect(extractDomainFromUrl('https://www.nature.com/articles/s41586-020-2649-2')).toBe('nature.com');
      expect(extractDomainFromUrl('https://arxiv.org/abs/1706.03762')).toBe('arxiv.org');
      expect(extractDomainFromUrl('arxiv.org/abs/1706.03762')).toBe('arxiv.org');
      expect(extractDomainFromUrl('http://localhost:3000/docs')).toBe('localhost');
      expect(extractDomainFromUrl('invalid-url-with spaces')).toBe('unknown.source');
    });
  });

  describe('generateIngestionWalkthrough', () => {
    it('generates structured walkthrough with executive summary, extracted concepts, omitted content, and quiz justification', async () => {
      const extractedTopics: ExtractedTopic[] = [
        {
          name: 'Attention Mechanisms',
          category: 'AI & ML',
          summary: 'Self-attention and multi-head attention foundations.',
          importance: 95,
          complexity: 80,
          suggestedNotes: ['Attention Foundations']
        }
      ];

      const notes: GeneratedNote[] = [
        {
          topicName: 'Attention Mechanisms',
          title: 'Attention Foundations',
          category: 'AI & ML',
          content: `
## 1. Prerequisites Header
- Linear Algebra

## 7. Failure Modes
- Softmax gradient saturation without scaling factor
- Attention distribution collapse on long contexts

## 8. Retention Checklist
- Scaling factor explanation
          `.trim()
        }
      ];

      const result = await generateIngestionWalkthrough({
        url: 'https://arxiv.org/abs/1706.03762',
        rawContent: 'Attention mechanisms allow models to focus on different positions dynamically.',
        extractedTopics,
        notes,
        quizzes: [
          {
            topicName: 'Attention Mechanisms',
            title: 'Attention Quiz',
            questions: [
              {
                type: 'MCQ',
                prompt: 'Why is the scaling factor sqrt(d_k) applied?',
                correctAnswer: 'To prevent softmax saturation',
                explanation: 'Prevents vanishing gradients.',
                difficulty: 'INTERMEDIATE',
                payload: {
                  options: [{ id: 'A', text: 'To prevent softmax saturation' }]
                }
              }
            ]
          }
        ],
        options: { llmClient: mockLLM }
      });

      expect(result.sourceMetadata.domain).toBe('arxiv.org');
      expect(result.walkthrough).toBeDefined();
      expect(result.walkthrough.executiveSummary).toContain('Synthesized');
      expect(result.walkthrough.extractedConcepts.length).toBeGreaterThan(0);
      expect(result.walkthrough.omittedContent.length).toBeGreaterThan(0);
      expect(result.walkthrough.quizCoverageJustification.completenessRationale).toBeTruthy();
      expect(result.walkthrough.quizCoverageJustification.coverageScore).toBeGreaterThanOrEqual(90);
      expect(result.walkthrough.quizCoverageJustification.testedFailureModes.length).toBeGreaterThan(0);
    });

    it('returns fallback walkthrough when no topics are extracted', async () => {
      const result = await generateIngestionWalkthrough({
        url: 'https://empty-content.example.com',
        rawContent: '',
        extractedTopics: [],
        notes: [],
        options: { llmClient: mockLLM }
      });

      expect(result.walkthrough.extractedConcepts).toHaveLength(0);
      expect(result.walkthrough.omittedContent).toHaveLength(1);
      expect(result.walkthrough.quizCoverageJustification.coverageScore).toBe(100);
      expect(result.sourceMetadata.domain).toBe('empty-content.example.com');
    });

    it('synthesizes omitted content from rejectedTopics when LLM returns empty omittedContent', async () => {
      mockLLM.setCustomHandler(async () => {
        return JSON.stringify({
          executiveSummary: 'Custom summary',
          extractedConcepts: [{ name: 'Core Concept', rationale: 'Essential' }],
          omittedContent: [],
          quizCoverageJustification: {
            completenessRationale: 'Comprehensive coverage',
            testedFailureModes: ['Edge case'],
            coverageScore: 90
          }
        });
      });

      const result = await generateIngestionWalkthrough({
        url: 'https://example.com/deep-dive',
        rawContent: 'Sample content with peripheral sections.',
        extractedTopics: [
          {
            name: 'Core Concept',
            category: 'Systems',
            summary: 'Summary',
            importance: 90,
            complexity: 70,
            suggestedNotes: ['Note 1']
          }
        ],
        rejectedTopics: [
          { name: 'Hardware Setup', reason: 'Too hardware-specific and non-conceptual.' },
          { name: 'Version History', reason: 'Incidental changelog details.' }
        ],
        notes: [],
        options: { llmClient: mockLLM }
      });

      expect(result.walkthrough.omittedContent).toHaveLength(2);
      expect(result.walkthrough.omittedContent[0].contentSnippetOrTheme).toBe('Hardware Setup');
      expect(result.walkthrough.omittedContent[0].reason).toBe('Too hardware-specific and non-conceptual.');
      expect(result.walkthrough.omittedContent[1].contentSnippetOrTheme).toBe('Version History');
    });

    it('synthesizes default omitted content when LLM returns empty omittedContent and no rejectedTopics are present', async () => {
      mockLLM.setCustomHandler(async () => {
        return JSON.stringify({
          executiveSummary: 'Custom summary',
          extractedConcepts: [{ name: 'Core Concept', rationale: 'Essential' }],
          omittedContent: [],
          quizCoverageJustification: {
            completenessRationale: 'Comprehensive coverage',
            testedFailureModes: ['Edge case'],
            coverageScore: 90
          }
        });
      });

      const result = await generateIngestionWalkthrough({
        url: 'https://example.com/deep-dive',
        rawContent: 'Sample content without rejected topics.',
        extractedTopics: [
          {
            name: 'Core Concept',
            category: 'Systems',
            summary: 'Summary',
            importance: 90,
            complexity: 70,
            suggestedNotes: ['Note 1']
          }
        ],
        notes: [],
        options: { llmClient: mockLLM }
      });

      expect(result.walkthrough.omittedContent).toHaveLength(1);
      expect(result.walkthrough.omittedContent[0].contentSnippetOrTheme).toContain('Peripheral setup details');
      expect(result.walkthrough.omittedContent[0].reason).toContain('Omitted incidental narrative');
    });

    it('handles LLM failure gracefully and falls back to rejectedTopics if available', async () => {
      mockLLM.setCustomHandler(async () => {
        throw new Error('LLM service unavailable');
      });

      const result = await generateIngestionWalkthrough({
        url: 'https://example.com/failure-case',
        rawContent: 'Sample content during LLM outage.',
        extractedTopics: [
          {
            name: 'Fault Tolerance',
            category: 'Distributed Systems',
            summary: 'Fault tolerance mechanisms',
            importance: 85,
            complexity: 75,
            suggestedNotes: ['FT Note']
          }
        ],
        rejectedTopics: [
          { name: 'Installation Script', reason: 'Pruned setup script' }
        ],
        notes: [],
        options: { llmClient: mockLLM }
      });

      expect(result.walkthrough.executiveSummary).toContain('Synthesized 1 topic nodes');
      expect(result.walkthrough.extractedConcepts).toHaveLength(1);
      expect(result.walkthrough.omittedContent).toHaveLength(1);
      expect(result.walkthrough.omittedContent[0].contentSnippetOrTheme).toBe('Installation Script');
      expect(result.walkthrough.omittedContent[0].reason).toBe('Pruned setup script');
    });
  });
});
