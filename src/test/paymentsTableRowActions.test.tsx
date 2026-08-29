import type { ComponentProps } from 'react';
import { screen, fireEvent, cleanup, within } from '@testing-library/react';
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';
import { PaymentsTable } from '@/pages/payments/PaymentsTable';
import { renderWithRouter } from '@/test/utils/renderWithRouter';
import type { Payment } from '@/types/payment';

// Role-gated action column: PaymentsTable owns its own delete/edit mutations
// and modals (autodrive-9e4.4/5/6) -- PaymentsPage.tsx is out of scope for
// this change, so the table is self-contained rather than the
// StudentsTable/GroupsTable callback-up pattern.

const h = vi.hoisted(() => ({
  role: 'owner' as string,
  deleteMutate: vi.fn(),
  updateMutate: vi.fn(),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: h.role } }),
}));

vi.mock('@/services/paymentService', () => ({
  useDeletePayment: () => ({
    mutate: h.deleteMutate,
    isPending: false,
    isError: false,
  }),
  useUpdatePayment: () => ({
    mutate: h.updateMutate,
    isPending: false,
    isError: false,
  }),
}));

const capturedModalProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));

vi.mock('@/components/ui/PaymentModal', () => ({
  default: (props: Record<string, unknown>) => {
    capturedModalProps.current = props;
    if (!props.open) return null;
    return (
      <button
        onClick={() =>
          (props.onSubmit as (d: unknown) => void)({
            amount: 700000,
            payment_method: 'karta',
          })
        }
      >
        submit-edit
      </button>
    );
  },
}));

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
  payment_method: 'naqd',
  recorded_by: 'Operator',
  date: '2026-07-10T00:00:00.000Z',
  created_at: '2026-07-10T00:00:00.000Z',
};

const renderTable = (
  payments: Payment[] = [PAYMENT],
  overrides: Partial<ComponentProps<typeof PaymentsTable>> = {},
) =>
  renderWithRouter(
    <PaymentsTable
      payments={payments}
      isLoading={false}
      isFetching={false}
      isError={false}
      onRetry={vi.fn()}
      currentPage={1}
      pageSize={50}
      totalPayments={payments.length}
      totalPages={1}
      onPageChange={vi.fn()}
      sortField="date"
      sortDir="desc"
      onSortChange={vi.fn()}
      {...overrides}
    />,
    { initialEntry: '/payments', routePattern: '/payments' },
  );

beforeEach(() => {
  h.role = 'owner';
  capturedModalProps.current = null;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Matches the backend's PATCH/DELETE /payments/:id
// @Roles(owner, dev, manager, operator) guard exactly.
describe('PaymentsTable row actions role gating', () => {
  it('shows edit/delete for an allowed role (manager)', async () => {
    h.role = 'manager';
    await renderTable();
    expect(screen.getByLabelText('common.edit')).toBeInTheDocument();
    expect(screen.getByLabelText('common.delete')).toBeInTheDocument();
  });

  it('hides edit/delete for a disallowed role (teacher, backend would 403)', async () => {
    h.role = 'teacher';
    await renderTable();
    expect(screen.queryByLabelText('common.edit')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('common.delete')).not.toBeInTheDocument();
  });
});

describe('PaymentsTable server state', () => {
  it('emits the next server page and resolved server sort direction', async () => {
    const onPageChange = vi.fn();
    const onSortChange = vi.fn();
    await renderTable([PAYMENT], {
      totalPayments: 101,
      totalPages: 3,
      onPageChange,
      onSortChange,
    });

    fireEvent.click(screen.getByRole('button', { name: 'common.next' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'payments.amount_paid' }),
    );

    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(onSortChange).toHaveBeenCalledWith('amount_paid', 'asc');
  });
});

describe('PaymentsTable delete action', () => {
  it('confirms, then calls useDeletePayment.mutate with the row id', async () => {
    await renderTable();

    fireEvent.click(screen.getByLabelText('common.delete'));
    const dialog = screen
      .getByText('payments.delete_confirm_title')
      .closest('[role="dialog"]') as HTMLElement;
    expect(dialog).toBeTruthy();

    fireEvent.click(within(dialog).getByText('common.delete'));

    expect(h.deleteMutate).toHaveBeenCalledTimes(1);
    expect(h.deleteMutate.mock.calls[0][0]).toBe('p1');
  });

  it('does not call the mutation when the delete confirm is cancelled', async () => {
    await renderTable();

    fireEvent.click(screen.getByLabelText('common.delete'));
    const dialog = screen
      .getByText('payments.delete_confirm_title')
      .closest('[role="dialog"]') as HTMLElement;
    fireEvent.click(within(dialog).getByText('common.cancel'));

    expect(h.deleteMutate).not.toHaveBeenCalled();
  });
});

describe('PaymentsTable edit action', () => {
  it('opens PaymentModal in edit mode with the clicked row', async () => {
    await renderTable();

    fireEvent.click(screen.getByLabelText('common.edit'));

    expect(capturedModalProps.current?.open).toBe(true);
    expect(capturedModalProps.current?.payment).toEqual(PAYMENT);
  });

  it('calls useUpdatePayment.mutate with the row id and the submitted payload', async () => {
    await renderTable();

    fireEvent.click(screen.getByLabelText('common.edit'));
    fireEvent.click(screen.getByText('submit-edit'));

    expect(h.updateMutate).toHaveBeenCalledTimes(1);
    expect(h.updateMutate.mock.calls[0][0]).toEqual({
      id: 'p1',
      amount: 700000,
      payment_method: 'karta',
    });
  });
});
