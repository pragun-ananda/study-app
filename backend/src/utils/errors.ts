import { Response } from 'express';

export interface DatabaseError extends Error {
  code?: string;
  detail?: string;
  constraint?: string;
}

export function handleDatabaseError(res: Response, error: unknown, fallbackMessage = 'Database error'): Response {
  const err = error as DatabaseError;

  // PostgreSQL error codes:
  // 23505 = unique_violation
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Conflict: Entity already exists or duplicate key violated',
      detail: err.detail
    });
  }

  // 23503 = foreign_key_violation
  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Foreign key constraint failed: Referenced entity does not exist',
      detail: err.detail
    });
  }

  // 23514 = check_violation
  if (err.code === '23514') {
    if (err.constraint === 'chk_no_self_prerequisite') {
      return res.status(400).json({
        error: 'Self-loop detected: A topic cannot be a prerequisite of itself'
      });
    }
    return res.status(400).json({
      error: 'Check constraint violation',
      detail: err.detail
    });
  }

  // 22P02 = invalid_text_representation
  if (err.code === '22P02') {
    return res.status(400).json({
      error: 'Invalid input syntax for data type',
      detail: err.detail
    });
  }

  console.error('[DATABASE_ERROR]:', error);
  return res.status(500).json({
    error: fallbackMessage,
    message: err.message || 'Internal Server Error'
  });
}
