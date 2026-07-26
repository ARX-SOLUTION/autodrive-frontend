import { describe, expect, it } from 'vitest';
import { addDays } from 'date-fns';
import {
  formatCalendarDate,
  parseCalendarDate,
  parseTypedCalendarDate,
  todayCalendarDate,
} from '@/lib/calendarDate';

// autodrive-qsgc.3: calendar dates are plain YYYY-MM-DD strings at every
// boundary. Internal Date conversions happen ONLY via local-midnight
// construction — new Date('YYYY-MM-DD') (implicit UTC parse) is forbidden
// anywhere in the date path. This file runs under TZ=UTC and
// TZ=Asia/Tashkent; every assertion must hold in both.
describe('parseCalendarDate', () => {
  it('parses YYYY-MM-DD to a LOCAL-midnight Date, not UTC', () => {
    const d = parseCalendarDate('2026-03-15');
    expect(d).toBeDefined();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(2);
    expect(d!.getDate()).toBe(15);
    // Local midnight in the process timezone — the point of the whole fix.
    expect(d!.getHours()).toBe(0);
    expect(d!.getMinutes()).toBe(0);
  });

  it.each(['2024-02-29', '2000-02-29', '2026-01-01', '2026-12-31'])(
    'accepts real boundary date %s',
    (value) => {
      expect(parseCalendarDate(value)).toBeDefined();
    },
  );

  it.each([
    '2026-02-30',
    '2024-02-30',
    '2023-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-03-15T00:00:00.000Z',
    '2026-3-5',
    '15.03.2026',
    'garbage',
    '',
  ])('rejects %s', (value) => {
    expect(parseCalendarDate(value)).toBeUndefined();
  });
});

describe('formatCalendarDate / round-trip', () => {
  it.each(['2026-03-15', '2024-02-29', '2026-01-01', '2026-12-31'])(
    'round-trips %s byte-identically',
    (value) => {
      expect(formatCalendarDate(parseCalendarDate(value)!)).toBe(value);
    },
  );

  it('month rollover: Jan 31 + 1 day = Feb 1, byte-identical', () => {
    const jan31 = parseCalendarDate('2026-01-31')!;
    expect(formatCalendarDate(addDays(jan31, 1))).toBe('2026-02-01');
  });

  it('year rollover: Dec 31 + 1 day = Jan 1 next year', () => {
    const dec31 = parseCalendarDate('2026-12-31')!;
    expect(formatCalendarDate(addDays(dec31, 1))).toBe('2027-01-01');
  });

  it('leap day: Feb 28 2024 + 1 day = Feb 29, and +1 more = Mar 1', () => {
    const feb28 = parseCalendarDate('2024-02-28')!;
    expect(formatCalendarDate(addDays(feb28, 1))).toBe('2024-02-29');
    expect(formatCalendarDate(addDays(feb28, 2))).toBe('2024-03-01');
  });

  it('leap-day arithmetic stays local-midnight across the DST-free +5 offset', () => {
    // 2024-02-29 picked at Tashkent local midnight must never become Mar 1
    // or Feb 28 after a format round-trip.
    const leap = parseCalendarDate('2024-02-29')!;
    expect(formatCalendarDate(leap)).toBe('2024-02-29');
  });
});

describe('todayCalendarDate', () => {
  it('matches the LOCAL calendar day (never yesterday/tomorrow via UTC)', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(todayCalendarDate()).toBe(expected);
  });
});

describe('parseTypedCalendarDate (keyboard entry)', () => {
  it('parses dd.mm.yyyy for uz and ru', () => {
    for (const locale of ['uz', 'ru'] as const) {
      const d = parseTypedCalendarDate('15.03.2026', locale);
      expect(d).toBeDefined();
      expect(formatCalendarDate(d!)).toBe('2026-03-15');
    }
  });

  it('parses MM/dd/yyyy for en', () => {
    const d = parseTypedCalendarDate('03/15/2026', 'en');
    expect(d).toBeDefined();
    expect(formatCalendarDate(d!)).toBe('2026-03-15');
  });

  it('parses ISO yyyy-mm-dd in every locale', () => {
    for (const locale of ['uz', 'ru', 'en'] as const) {
      const d = parseTypedCalendarDate('2026-03-15', locale);
      expect(formatCalendarDate(d!)).toBe('2026-03-15');
    }
  });

  it('accepts single-digit day/month in the local pattern', () => {
    const d = parseTypedCalendarDate('5.3.2026', 'uz');
    expect(formatCalendarDate(d!)).toBe('2026-03-05');
  });

  it('rejects impossible and foreign-format dates', () => {
    expect(parseTypedCalendarDate('30.02.2026', 'uz')).toBeUndefined();
    expect(parseTypedCalendarDate('31.04.2026', 'uz')).toBeUndefined();
    expect(parseTypedCalendarDate('15/03/2026', 'en')).toBeUndefined(); // 15 is not a month
    expect(parseTypedCalendarDate('garbage', 'uz')).toBeUndefined();
    expect(parseTypedCalendarDate('', 'uz')).toBeUndefined();
  });
});
