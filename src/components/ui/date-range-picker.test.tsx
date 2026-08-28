/**
 * Callers: vitest. API: DateRangePicker + moveNearestEnd/formatRangeLabel.
 * Schema: YYYY-MM-DD. User: "A" (range picker grill confirm).
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DateRangePicker,
  formatRangeLabel,
  moveNearestEnd,
} from '@/components/ui/date-range-picker';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'uz', resolvedLanguage: 'uz' },
  }),
}));

describe('moveNearestEnd', () => {
  const from = new Date(2026, 6, 1);
  const to = new Date(2026, 6, 15);

  it('moves from when click is nearer to start', () => {
    expect(moveNearestEnd(from, to, new Date(2026, 6, 3))).toEqual({
      from: new Date(2026, 6, 3),
      to,
    });
  });

  it('moves to when click is nearer to end (ties prefer to)', () => {
    expect(moveNearestEnd(from, to, new Date(2026, 6, 14))).toEqual({
      from,
      to: new Date(2026, 6, 14),
    });
    // Midpoint day 8 is equally far from 1 and 15 → prefer to
    expect(moveNearestEnd(from, to, new Date(2026, 6, 8))).toEqual({
      from,
      to: new Date(2026, 6, 8),
    });
  });

  it('extends past an end and keeps the other end', () => {
    expect(moveNearestEnd(from, to, new Date(2026, 6, 20))).toEqual({
      from,
      to: new Date(2026, 6, 20),
    });
    // Click before from is nearer to from → move from, keep to
    expect(moveNearestEnd(from, to, new Date(2026, 5, 20))).toEqual({
      from: new Date(2026, 5, 20),
      to,
    });
  });
});

const clickDay = (day: string) => {
  const cells = screen
    .getAllByRole('gridcell')
    .filter((c) => c.textContent === day);
  const cell =
    cells.find((c) => {
      const btn = c.querySelector('button');
      return (
        btn &&
        !btn.disabled &&
        !btn.className.includes('day-outside') &&
        !btn.className.includes('opacity-50')
      );
    }) ?? cells[0];
  const btn = cell?.querySelector('button');
  if (!btn) throw new Error(`No day button for ${day}`);
  fireEvent.click(btn);
};

describe('formatRangeLabel', () => {
  it('compacts same-month uz labels', () => {
    expect(
      formatRangeLabel(new Date(2026, 6, 1), new Date(2026, 6, 15), 'uz'),
    ).toBe('01 — 15.07.2026');
  });

  it('uses full pair across months', () => {
    expect(
      formatRangeLabel(new Date(2026, 5, 1), new Date(2026, 6, 15), 'uz'),
    ).toBe('01.06.2026 — 15.07.2026');
  });
});

describe('DateRangePicker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('commits a fresh inclusive range on the second day click', () => {
    const onChange = vi.fn();
    render(<DateRangePicker max="2026-12-31" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'daterange.open' }));
    clickDay('10');
    expect(onChange).not.toHaveBeenCalled();
    clickDay('12');
    expect(onChange).toHaveBeenCalledWith('2026-07-10', '2026-07-12');
  });

  it('starts a fresh from→to pick even when a range is already committed', () => {
    const onChange = vi.fn();
    render(
      <DateRangePicker
        from="2026-07-01"
        to="2026-07-15"
        max="2026-12-31"
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '01 — 15.07.2026' }));
    clickDay('10');
    expect(onChange).not.toHaveBeenCalled();
    clickDay('12');
    expect(onChange).toHaveBeenCalledWith('2026-07-10', '2026-07-12');
  });

  it('clears both ends via the clear control', () => {
    const onChange = vi.fn();
    render(
      <DateRangePicker
        from="2026-07-01"
        to="2026-07-15"
        max="2026-12-31"
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'daterange.clear' }));
    expect(onChange).toHaveBeenCalledWith(undefined, undefined);
  });

  it('does not commit a partial first click', () => {
    const onChange = vi.fn();
    render(<DateRangePicker max="2026-12-31" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'daterange.open' }));
    clickDay('5');
    expect(onChange).not.toHaveBeenCalled();
  });
});
