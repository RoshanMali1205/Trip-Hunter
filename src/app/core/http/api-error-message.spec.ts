import { describe, expect, it } from 'vitest';
import { readApiErrorMessage } from './api-error-message';

describe('readApiErrorMessage', () => {
  it('reads nested API envelope messages', () => {
    expect(
      readApiErrorMessage(
        {
          error: {
            success: false,
            error: {
              code: 'ORGANIZATION_REQUIRED',
              message: 'An active organization membership is required to create a trip',
            },
          },
        },
        'fallback',
      ),
    ).toBe('An active organization membership is required to create a trip');
  });

  it('falls back when the body is not an API error', () => {
    expect(readApiErrorMessage({ status: 0 }, 'Could not create the trip.')).toBe(
      'Could not create the trip.',
    );
  });
});
