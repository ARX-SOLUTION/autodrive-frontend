import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import PaymentModal from '@/components/ui/PaymentModal';
import type { Payment } from '@/types/payment';

// Same mocking style as paymentModalLockedStudent.test.tsx: the picker is
// never opened in these tests (locked-student / edit-mode both hide it), so
// useStudentsPage just needs to not blow up on the unconditional hook call.
vi.mock('@/services/studentService', () => ({
  useStudentsPage: () => ({
    data: { data: [], meta: { total: 0, totalPages: 1 } },
    isFetching: false,
    isError: false,
  }),
}));

afterEach(cleanup);

const fillAmount = (value: string) => {
  const input = screen.getByPlaceholderText('0') as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
};

const dialogFor = (titleText: string) => {
  const title = screen.getByText(titleText);
  const dialog = title.closest('[role="dialog"]');
  if (!dialog) throw new Error(`No dialog ancestor for "${titleText}"`);
  return dialog as HTMLElement;
};

// bd autodrive-9e4.2: a payment above the student's current debt is a
// deliberately supported credit-balance payment (bd 6cq.11.6) but must be
// confirmed first -- zero friction for a normal within-debt payment.
describe('PaymentModal exceeds-debt confirmation', () => {
  it('submits directly when the amount is within debt', async () => {
    const onSubmit = vi.fn();
    render(
      <PaymentModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        lockedStudentId="s1"
        lockedStudentName="Aziz Karimov"
        lockedStudentDebt={1000000}
      />,
    );

    fillAmount('1000000');
    fireEvent.click(screen.getByText('common.add'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('payments.exceeds_debt_title')).toBeNull();
  });

  it('does not confirm for an amount exactly equal to the debt', async () => {
    const onSubmit = vi.fn();
    render(
      <PaymentModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        lockedStudentId="s1"
        lockedStudentName="Aziz Karimov"
        lockedStudentDebt={500000}
      />,
    );

    fillAmount('500000');
    fireEvent.click(screen.getByText('common.add'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('payments.exceeds_debt_title')).toBeNull();
  });

  it('blocks submit behind a confirm step when the amount exceeds debt, and cancel does not submit', async () => {
    const onSubmit = vi.fn();
    render(
      <PaymentModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        lockedStudentId="s1"
        lockedStudentName="Aziz Karimov"
        lockedStudentDebt={1000000}
      />,
    );

    fillAmount('1200000');
    fireEvent.click(screen.getByText('common.add'));

    await waitFor(() =>
      expect(
        screen.getByText('payments.exceeds_debt_title'),
      ).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();

    const dialog = dialogFor('payments.exceeds_debt_title');
    fireEvent.click(
      Array.from(dialog.querySelectorAll('button')).find(
        (b) => b.textContent === 'common.cancel',
      )!,
    );
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByText('payments.exceeds_debt_title')).toBeNull();
  });

  it('submits with the entered amount after confirming the credit', async () => {
    const onSubmit = vi.fn();
    render(
      <PaymentModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        lockedStudentId="s1"
        lockedStudentName="Aziz Karimov"
        lockedStudentDebt={1000000}
      />,
    );

    fillAmount('1200000');
    fireEvent.click(screen.getByText('common.add'));

    await waitFor(() =>
      expect(
        screen.getByText('payments.exceeds_debt_title'),
      ).toBeInTheDocument(),
    );

    const dialog = dialogFor('payments.exceeds_debt_title');
    fireEvent.click(
      Array.from(dialog.querySelectorAll('button')).find(
        (b) => b.textContent === 'payments.exceeds_debt_confirm',
      )!,
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      student_id: 's1',
      amount: 1200000,
    });
  });
});

// bd autodrive-9e4.3: idempotencyKeyRef must survive a failed-then-retried
// submit within one open session (so the retry reuses the same key and the
// backend's idempotency guard collapses it into the original payment), but
// must regenerate on a genuinely fresh open.
describe('PaymentModal idempotency key retry safety', () => {
  it('reuses the same key across a failed retry, but regenerates after close+reopen', async () => {
    const onSubmit = vi.fn();
    const props = {
      onClose: vi.fn(),
      onSubmit,
      lockedStudentId: 's1',
      lockedStudentName: 'Aziz Karimov',
    };
    const { rerender } = render(<PaymentModal open {...props} />);

    fillAmount('300000');
    fireEvent.click(screen.getByText('common.add'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const firstKey = onSubmit.mock.calls[0][0].idempotency_key;
    expect(firstKey).toBeTruthy();

    // Simulate the caller's onError: keep the modal open, surface the
    // "safe to retry" banner, and DO NOT reopen the modal (open stays true).
    rerender(<PaymentModal open {...props} submitError />);
    expect(screen.getByText('payments.retry_safe')).toBeInTheDocument();

    fireEvent.click(screen.getByText('common.add'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    const retryKey = onSubmit.mock.calls[1][0].idempotency_key;
    expect(retryKey).toBe(firstKey);

    // A genuinely fresh open (close, then reopen) gets a new key.
    rerender(<PaymentModal open={false} {...props} />);
    rerender(<PaymentModal open {...props} />);

    fillAmount('300000');
    fireEvent.click(screen.getByText('common.add'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(3));
    const freshKey = onSubmit.mock.calls[2][0].idempotency_key;
    expect(freshKey).not.toBe(firstKey);
  });
});

// bd autodrive-9e4.6: `payment` prop present = edit mode, mirroring
// StudentModal's create/edit dual-mode convention.
describe('PaymentModal edit mode', () => {
  const PAYMENT: Payment = {
    id: 'p1',
    student_id: 's1',
    student_name: 'Aziz Karimov',
    branch_id: 'b1',
    branch_name: 'Yunusobod',
    course_type: 'tezkor',
    total_price: 2000000,
    amount_paid: 500000,
    remaining_debt: 1500000,
    payment_method: 'karta',
    recorded_by: 'Operator',
    date: '2026-07-10T00:00:00.000Z',
    created_at: '2026-07-10T00:00:00.000Z',
  };

  it('pre-fills amount/method and pins the student from the payment prop', () => {
    render(
      <PaymentModal
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        payment={PAYMENT}
      />,
    );

    expect(screen.getByText('payments.edit_payment')).toBeInTheDocument();
    expect(screen.getByText('Aziz Karimov')).toBeInTheDocument();
    expect((screen.getByPlaceholderText('0') as HTMLInputElement).value).toBe(
      '500 000',
    );
    expect(screen.getAllByText('Card').length).toBeGreaterThan(0);
    expect(screen.getByText('common.save')).toBeInTheDocument();
  });

  it('submits the edited amount/method for the pinned student unchanged', async () => {
    const onSubmit = vi.fn();
    render(
      <PaymentModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        payment={PAYMENT}
      />,
    );

    fillAmount('700000');
    fireEvent.click(screen.getByText('common.save'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      student_id: 's1',
      amount: 700000,
      payment_method: 'karta',
    });
  });

  it('confirms before submit when the edited amount exceeds the pre-payment debt', async () => {
    const onSubmit = vi.fn();
    render(
      <PaymentModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        payment={PAYMENT}
      />,
    );

    // Baseline debt = remaining_debt + amount_paid = 1 500 000 + 500 000 = 2 000 000.
    fillAmount('2500000');
    fireEvent.click(screen.getByText('common.save'));

    await waitFor(() =>
      expect(
        screen.getByText('payments.exceeds_debt_title'),
      ).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
