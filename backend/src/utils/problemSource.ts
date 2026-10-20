import { createHash } from 'node:crypto';

export interface CanonicalProblemSource {
  id: string;
  title: string;
  prompt: string;
  solution: string;
}

/** Bind teaching content to the exact canonical prompt and solution it explains. */
export function fingerprintProblemSource(source: CanonicalProblemSource): string {
  return createHash('sha256')
    .update([source.id, source.title, source.prompt, source.solution].join('\n\u0000\n'), 'utf8')
    .digest('hex');
}
