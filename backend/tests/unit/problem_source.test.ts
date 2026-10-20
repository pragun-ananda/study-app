import { describe, expect, it } from 'vitest';
import { fingerprintProblemSource } from '../../src/utils/problemSource.js';
import { formatCanonicalSolutionMarkdown } from '../../src/utils/canonicalSolutionMarkdown.js';
import { FAULT_TOLERANT_WORK_QUEUE_PROBLEM } from '../../src/data/faultTolerantWorkQueueProblem.js';

describe('canonical problem source fingerprints', () => {
  const source = {
    id: FAULT_TOLERANT_WORK_QUEUE_PROBLEM.id!,
    title: FAULT_TOLERANT_WORK_QUEUE_PROBLEM.title,
    prompt: FAULT_TOLERANT_WORK_QUEUE_PROBLEM.prompt,
    solution: FAULT_TOLERANT_WORK_QUEUE_PROBLEM.solution
  };

  it('keeps the reviewed path valid after a formatting-only solution round trip', () => {
    expect(fingerprintProblemSource(source)).toBe(fingerprintProblemSource({
      ...source,
      solution: formatCanonicalSolutionMarkdown(source.solution)
    }));
  });

  it('invalidates the reviewed path when canonical solution content changes', () => {
    expect(fingerprintProblemSource(source)).not.toBe(fingerprintProblemSource({
      ...source,
      solution: `${source.solution}\nA materially changed rule.`
    }));
  });
});
