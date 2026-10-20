const SECTION_HEADINGS = new Map<string, string>([
  ['Assumptions', 'Assumptions'],
  ['Design: leases with tokens', 'Design: leases with tokens'],
  ['Why the tricky cases work', 'Why the tricky cases work'],
  ['Complexity', 'Complexity'],
  ['Delivery semantics', 'Delivery semantics'],
  ['Alternatives and trade-offs', 'Alternatives and trade-offs'],
  ['Follow-ups in brief', 'Follow-ups'],
  ['Edge cases', 'Edge cases'],
  ['Common pitfalls', 'Common pitfalls']
]);

/** Turn the queue prompt's plain-text headings and raw code sections into readable Markdown. */
export function formatCanonicalSolutionMarkdown(raw: string): string {
  if (!raw?.trim()) return '';
  // Preserve authored Markdown as-is. Formatting is only applied to the legacy plain-text answer.
  if (/^#{1,6}\s/m.test(raw)) return raw;

  let formatted = raw.trim();
  for (const [sourceHeading, markdownHeading] of SECTION_HEADINGS) {
    formatted = formatted.replace(new RegExp(`(^|\\n)${escapeRegExp(sourceHeading)}\\n`, 'g'), `$1## ${markdownHeading}\n\n`);
  }

  formatted = formatted.replace(
    /(^|\n)Code\n(from __future__ import annotations[\s\S]*?)\nWorkers run the task outside the queue's lock and only call back into the queue to report, so a slow task never blocks other workers\./,
    (_match, prefix: string, code: string) => `${prefix}## Reference implementation\n\n\`\`\`python\n${code.trimEnd()}\n\`\`\`\n\nWorkers run the task outside the queue's lock and only call back into the queue to report, so a slow task never blocks other workers.`
  );

  formatted = formatted.replace(
    /(^|\n)Tests\n(class FakeClock:[\s\S]*?)\n+## Why the tricky cases work/,
    (_match, prefix: string, code: string) => `${prefix}## Tests\n\n\`\`\`python\n${code.trimEnd()}\n\`\`\`\n\n## Why the tricky cases work`
  );

  // Convert source's one-line prose paragraphs into separate Markdown paragraphs.
  formatted = formatted.replace(/([^\n])\n(?=[A-Z][^\n]{25,})/g, '$1\n\n');
  return formatted;
}

export function validateCanonicalSolutionPresentation(raw: string): string[] {
  const formatted = formatCanonicalSolutionMarkdown(raw);
  const errors: string[] = [];
  const headings = formatted.match(/^#{1,6}\s+\S.+$/gm) || [];
  if (headings.length < 2) errors.push('Canonical solution needs at least two Markdown section headings.');
  const fences = formatted.match(/^```/gm) || [];
  if (fences.length % 2 !== 0) errors.push('Canonical solution has an unclosed fenced code block.');
  for (const heading of ['Reference implementation', 'Tests']) {
    if (new RegExp(`^## ${escapeRegExp(heading)}\\s*\\n\\s*\\n\\x60\\x60\\x60[a-zA-Z0-9_+-]+\\s*$`, 'm').test(formatted) === false &&
        new RegExp(`^## ${escapeRegExp(heading)}\\s*$`, 'm').test(formatted)) {
      errors.push(`The ${heading.toLowerCase()} section must use a fenced code block with a language label.`);
    }
  }
  if (!formatted.trim()) errors.push('Canonical solution cannot be empty.');
  return errors;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
