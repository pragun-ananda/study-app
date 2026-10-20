import { describe, expect, it } from 'vitest';
import { TRAPPING_RAIN_WATER_LEARNING_PATH } from '../../src/data/trappingRainWaterLearningPath.js';
import { validateInterviewLearningPath } from '../../src/services/interviewLearningService.js';

describe('interview learning path validation', () => {
  it('accepts the curated pilot with ordered reasoning, checks, transfer, and reviewed status', () => {
    expect(validateInterviewLearningPath(TRAPPING_RAIN_WATER_LEARNING_PATH)).toEqual({ valid: true, errors: [] });
  });

  it('rejects a path with no stages, transfer task, or reviewed state', () => {
    const invalid = {
      ...TRAPPING_RAIN_WATER_LEARNING_PATH,
      reasoningStages: [],
      transferExercise: { prompt: '', changedConstraint: '', assessmentCriteria: [] },
      qualityReview: { status: 'NEEDS_REVIEW' as const, notes: [] }
    };
    const result = validateInterviewLearningPath(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least two reasoning stages are required.');
    expect(result.errors).toContain('A transfer exercise with a changed constraint is required.');
  });

  it('rejects unverified resource URLs and broken concept references', () => {
    const invalid = {
      ...TRAPPING_RAIN_WATER_LEARNING_PATH,
      resources: [{ title: 'Made up', url: 'javascript:alert(1)', conceptId: 'missing', verified: false }]
    };
    const result = validateInterviewLearningPath(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('HTTP or HTTPS'))).toBe(true);
    expect(result.errors).toContain("Resource 'Made up' has not been verified.");
    expect(result.errors).toContain("Resource 'Made up' references an unknown concept.");
  });

  it('rejects empty aliases in concept links', () => {
    const invalid = structuredClone(TRAPPING_RAIN_WATER_LEARNING_PATH);
    invalid.concepts[0].terms = ['valid phrase', '  '];
    const result = validateInterviewLearningPath(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(`Concept '${invalid.concepts[0].id}' has invalid phrase aliases.`);
  });
});
