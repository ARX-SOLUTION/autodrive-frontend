import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecordExamModal } from './RecordExamModal';

vi.mock('@/services/examService', () => ({
  useCreateExam: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Regression for autodrive-6cq.5.49: `new Date().toISOString().split('T')[0]`
// converts 'now' to UTC before slicing, so for Asia/Tashkent (UTC+5) any
// local time between 00:00-04:59 reads as the previous UTC day.
describe('RecordExamModal default date', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("pre-fills today's Tashkent calendar day, not yesterday's UTC day", () => {
    // 2026-07-10T22:00:00 UTC = 2026-07-11T03:00:00 in Tashkent (UTC+5) --
    // already "the 11th" there, whatever the test runner's local TZ is.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T22:00:00.000Z'));

    render(<RecordExamModal open={true} onClose={vi.fn()} studentId="s1" />);

    const dateInput = screen.getByLabelText('common.date') as HTMLInputElement;
    expect(dateInput.value).toBe('2026-07-11');
  });
});
