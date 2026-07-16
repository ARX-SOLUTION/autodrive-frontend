import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RecordExamModal } from '@/components/ui/RecordExamModal';

// Regression (bd 6cq.11.10): z.coerce.number() coerced a blank score '' to 0,
// so leaving the optional score field empty silently submitted score: 0.
// Blank must omit score from the payload; an explicit '0' must still send 0.

const { mutateMock } = vi.hoisted(() => ({ mutateMock: vi.fn() }));

vi.mock('@/services/examService', () => ({
  useCreateExam: () => ({ mutate: mutateMock, isPending: false }),
}));

const scoreInput = () =>
  document.querySelector('input[name="score"]') as HTMLInputElement;

const setup = () =>
  render(<RecordExamModal open onClose={vi.fn()} studentId="s1" />);

beforeEach(() => mutateMock.mockClear());
afterEach(cleanup);

describe('RecordExamModal optional score', () => {
  it('omits score from the payload when left blank (not score: 0)', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock.mock.calls[0][0]).not.toHaveProperty('score');
  });

  it('submits score 0 when 0 is typed explicitly', async () => {
    setup();
    fireEvent.change(scoreInput(), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    expect(mutateMock.mock.calls[0][0].score).toBe(0);
  });

  it('rejects an out-of-range score (150) and blocks submit', async () => {
    setup();
    fireEvent.change(scoreInput(), { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    await waitFor(() =>
      expect(
        screen.getByText(/less than or equal to 100/i),
      ).toBeInTheDocument(),
    );
    expect(mutateMock).not.toHaveBeenCalled();
  });
});
