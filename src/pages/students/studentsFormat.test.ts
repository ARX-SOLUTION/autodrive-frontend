import { describe, expect, it } from 'vitest';
import { formatDate } from './studentsFormat';

/**
 * Callers: StudentsTable, StudentsMobileList, BranchesPage (via studentsFormat);
 * StudentsPage re-exports formatDate/formatDateTime.
 * API: formatDate(d?: string) → 'dd.MM.yyyy' | '—' | raw fallback.
 * Schema: none — display helper only; calendar inputs are YYYY-MM-DD wire strings.
 * User instruction (verbatim): "davom et"
 * Ticket: autodrive-qsgc.3 — never use new Date('YYYY-MM-DD') for calendar dates.
 */
describe('formatDate (calendar-date safe)', () => {
  it('formats YYYY-MM-DD via local calendar parse (not UTC midnight)', () => {
    expect(formatDate('2026-03-15')).toBe('15.03.2026');
  });

  it('returns em dash for empty input', () => {
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
  });

  it('formats ISO instants without treating them as calendar dates', () => {
    const result = formatDate('2026-03-15T12:00:00.000Z');
    expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });
});
