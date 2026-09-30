import { describe, expect, it, vi } from 'vitest';
import { newRequestId } from './idempotencyKey';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newRequestId', () => {
  it('delegates to crypto.randomUUID when it exists', () => {
    const spy = vi.fn().mockReturnValue('11111111-1111-4111-8111-111111111111');
    vi.stubGlobal('crypto', { randomUUID: spy });
    expect(newRequestId()).toBe('11111111-1111-4111-8111-111111111111');
    expect(spy).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('still returns a valid v4 UUID when the CSPRNG is unavailable', () => {
    vi.stubGlobal('crypto', {});
    const ids = Array.from({ length: 50 }, () => newRequestId());
    vi.unstubAllGlobals();
    for (const id of ids) expect(id).toMatch(UUID_RE);
    expect(new Set(ids).size).toBe(50);
  });
});
