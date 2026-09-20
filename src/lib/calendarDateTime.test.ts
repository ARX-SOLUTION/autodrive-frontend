import { describe, expect, it } from 'vitest';
import {
  formatTashkentDate,
  formatTashkentDateTime,
  isoToParts,
  nowTashkentParts,
  partsToIso,
  type DateTimeParts,
} from '@/lib/calendarDateTime';

// autodrive-qsgc.5: datetime instants are interpreted in Asia/Tashkent (UTC+5,
// no DST). Assertions use fixed UTC instants and explicit offset math — must
// hold under TZ=UTC and TZ=Asia/Tashkent.

describe('partsToIso / isoToParts round-trip', () => {
  it.each([
    { date: '2026-07-11', time: '14:30', iso: '2026-07-11T09:30:00.000Z' },
    { date: '2026-07-11', time: '00:00', iso: '2026-07-10T19:00:00.000Z' },
    { date: '2026-01-01', time: '05:00', iso: '2026-01-01T00:00:00.000Z' },
    { date: '2024-02-29', time: '12:00', iso: '2024-02-29T07:00:00.000Z' },
  ])(
    'maps Tashkent wall $date $time <-> $iso',
    ({ date, time, iso }: DateTimeParts & { iso: string }) => {
      expect(partsToIso({ date, time })).toBe(iso);
      expect(isoToParts(iso)).toEqual({ date, time });
    },
  );

  it('round-trips arbitrary instants byte-identically', () => {
    for (const iso of [
      '2026-07-11T09:30:00.000Z',
      '2026-07-10T19:00:00.000Z',
      '2026-12-31T18:59:00.000Z',
    ]) {
      expect(partsToIso(isoToParts(iso))).toBe(iso);
    }
  });

  it('handles hour borrow across the UTC day boundary (02:00 Tashkent)', () => {
    expect(partsToIso({ date: '2026-07-11', time: '02:00' })).toBe(
      '2026-07-10T21:00:00.000Z',
    );
    expect(isoToParts('2026-07-10T21:00:00.000Z')).toEqual({
      date: '2026-07-11',
      time: '02:00',
    });
  });
});

describe('Tashkent display dates', () => {
  it('uses readable Uzbek dates instead of browser-dependent month codes', () => {
    expect(formatTashkentDateTime('2026-09-20T05:00:00.000Z', 'uz')).toBe(
      '20.09.2026 10:00',
    );
    expect(formatTashkentDate('2030-12-31', 'uz')).toBe('31.12.2030');
    expect(formatTashkentDateTime('2026-09-20T05:00:00.000Z')).toBe(
      '20.09.2026 10:00',
    );
  });

  it('keeps the existing localized format for Russian and English', () => {
    expect(formatTashkentDateTime('2026-09-20T05:00:00.000Z', 'ru')).toContain(
      '10:00',
    );
    expect(formatTashkentDate('2030-12-31', 'en')).toContain('2030');
  });
});

describe('nowTashkentParts', () => {
  it('matches isoToParts of the current instant', () => {
    expect(nowTashkentParts()).toEqual(isoToParts(new Date().toISOString()));
  });
});

describe('partsToIso validation', () => {
  it('rejects invalid calendar dates and times', () => {
    expect(() => partsToIso({ date: '2026-02-30', time: '12:00' })).toThrow();
    expect(() => partsToIso({ date: '2026-07-11', time: '25:00' })).toThrow();
    expect(() => partsToIso({ date: '2026-07-11', time: '12:99' })).toThrow();
  });
});
