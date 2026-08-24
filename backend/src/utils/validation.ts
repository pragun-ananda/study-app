import { DomainCategory, TopicStatus, TodoPriority } from '../types.js';

export const VALID_CATEGORIES: DomainCategory[] = [
  'AI & ML',
  'CS',
  'SYSTEMS',
  'MATH',
  'PHYSICS',
  'CYBERSECURITY',
  'ARCH'
];

export const VALID_STATUSES: TopicStatus[] = [
  'DUE',
  'LEARNING',
  'MASTERED',
  'NEW'
];

export const VALID_PRIORITIES: TodoPriority[] = [
  'HIGH',
  'MEDIUM',
  'LOW'
];

export function isValidCategory(category: unknown): category is DomainCategory {
  return typeof category === 'string' && VALID_CATEGORIES.includes(category as DomainCategory);
}

export function isValidStatus(status: unknown): status is TopicStatus {
  return typeof status === 'string' && VALID_STATUSES.includes(status as TopicStatus);
}

export function isValidPriority(priority: unknown): priority is TodoPriority {
  return typeof priority === 'string' && VALID_PRIORITIES.includes(priority as TodoPriority);
}

export function isValidMastery(mastery: unknown): boolean {
  if (typeof mastery !== 'number' || isNaN(mastery)) return false;
  return mastery >= 0 && mastery <= 100;
}

export function validateLastReviewed(val: unknown): { isValid: boolean; value: string | null; error?: string } {
  if (val === undefined || val === null || val === '') {
    return { isValid: true, value: null };
  }
  if (typeof val === 'string') {
    if (val.toLowerCase() === 'never') {
      return { isValid: true, value: null };
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      return { isValid: false, value: null, error: 'lastReviewed must be a valid ISO date string or "Never"' };
    }
    return { isValid: true, value: d.toISOString() };
  }
  return { isValid: false, value: null, error: 'lastReviewed must be a string or null' };
}

export function validateTopicInput(data: Record<string, unknown>): { error?: string } {
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    return { error: 'Topic name is required and must be a non-empty string' };
  }
  if (!isValidCategory(data.category)) {
    return { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` };
  }
  if (data.status !== undefined && !isValidStatus(data.status)) {
    return { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` };
  }
  if (data.mastery !== undefined && !isValidMastery(data.mastery)) {
    return { error: 'Mastery must be a number between 0 and 100' };
  }
  if (data.coordinates !== undefined) {
    if (
      !Array.isArray(data.coordinates) ||
      data.coordinates.length !== 3 ||
      data.coordinates.some((c) => typeof c !== 'number' || isNaN(c))
    ) {
      return { error: 'Coordinates must be an array of three numbers [x, y, z]' };
    }
  }
  if (data.lastReviewed !== undefined) {
    const check = validateLastReviewed(data.lastReviewed);
    if (!check.isValid) {
      return { error: check.error };
    }
  }
  return {};
}

export function validateTodoInput(data: Record<string, unknown>): { error?: string } {
  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    return { error: 'Todo title is required and must be a non-empty string' };
  }
  if (!isValidCategory(data.category)) {
    return { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` };
  }
  if (data.priority !== undefined && !isValidPriority(data.priority)) {
    return { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` };
  }
  if (data.completed !== undefined && typeof data.completed !== 'boolean') {
    return { error: 'Completed must be a boolean value' };
  }
  return {};
}

export function validateNoteInput(data: Record<string, unknown>): { error?: string } {
  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    return { error: 'Note title is required and must be a non-empty string' };
  }
  return {};
}
