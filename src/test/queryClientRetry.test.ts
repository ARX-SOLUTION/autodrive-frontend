import { describe, expect, it } from 'vitest';
import { shouldRetryQuery } from '@/lib/queryClient';

const axiosError = (status: number) => ({
  isAxiosError: true,
  response: { status },
});

describe('query retry policy', () => {
  it('does not amplify client and rate-limit errors', () => {
    expect(shouldRetryQuery(0, axiosError(400))).toBe(false);
    expect(shouldRetryQuery(0, axiosError(401))).toBe(false);
    expect(shouldRetryQuery(0, axiosError(429))).toBe(false);
  });

  it('retries one transient server or network failure', () => {
    expect(shouldRetryQuery(0, axiosError(503))).toBe(true);
    expect(shouldRetryQuery(0, new Error('network unavailable'))).toBe(true);
    expect(shouldRetryQuery(1, axiosError(503))).toBe(false);
  });
});
