import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ExpenseDetailPage from '@/pages/ExpenseDetailPage';
import type { Expense, ExpenseHistory } from '@/types/expense';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

const queryState = vi.hoisted(() => ({
  data: null as Expense | null,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
}));
const permissionState = vi.hoisted(() => ({ canViewExpenses: true }));
const historyState = vi.hoisted(() => ({
  data: null as ExpenseHistory | null,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
}));
const paymentMutation = vi.hoisted(() => ({
  isPending: false,
  mutate: vi.fn(),
}));
const lifecycleMutation = vi.hoisted(() => ({
  isPending: false,
  mutate: vi.fn(),
}));
const cancelMutation = vi.hoisted(() => ({
  isPending: false,
  mutate: vi.fn(),
}));
const deleteMutation = vi.hoisted(() => ({
  isPending: false,
  mutate: vi.fn(),
}));
const updateMutation = vi.hoisted(() => ({
  isPending: false,
  mutate: vi.fn(),
}));

vi.mock('@/services/expenseService', () => ({
  useExpense: () => queryState,
  useExpenseHistory: () => historyState,
  useExpenseBranchOptions: () => ({ data: [] }),
  useCreateExpensePayment: () => paymentMutation,
  useCancelExpense: () => cancelMutation,
  useDeleteExpense: () => deleteMutation,
  useCreateExpense: () => lifecycleMutation,
  useUpdateExpense: () => updateMutation,
}));
vi.mock('@/hooks/useCan', () => ({
  useCan: () => permissionState.canViewExpenses,
}));

const expense: Expense = {
  id: 'expense-1',
  branch_id: 'branch-1',
  branch_name: 'Chorsu',
  created_by_id: 'owner-1',
  category: 'rent',
  title: 'Office rent',
  amount: '125000.00',
  expense_date: '2026-08-31',
  due_date: '2026-09-05',
  payee: 'Landlord',
  note: 'Monthly rent',
  paid_amount: '25000.00',
  remaining_amount: '100000.00',
  status: 'partially_paid',
  version: 1,
  created_at: '2026-08-31T00:00:00.000Z',
  updated_at: '2026-08-31T00:00:00.000Z',
};

const history: ExpenseHistory = {
  expense,
  payments: [
    {
      id: 'payment-active',
      expense_id: expense.id,
      company_id: 'company-1',
      branch_id: expense.branch_id,
      amount: '25000.00',
      payment_method: 'naqd',
      date: '2026-08-30',
      note: null,
      recorded_by_id: 'owner-1',
      idempotency_key: 'payment-key-1',
      voided_at: null,
      created_at: '2026-08-30T00:00:00.000Z',
    },
    {
      id: 'payment-voided',
      expense_id: expense.id,
      company_id: 'company-1',
      branch_id: expense.branch_id,
      amount: '10000.00',
      payment_method: 'karta',
      date: '2026-08-29',
      note: 'duplicate',
      recorded_by_id: 'owner-1',
      idempotency_key: 'payment-key-2',
      voided_at: '2026-08-31T00:00:00.000Z',
      created_at: '2026-08-29T00:00:00.000Z',
    },
  ],
};

afterEach(() => {
  queryState.data = null;
  queryState.isLoading = false;
  queryState.isError = false;
  queryState.refetch.mockReset();
  historyState.data = null;
  historyState.isLoading = false;
  historyState.isError = false;
  historyState.refetch.mockReset();
  paymentMutation.isPending = false;
  paymentMutation.mutate.mockReset();
  lifecycleMutation.isPending = false;
  lifecycleMutation.mutate.mockReset();
  cancelMutation.isPending = false;
  cancelMutation.mutate.mockReset();
  deleteMutation.isPending = false;
  deleteMutation.mutate.mockReset();
  updateMutation.isPending = false;
  updateMutation.mutate.mockReset();
  permissionState.canViewExpenses = true;
  cleanup();
});

