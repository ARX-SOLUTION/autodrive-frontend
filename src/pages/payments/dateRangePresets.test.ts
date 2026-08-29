import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { tashkentTodayMock } = vi.hoisted(() => ({
  tashkentTodayMock: vi.fn(),
}));

vi.mock('@/lib/tashkentDate', () => ({
  tashkentToday: tashkentTodayMock,
}));

import { presetRange } from './dateRangePresets';

const calendarParts = (date: Date | undefined) =>
  date && [date.getFullYear(), date.getMonth() + 1, date.getDate()];

describe('payment date range presets', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 10, 12));
    tashkentTodayMock.mockImplementation(() => new Date(2026, 6, 11));
  });

  afterEach(() => {
    vi.useRealTimers();
    tashkentTodayMock.mockReset();
  });

  it.each([
    ['today', [2026, 7, 11], [2026, 7, 11]],
    ['week', [2026, 7, 5], [2026, 7, 11]],
    ['month', [2026, 7, 1], [2026, 7, 11]],
    ['lastMonth', [2026, 6, 1], [2026, 6, 30]],
  ] as const)(
    'uses the Tashkent calendar source for the %s endpoints',
    (preset, expectedFrom, expectedTo) => {
      const { from, to } = presetRange(preset);

      expect(calendarParts(from)).toEqual(expectedFrom);
      expect(calendarParts(to)).toEqual(expectedTo);
      expect(to?.getHours()).toBe(0);
    },
  );

  it('keeps the all-time preset unbounded', () => {
    expect(presetRange('all')).toEqual({ from: undefined, to: undefined });
  });
});
