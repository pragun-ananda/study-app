import { Response } from 'express';

export interface DatabaseError extends Error {
  code?: string;
  detail?: string;
  constraint?: string;
}

export function handleDatabaseError(res: Response, error: unknown, fallbackMessage = 'Database error'): Response {
  const err = error as DatabaseError;
  const msg = err.message || '';

  // PostgreSQL error codes / pg-mem message matches:
  // 23505 = unique_violation
  if (err.code === '23505' || msg.includes('duplicate key') || msg.includes('violates unique constraint')) {
    return res.status(409).json({
      error: 'Conflict: Entity already exists or duplicate key violated',
      detail: err.detail || msg
    });
  }

  // 23503 = foreign_key_violation
  if (err.code === '23503' || msg.includes('violates foreign key constraint')) {
    return res.status(400).json({
      error: 'Foreign key constraint failed: Referenced entity does not exist',
      detail: err.detail || msg
    });
  }

  // 23514 = check_violation
  if (err.code === '23514' || msg.includes('violates check constraint') || msg.includes('chk_no_self_prerequisite')) {
    if (err.constraint === 'chk_no_self_prerequisite' || msg.includes('chk_no_self_prerequisite')) {
      return res.status(400).json({
        error: 'Self-loop detected: A topic cannot be a prerequisite of itself'
      });
    }
    return res.status(400).json({
      error: 'Check constraint violation',
      detail: err.detail || msg
    });
  }

  // 22P02 = invalid_text_representation
  if (err.code === '22P02' || msg.includes('invalid input syntax')) {
    return res.status(400).json({
      error: 'Invalid input syntax for data type',
      detail: err.detail || msg
    });
  }

  console.error('[DATABASE_ERROR]:', error);
  return res.status(500).json({
    error: fallbackMessage,
    message: err.message || 'Internal Server Error'
  });
}