describe('ExpenseDetailPage', () => {
  it('renders server-provided expense totals and metadata', async () => {
    queryState.data = expense;
    historyState.data = history;
    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });

    expect(screen.getByText('Office rent')).toBeInTheDocument();
    expect(screen.getByText('125000.00 expenses.currency')).toBeInTheDocument();
    expect(screen.getByText('25000.00 expenses.currency')).toBeInTheDocument();
    expect(screen.getByText('100000.00 expenses.currency')).toBeInTheDocument();
    expect(
      screen.getByText('expenses.status.partially_paid'),
    ).toBeInTheDocument();
    expect(screen.getByText('Chorsu')).toBeInTheDocument();
    expect(screen.getByText('expenses.payments.active')).toBeInTheDocument();
    expect(screen.getByText('expenses.payments.voided')).toBeInTheDocument();
    expect(screen.getByText(/2026-08-30/)).toBeInTheDocument();
  });

  it('shows payment-history loading and retry states', async () => {
    queryState.data = expense;
    historyState.isLoading = true;
    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });
    expect(screen.getByText('expenses.payments.loading')).toBeInTheDocument();

    cleanup();
    historyState.isLoading = false;
    historyState.isError = true;
    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });
    expect(screen.getByText('expenses.payments.error')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(historyState.refetch).toHaveBeenCalledOnce();
  });

  it('submits canonical amount/version, preserves a retry key, and refetches on 409', async () => {
    queryState.data = expense;
    historyState.data = { ...history, payments: [] };
    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });

    fireEvent.change(screen.getByLabelText('expenses.payments.amount'), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByLabelText('expenses.payments.date'), {
      target: { value: '2026-08-31' },
    });
    fireEvent.change(screen.getByLabelText('expenses.payments.note'), {
      target: { value: 'Cash note' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.payments.submit' }),
    );

    expect(paymentMutation.mutate).toHaveBeenCalledOnce();
    const firstCall = paymentMutation.mutate.mock.calls[0] as [
      Record<string, unknown>,
      { onError: (error: unknown) => void },
    ];
    expect(firstCall[0]).toMatchObject({
      amount: '10.00',
      expected_version: 1,
      date: '2026-08-31',
      note: 'Cash note',
    });
    expect(typeof firstCall[0].idempotency_key).toBe('string');

    firstCall[1].onError({ response: { status: 409 } });
    expect(queryState.refetch).toHaveBeenCalledOnce();
    expect(historyState.refetch).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('expenses.payments.amount')).toHaveValue('10');
    expect(screen.getByLabelText('expenses.payments.note')).toHaveValue(
      'Cash note',
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.payments.submit' }),
    );
    const secondCall = paymentMutation.mutate.mock.calls[1] as [
      Record<string, unknown>,
    ];
    expect(secondCall[0].idempotency_key).toBe(firstCall[0].idempotency_key);
  });

  it('disables the payment form while a request is pending', async () => {
    queryState.data = expense;
    historyState.data = { ...history, payments: [] };
    paymentMutation.isPending = true;
    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });

    expect(
      screen.getByRole('button', { name: 'expenses.payments.saving' }),
    ).toBeDisabled();
    expect(screen.getByLabelText('expenses.payments.amount')).toBeDisabled();
  });

  it('lets finance users edit metadata after payment and cancel with reason/version', async () => {
    const paidExpense = { ...expense, has_payment_history: true };
    queryState.data = paidExpense;
    historyState.data = { ...history, expense: paidExpense };
    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
    const titleInput = await screen.findByLabelText(/expenses\.table\.title/);
    expect(titleInput).not.toBeDisabled();
    expect(screen.getByLabelText(/expenses\.form\.amount/)).toBeDisabled();
    expect(
      screen.getByLabelText(/expenses\.form\.expense_date/),
    ).toBeDisabled();
    fireEvent.change(titleInput, { target: { value: 'Updated rent note' } });
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.form.update_submit' }),
    );

    await waitFor(() => expect(updateMutation.mutate).toHaveBeenCalledOnce());
    expect(updateMutation.mutate.mock.calls[0][0]).toMatchObject({
      id: expense.id,
      title: 'Updated rent note',
      expected_version: expense.version,
    });
    expect(updateMutation.mutate.mock.calls[0][0]).not.toHaveProperty('amount');
    expect(updateMutation.mutate.mock.calls[0][0]).not.toHaveProperty(
      'branch_id',
    );

    cleanup();
    queryState.data = expense;
    historyState.data = history;
    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.lifecycle.cancel_action' }),
    );
    fireEvent.change(
      await screen.findByLabelText('expenses.lifecycle.reason'),
      { target: { value: 'Vendor contract ended' } },
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'expenses.lifecycle.cancel_confirm',
      }),
    );

    await waitFor(() => expect(cancelMutation.mutate).toHaveBeenCalledOnce());
    expect(cancelMutation.mutate.mock.calls[0][0]).toEqual({
      reason: 'Vendor contract ended',
      expected_version: expense.version,
    });
  });

  it('locks deletion for a paid expense and explains the cancellation path', async () => {
    queryState.data = expense;
    historyState.data = history;
    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });

    const deleteButton = screen.getByRole('button', {
      name: 'expenses.lifecycle.delete_action',
    });
    expect(deleteButton).toBeDisabled();
    expect(
      screen.getByText('expenses.lifecycle.paid_delete_locked'),
    ).toBeInTheDocument();
    expect(deleteMutation.mutate).not.toHaveBeenCalled();
  });

  it('does not expose the generic editor for reserved teacher settlements', async () => {
    const settlement = {
      ...expense,
      category: 'teacher_settlement' as const,
      paid_amount: '0.00',
      remaining_amount: expense.amount,
      status: 'planned' as const,
      has_payment_history: false,
    };
    queryState.data = settlement;
    historyState.data = { ...history, expense: settlement, payments: [] };

    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });

    expect(
      screen.queryByRole('button', { name: 'common.edit' }),
    ).not.toBeInTheDocument();
  });

  it('shows an error state with retry without mounting data', async () => {
    queryState.isError = true;
    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });

    expect(screen.getByText('expenses.load_error')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    await waitFor(() => expect(queryState.refetch).toHaveBeenCalledOnce());
    expect(screen.queryByText('Office rent')).toBeNull();
  });

  it('does not render cached finance data after capability is revoked', async () => {
    queryState.data = expense;
    permissionState.canViewExpenses = false;

    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });

    expect(screen.queryByText('Office rent')).toBeNull();
  });
});
