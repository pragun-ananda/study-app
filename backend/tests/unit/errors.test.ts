import { describe, it, expect, vi } from 'vitest';
import { handleDatabaseError, DatabaseError } from '../../src/utils/errors.js';
import { Response } from 'express';

function createMockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('Unit: Database Error Translator (src/utils/errors.ts)', () => {
  it('translates 23505 (unique_violation) to 409 Conflict', () => {
    const res = createMockResponse();
    const error: DatabaseError = new Error('duplicate key');
    error.code = '23505';
    error.detail = 'Key (id)=(TOPIC-001) already exists.';

    handleDatabaseError(res, error);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Conflict'),
        detail: 'Key (id)=(TOPIC-001) already exists.'
      })
    );
  });

  it('translates 23503 (foreign_key_violation) to 400 Bad Request', () => {
    const res = createMockResponse();
    const error: DatabaseError = new Error('fk error');
    error.code = '23503';
    error.detail = 'Key (topic_id)=(INVALID) is not present in table "topics".';

    handleDatabaseError(res, error);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Foreign key constraint failed')
      })
    );
  });

  it('translates 23514 self-loop check violation to descriptive 400 Bad Request', () => {
    const res = createMockResponse();
    const error: DatabaseError = new Error('check error');
    error.code = '23514';
    error.constraint = 'chk_no_self_prerequisite';

    handleDatabaseError(res, error);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Self-loop detected: A topic cannot be a prerequisite of itself'
      })
    );
  });

  it('translates 22P02 (invalid_text_representation) to 400 Bad Request', () => {
    const res = createMockResponse();
    const error: DatabaseError = new Error('invalid input syntax for type numeric');
    error.code = '22P02';
    error.detail = 'invalid input syntax for type numeric: "abc"';

    handleDatabaseError(res, error);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Invalid input syntax for data type',
        detail: 'invalid input syntax for type numeric: "abc"'
      })
    );
  });

  it('translates generic errors to 500 Internal Server Error', () => {
    const res = createMockResponse();
    const error = new Error('Connection timeout');

    handleDatabaseError(res, error, 'Custom fallback message');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Custom fallback message',
        message: 'Connection timeout'
      })
    );
  });
});
