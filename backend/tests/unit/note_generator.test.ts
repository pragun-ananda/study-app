import { describe, it, expect } from 'vitest';
import {
  generateSingleTopicNote,
  generateTopicNotes,
  validateNoteFormatting,
  extractTopicRelevantContext,
  DEFAULT_MAX_REFINEMENT_ITERATIONS
} from '../../src/services/noteGenerator.js';
import { MockLLMClient } from '../../src/services/llmClient.js';
import { ExtractedTopic } from '../../src/types.js';

describe('Unit: Note Generator Service (src/services/noteGenerator.ts)', () => {
  const sampleTopic: ExtractedTopic = {
    name: 'Transformer Self-Attention',
    category: 'AI & ML',
    summary: 'Scaled dot-product mechanism enabling sequence modeling across context windows.'
  };

  const sampleMarkdown = `
# Attention Mechanisms in Deep Learning

Attention mechanisms compute dynamic similarity weights between query and key vectors.

## Mathematical Formulation
The core formula is given by:

$$
\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V
$$

The scaling factor prevents vanishing gradients in softmax when $d_k$ is large.

## Architecture and Code
\`\`\`python
import torch

def attention(Q, K, V):
    return torch.matmul(torch.softmax(torch.matmul(Q, K.T), dim=-1), V)
\`\`\`

## Edge Cases and Pitfalls
Sequence length quadratic complexity $O(N^2)$ is the primary computational bottleneck.
  `;

  describe('Formatting & LaTeX Syntax Integrity Validation', () => {
    it('passes valid markdown with balanced display math, inline math, and code blocks', () => {
      const validMarkdown = `
# Title
Formula: $E = mc^2$
Display:
$$
a^2 + b^2 = c^2
$$
\`\`\`ts
const x = 1;
\`\`\`
      `;
      const result = validateNoteFormatting(validMarkdown);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('flags unbalanced display math ($$)', () => {
      const invalid = `
# Broken Math
$$
\\text{Unclosed display formula
      `;
      const result = validateNoteFormatting(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('display math'))).toBe(true);
    });

    it('flags unbalanced inline math ($)', () => {
      const invalid = `
# Broken Inline
Here is an open $math formula without closing delimiter.
      `;
      const result = validateNoteFormatting(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('inline math'))).toBe(true);
    });

    it('flags unbalanced markdown code fences (```)', () => {
      const invalid = `
# Broken Code
\`\`\`python
print("missing closing fence")
      `;
      const result = validateNoteFormatting(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('code fences'))).toBe(true);
    });
  });

  describe('Topic-Context Windowing', () => {
    it('returns full document if within bounds', () => {
      const shortDoc = '# Title\nShort content.';
      const context = extractTopicRelevantContext(shortDoc, sampleTopic);
      expect(context).toBe(shortDoc);
    });

    it('extracts relevant sections matching topic keywords for large documents', () => {
      const largeDoc = `
# Overview of Deep Learning
This document covers deep learning paradigms.

## Convolutional Neural Networks
CNNs use spatial convolutions for computer vision. ${'More details on vision. '.repeat(400)}

## Transformer Self-Attention
Attention calculates affinities between tokens. ${'Detailed attention math. '.repeat(400)}

## Reinforcement Learning
Policy gradients and Q-learning. ${'More details on agents. '.repeat(400)}
      `;

      const context = extractTopicRelevantContext(largeDoc, sampleTopic);
      expect(context.length).toBeLessThanOrEqual(14000);
      expect(context.toLowerCase()).toContain('self-attention');
    });
  });

  describe('Single Topic Note Generation & Critic Review', () => {
    it('generates high-fidelity 8-part note and passes critic audit', async () => {
      const mockClient = new MockLLMClient();
      const { note, auditReport } = await generateSingleTopicNote(sampleTopic, sampleMarkdown, {
        llmClient: mockClient
      });

      expect(note.title).toBe('Transformer Self-Attention');
      expect(note.content).toContain('Prerequisites');
      expect(note.content).toContain('1. Problem Context & The "Why"');
      expect(note.content).toContain('2. Conceptual Core & Mental Model');
      expect(note.content).toContain('3. Formal Deep-Dive Specification');
      expect(note.content).toContain('4. Concrete Implementation & Code Patterns');
      expect(note.content).toContain('5. Step-by-Step Worked Trace / Execution Flow');
      expect(note.content).toContain('6. Trade-Offs, Alternatives & Decision Matrix');
      expect(note.content).toContain('7. Failure Modes, Edge Cases & Common Pitfalls');
      expect(note.content).toContain('8. Summary & Key Takeaways Checklist');
      expect(note.keyFormulas).toBeDefined();
      expect(note.codeSnippetsCount).toBeGreaterThan(0);

      expect(auditReport.passed).toBe(true);
      expect(auditReport.coverageScore).toBeGreaterThanOrEqual(90);
      expect(auditReport.refinementIterations).toBe(0);
    });

    it('strictly caps the refinement loop at maxRefinementIterations (2) when critic rejects', async () => {
      let callCount = 0;
      const mockClient = new MockLLMClient((options) => {
        callCount++;
        const sys = options.systemPrompt.toLowerCase();
        if (sys.includes('note critic') || sys.includes('coverage auditor')) {
          // Continually fail to trigger loop
          return JSON.stringify({
            passed: false,
            coverageScore: 60,
            missingConcepts: ['Missing parameter d_k derivation'],
            hallucinations: [],
            syntaxErrors: [],
            feedback: 'Missing parameter d_k derivation'
          });
        }
        return `# Transformer Self-Attention\n## 1. Conceptual Core\nAttempt ${callCount}`;
      });

      const { auditReport } = await generateSingleTopicNote(sampleTopic, sampleMarkdown, {
        llmClient: mockClient,
        maxRefinementIterations: 2
      });

      // Initial generation (iteration 0) + 2 refinement passes (iteration 1, 2)
      expect(auditReport.refinementIterations).toBe(2);
      expect(auditReport.passed).toBe(false);
      // Each iteration did 1 generator + 1 critic call = 6 total calls
      expect(callCount).toBe(6);
    });
  });

  describe('Batch Parallel Note Generation', () => {
    it('generates notes for multiple topics in parallel', async () => {
      const mockClient = new MockLLMClient();
      const topics: ExtractedTopic[] = [
        sampleTopic,
        {
          name: 'Multi-Head Attention',
          category: 'AI & ML',
          summary: 'Parallel attention projections capturing distinct representation subspaces.'
        }
      ];

      const result = await generateTopicNotes(topics, sampleMarkdown, { llmClient: mockClient });
      expect(result.notes).toHaveLength(2);
      expect(result.auditReports).toHaveLength(2);
      expect(result.auditReports?.every((a) => a.passed)).toBe(true);
    });

    it('returns empty notes array when topics list is empty', async () => {
      const result = await generateTopicNotes([], sampleMarkdown);
      expect(result.notes).toEqual([]);
      expect(result.auditReports).toEqual([]);
    });
  });
});
