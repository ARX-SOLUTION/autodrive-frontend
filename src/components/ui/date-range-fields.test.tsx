/**
 * Callers: vitest. API: DateRangeFields. Schema: YYYY-MM-DD.
 * User: "davom et" (autodrive-qsgc.4).
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DateRangeFields } from '@/components/ui/date-range-fields';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'uz', resolvedLanguage: 'uz' },
  }),
}));

describe('DateRangeFields (autodrive-qsgc.4)', () => {
  it('keeps an inclusive same-day range', () => {
    const onChange = vi.fn();
    render(
      <DateRangeFields
        from="2026-07-10"
        to="2026-07-10"
        max="2026-12-31"
        onChange={onChange}
      />,
    );
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: '10.07.2026' } });
    fireEvent.blur(inputs[0]);
    expect(onChange).toHaveBeenCalledWith('2026-07-10', '2026-07-10');
  });

  it('rejects a from date after the current to (max=to)', () => {
    const onChange = vi.fn();
    render(
      <DateRangeFields
        from="2026-07-01"
        to="2026-07-10"
        max="2026-12-31"
        onChange={onChange}
      />,
    );
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: '15.07.2026' } });
    fireEvent.blur(inputs[0]);
    // DatePicker max=to blocks the commit — range stays inclusive.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects a to date before the current from (min=from)', () => {
    const onChange = vi.fn();
    render(
      <DateRangeFields
        from="2026-07-10"
        to="2026-07-20"
        max="2026-12-31"
        onChange={onChange}
      />,
    );
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[1], { target: { value: '05.07.2026' } });
    fireEvent.blur(inputs[1]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('accepts a widened inclusive end within max', () => {
    const onChange = vi.fn();
    render(
      <DateRangeFields
        from="2026-07-01"
        to="2026-07-10"
        max="2026-12-31"
        onChange={onChange}
      />,
    );
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[1], { target: { value: '15.07.2026' } });
    fireEvent.blur(inputs[1]);
    expect(onChange).toHaveBeenCalledWith('2026-07-01', '2026-07-15');
  });
});
