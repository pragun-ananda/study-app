import { describe, expect, it } from 'vitest';
import { validateQueueProblemBreakdown } from '../../src/services/interviewProblemBreakdownPipeline.js';
import { FAULT_TOLERANT_WORK_QUEUE_LEARNING_PATH } from '../../src/data/faultTolerantWorkQueueLearningPath.js';
import { FAULT_TOLERANT_WORK_QUEUE_PROBLEM } from '../../src/data/faultTolerantWorkQueueProblem.js';
import { formatCanonicalSolutionMarkdown, validateCanonicalSolutionPresentation } from '../../src/utils/canonicalSolutionMarkdown.js';

const source = {
  id: FAULT_TOLERANT_WORK_QUEUE_PROBLEM.id!,
  title: FAULT_TOLERANT_WORK_QUEUE_PROBLEM.title,
  prompt: FAULT_TOLERANT_WORK_QUEUE_PROBLEM.prompt,
  solution: FAULT_TOLERANT_WORK_QUEUE_PROBLEM.solution
};

describe('queue problem breakdown pipeline', () => {
  it('includes follow-up questions in the interview prompt and structured problem data', () => {
    expect(source.prompt).toContain('Follow-up questions:');
    expect(FAULT_TOLERANT_WORK_QUEUE_PROBLEM.followUps).toHaveLength(4);
    expect(FAULT_TOLERANT_WORK_QUEUE_PROBLEM.followUps?.map((item) => item.id)).toContain('FU-QUEUE-DURABILITY');
  });

  it('accepts the reviewed breakdown and reports source test coverage gaps', () => {
    const report = validateQueueProblemBreakdown(source, FAULT_TOLERANT_WORK_QUEUE_LEARNING_PATH.problemBreakdown);
    expect(report.valid).toBe(true);
    expect(report.pilotReady).toBe(true);
    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('duplicate_report'),
      expect.stringContaining('process_restart'),
      expect.stringContaining('duplicate_side_effect')
    ]));
  });

  it('rejects a breakdown after its canonical prompt or solution changes', () => {
    const report = validateQueueProblemBreakdown(
      { ...source, prompt: `${source.prompt}\nChanged requirement` },
      FAULT_TOLERANT_WORK_QUEUE_LEARNING_PATH.problemBreakdown
    );
    expect(report.valid).toBe(false);
    expect(report.errors).toContain('Breakdown source fingerprint does not match the canonical prompt and solution.');
  });

  it('rejects references to tests that are absent from the canonical solution', () => {
    const breakdown = structuredClone(FAULT_TOLERANT_WORK_QUEUE_LEARNING_PATH.problemBreakdown!);
    breakdown.failureScenarios[0].sourceTestNames = ['test_missing_from_solution'];
    const report = validateQueueProblemBreakdown(source, breakdown);
    expect(report.valid).toBe(false);
    expect(report.errors).toContain("Failure scenario 'worker_crash' references missing source test 'test_missing_from_solution'.");
  });

  it('formats the supplied answer into headed sections and fenced Python blocks', () => {
    const markdown = formatCanonicalSolutionMarkdown(source.solution);
    expect(markdown).toContain('## Assumptions');
    expect(markdown).toContain('## Reference implementation');
    expect(markdown).toContain('```python\nfrom __future__ import annotations');
    expect(markdown).toContain('## Tests\n\n```python\nclass FakeClock:');
    expect(validateCanonicalSolutionPresentation(source.solution)).toEqual([]);
  });

  it('rejects malformed Markdown and unclosed code fences for future curated answers', () => {
    expect(validateCanonicalSolutionPresentation('## Approach\n\n### Details\n\n```python\nprint(1)')).toContain(
      'Canonical solution has an unclosed fenced code block.'
    );
  });
});
