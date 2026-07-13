import { describe, expect, it } from 'vitest';
import { extractErrorMessage } from '@/lib/errors';

describe('extractErrorMessage', () => {
  it('surfaces validation `details` instead of the generic "Validation failed" message', () => {
    const err = {
      response: {
        data: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: ['phone must be a valid phone number'],
          },
        },
      },
    };

    expect(extractErrorMessage(err)).toBe('phone must be a valid phone number');
  });

  it('falls back to `error.message` when there are no details', () => {
    const err = {
      response: { data: { error: { message: 'Student not found' } } },
    };

    expect(extractErrorMessage(err)).toBe('Student not found');
  });

  it('falls back to the supplied default when the payload is malformed', () => {
    expect(extractErrorMessage(new Error('network down'), 'fallback')).toBe(
      'fallback',
    );
  });
});
