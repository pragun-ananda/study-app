import { createHash } from 'node:crypto';
import { formatCanonicalSolutionMarkdown } from './canonicalSolutionMarkdown.js';

export interface CanonicalProblemSource {
  id: string;
  title: string;
  prompt: string;
  solution: string;
}

/** Bind teaching content to the exact canonical prompt and solution it explains. */
export function fingerprintProblemSource(source: CanonicalProblemSource): string {
  return createHash('sha256')
    // The problem API returns a presentation-formatted solution, and the editor
    // can send that same representation back on an unrelated save. Fingerprint
    // the canonical presentation so a formatting-only round trip doesn't make
    // its reviewed teaching path look stale. Real content changes still differ.
    .update([source.id, source.title, source.prompt, formatCanonicalSolutionMarkdown(source.solution)].join('\n\u0000\n'), 'utf8')
    .digest('hex');
}
