import { afterEach, describe, expect, it, vi } from 'vitest';
import { today } from './PaymentsPage';

describe('today() (L2 regression)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns Tashkent's calendar day even when it has already rolled over in UTC but not yet locally", () => {
    // 2026-07-10T23:30:00 UTC = 2026-07-11T04:30:00 in Tashkent (UTC+5) —
    // already "the 11th" there, whatever the test runner's local TZ is.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T23:30:00.000Z'));

    const d = today();

    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // July
    expect(d.getDate()).toBe(11);
  });
});
