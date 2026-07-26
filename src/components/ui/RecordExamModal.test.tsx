import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecordExamModal } from './RecordExamModal';
import { isoToParts } from '@/lib/calendarDateTime';

vi.mock('@/services/examService', () => ({
  useCreateExam: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('RecordExamModal default date', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("pre-fills today's Tashkent calendar day and time, not yesterday's UTC day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T22:00:00.000Z'));

    render(<RecordExamModal open={true} onClose={vi.fn()} studentId="s1" />);

    const parts = isoToParts('2026-07-10T22:00:00.000Z');
    expect(parts.date).toBe('2026-07-11');
    expect(parts.time).toBe('03:00');

    expect(
      screen.getByLabelText('common.date') as HTMLInputElement,
    ).toHaveValue('11.07.2026');
    expect(
      screen.getByLabelText('datetimepicker.time') as HTMLInputElement,
    ).toHaveValue('03:00');
  });
});
