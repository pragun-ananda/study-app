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
      expect(extractDomainFromUrl('http://localhost:3000/docs')).toBe('localhost');
      expect(extractDomainFromUrl('invalid-url')).toBe('unknown.source');
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
  });
});
