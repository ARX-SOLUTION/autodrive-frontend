import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DATE_PRESETS,
  getActiveDatePreset,
  getDatePresetRange,
  isMatchingPreset,
} from '@/lib/datePresets';

describe('datePresets', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Wednesday 2026-07-15 12:00:00 Tashkent time
    vi.setSystemTime(new Date('2026-07-15T07:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('computes today correctly', () => {
    expect(getDatePresetRange('today')).toEqual({
      from: '2026-07-15',
      to: '2026-07-15',
    });
  });

  it('computes thisWeek starting on Monday', () => {
    // 2026-07-15 is Wednesday. Monday was 2026-07-13.
    expect(getDatePresetRange('thisWeek')).toEqual({
      from: '2026-07-13',
      to: '2026-07-15',
    });
  });

  it('computes thisWeek when today is Sunday', () => {
    // 2026-07-19 is Sunday. Monday was 2026-07-13.
    vi.setSystemTime(new Date('2026-07-19T07:00:00.000Z'));
    expect(getDatePresetRange('thisWeek')).toEqual({
      from: '2026-07-13',
      to: '2026-07-19',
    });
  });

  it('computes thisWeek when today is Monday', () => {
    // 2026-07-13 is Monday. Monday is 2026-07-13.
    vi.setSystemTime(new Date('2026-07-13T07:00:00.000Z'));
    expect(getDatePresetRange('thisWeek')).toEqual({
      from: '2026-07-13',
      to: '2026-07-13',
    });
  });

  it('computes thisMonth from 1st of current month to today', () => {
    expect(getDatePresetRange('thisMonth')).toEqual({
      from: '2026-07-01',
      to: '2026-07-15',
    });
  });

  it('computes lastMonth full month range', () => {
    // Previous month of July 2026 is June 2026 (30 days)
    expect(getDatePresetRange('lastMonth')).toEqual({
      from: '2026-06-01',
      to: '2026-06-30',
    });
  });

  it('computes lastMonth across year boundary in January', () => {
    vi.setSystemTime(new Date('2026-01-10T07:00:00.000Z'));
    expect(getDatePresetRange('lastMonth')).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });

  it('computes allTime as empty range', () => {
    expect(getDatePresetRange('allTime')).toEqual({
      from: undefined,
      to: undefined,
    });
  });

  it('identifies active date preset', () => {
    expect(getActiveDatePreset('2026-07-15', '2026-07-15')).toBe('today');
    expect(getActiveDatePreset('2026-07-13', '2026-07-15')).toBe('thisWeek');
    expect(getActiveDatePreset('2026-07-01', '2026-07-15')).toBe('thisMonth');
    expect(getActiveDatePreset('2026-06-01', '2026-06-30')).toBe('lastMonth');
    expect(getActiveDatePreset(undefined, undefined)).toBe('allTime');
    expect(getActiveDatePreset('2026-05-01', '2026-05-10')).toBeNull();
  });

  it('matches presets with isMatchingPreset', () => {
    expect(isMatchingPreset('2026-07-15', '2026-07-15', 'today')).toBe(true);
    expect(isMatchingPreset('2026-07-15', '2026-07-16', 'today')).toBe(false);
  });

  it('has 5 predefined presets in DATE_PRESETS', () => {
    expect(DATE_PRESETS).toHaveLength(5);
    expect(DATE_PRESETS.map((p) => p.key)).toEqual([
      'today',
      'thisWeek',
      'thisMonth',
      'lastMonth',
      'allTime',
    ]);
  });
});
