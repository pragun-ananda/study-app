import crypto from 'crypto';

/**
 * Generates an atomic, collision-safe unique ID with a domain prefix.
 * e.g., TOPIC-1724510000000-a1b2c3d4 or NOTE-1724510000000-e5f6g7h8
 */
export function generateEntityId(
  prefix: 'TOPIC' | 'NOTE' | 'TODO' | 'QUIZ' | 'QUESTION' | 'QUEUE'
): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}
