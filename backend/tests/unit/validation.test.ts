import { describe, it, expect } from 'vitest';
import {
  isValidCategory,
  isValidStatus,
  isValidPriority,
  isValidMastery,
  validateTopicInput,
  validateTodoInput,
  validateNoteInput
} from '../../src/utils/validation.js';

describe('Unit: Input Validation (src/utils/validation.ts)', () => {
  describe('Enum & Range Validators', () => {
    it('validates domain categories', () => {
      expect(isValidCategory('AI & ML')).toBe(true);
      expect(isValidCategory('CS')).toBe(true);
      expect(isValidCategory('SYSTEMS')).toBe(true);
      expect(isValidCategory('MATH')).toBe(true);
      expect(isValidCategory('PHYSICS')).toBe(true);
      expect(isValidCategory('CYBERSECURITY')).toBe(true);
      expect(isValidCategory('ARCH')).toBe(true);

      expect(isValidCategory('INVALID_CAT')).toBe(false);
      expect(isValidCategory(null)).toBe(false);
      expect(isValidCategory(123)).toBe(false);
    });

    it('validates topic statuses', () => {
      expect(isValidStatus('DUE')).toBe(true);
      expect(isValidStatus('LEARNING')).toBe(true);
      expect(isValidStatus('MASTERED')).toBe(true);
      expect(isValidStatus('NEW')).toBe(true);

      expect(isValidStatus('DONE')).toBe(false);
      expect(isValidStatus(undefined)).toBe(false);
    });

    it('validates todo priorities', () => {
      expect(isValidPriority('HIGH')).toBe(true);
      expect(isValidPriority('MEDIUM')).toBe(true);
      expect(isValidPriority('LOW')).toBe(true);

      expect(isValidPriority('URGENT')).toBe(false);
    });

    it('validates mastery ranges between 0 and 100', () => {
      expect(isValidMastery(0)).toBe(true);
      expect(isValidMastery(50.5)).toBe(true);
      expect(isValidMastery(100)).toBe(true);

      expect(isValidMastery(-1)).toBe(false);
      expect(isValidMastery(100.1)).toBe(false);
      expect(isValidMastery(NaN)).toBe(false);
      expect(isValidMastery('50')).toBe(false);
    });
  });

  describe('Topic Input Validator', () => {
    it('passes for valid topic payload', () => {
      const valid = validateTopicInput({
        name: 'Quantum Computing',
        category: 'PHYSICS',
        status: 'NEW',
        mastery: 20,
        coordinates: [1.0, 2.0, 3.0]
      });
      expect(valid.error).toBeUndefined();
    });

    it('rejects missing or empty name', () => {
      expect(validateTopicInput({ category: 'CS' }).error).toContain('Topic name is required');
      expect(validateTopicInput({ name: '   ', category: 'CS' }).error).toContain('Topic name is required');
    });

    it('rejects invalid category', () => {
      expect(validateTopicInput({ name: 'Valid Name', category: 'UNKNOWN' }).error).toContain('Invalid category');
    });

    it('rejects out of bounds mastery', () => {
      expect(validateTopicInput({ name: 'Valid', category: 'CS', mastery: 150 }).error).toContain('Mastery must be a number between 0 and 100');
    });

    it('rejects malformed coordinates array', () => {
      expect(validateTopicInput({ name: 'Valid', category: 'CS', coordinates: [1, 2] }).error).toContain('Coordinates must be an array of three numbers');
      expect(validateTopicInput({ name: 'Valid', category: 'CS', coordinates: [1, 2, 'three'] }).error).toContain('Coordinates must be an array of three numbers');
    });
  });

  describe('Todo & Note Input Validators', () => {
    it('validates todo inputs', () => {
      expect(validateTodoInput({ title: 'Task', category: 'MATH' }).error).toBeUndefined();
      expect(validateTodoInput({ title: '', category: 'MATH' }).error).toContain('Todo title is required');
      expect(validateTodoInput({ title: 'Task', category: 'INVALID' }).error).toContain('Invalid category');
      expect(validateTodoInput({ title: 'Task', category: 'MATH', priority: 'INVALID' }).error).toContain('Invalid priority');
    });

    it('validates note inputs', () => {
      expect(validateNoteInput({ title: 'My Note' }).error).toBeUndefined();
      expect(validateNoteInput({ title: '' }).error).toContain('Note title is required');
      expect(validateNoteInput({}).error).toContain('Note title is required');
    });
  });
});
