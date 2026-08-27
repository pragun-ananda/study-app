import { describe, it, expect } from 'vitest';
import { computeLineDiff } from '../../src/utils/diff';

describe('computeLineDiff utility', () => {
  it('handles empty input strings gracefully', () => {
    expect(computeLineDiff('', '')).toEqual([]);
    expect(computeLineDiff(undefined as any, undefined as any)).toEqual([]);
  });

  it('correctly identifies identical lines as unchanged with line numbers', () => {
    const text = 'Line 1\nLine 2\nLine 3';
    const diff = computeLineDiff(text, text);

    expect(diff).toHaveLength(3);
    expect(diff.every((d) => d.type === 'unchanged')).toBe(true);
    expect(diff[0]).toEqual({
      type: 'unchanged',
      content: 'Line 1',
      oldLineNumber: 1,
      newLineNumber: 1
    });
    expect(diff[1]).toEqual({
      type: 'unchanged',
      content: 'Line 2',
      oldLineNumber: 2,
      newLineNumber: 2
    });
    expect(diff[2]).toEqual({
      type: 'unchanged',
      content: 'Line 3',
      oldLineNumber: 3,
      newLineNumber: 3
    });
  });

  it('identifies pure additions when oldText is empty', () => {
    const newText = 'First Line\nSecond Line';
    const diff = computeLineDiff('', newText);

    expect(diff).toHaveLength(2);
    expect(diff[0]).toEqual({
      type: 'added',
      content: 'First Line',
      newLineNumber: 1
    });
    expect(diff[1]).toEqual({
      type: 'added',
      content: 'Second Line',
      newLineNumber: 2
    });
  });

  it('identifies pure deletions when newText is empty', () => {
    const oldText = 'Deleted Line 1\nDeleted Line 2';
    const diff = computeLineDiff(oldText, '');

    expect(diff).toHaveLength(2);
    expect(diff[0]).toEqual({
      type: 'removed',
      content: 'Deleted Line 1',
      oldLineNumber: 1
    });
    expect(diff[1]).toEqual({
      type: 'removed',
      content: 'Deleted Line 2',
      oldLineNumber: 2
    });
  });

  it('correctly computes diff for mixed edits, additions, and deletions', () => {
    const oldText = 'apple\nbanana\ncherry\ndate';
    const newText = 'apple\nblueberry\ncherry\nelderberry';

    const diff = computeLineDiff(oldText, newText);

    expect(diff).toEqual([
      { type: 'unchanged', content: 'apple', oldLineNumber: 1, newLineNumber: 1 },
      { type: 'removed', content: 'banana', oldLineNumber: 2 },
      { type: 'added', content: 'blueberry', newLineNumber: 2 },
      { type: 'unchanged', content: 'cherry', oldLineNumber: 3, newLineNumber: 3 },
      { type: 'removed', content: 'date', oldLineNumber: 4 },
      { type: 'added', content: 'elderberry', newLineNumber: 4 }
    ]);
  });
});
