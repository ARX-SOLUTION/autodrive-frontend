import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ExpenseDetailPage from '@/pages/ExpenseDetailPage';
import { ExpenseFormDialog } from '@/pages/expenses/ExpenseFormDialog';
import type { Expense, ExpenseHistory } from '@/types/expense';
import { renderWithRouter } from '@/test/utils/renderWithRouter';
import { toast } from 'sonner';
import { within } from '@testing-library/react';

const queryState = vi.hoisted(() => ({
  data: null as Expense | null,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
}));
const permissionState = vi.hoisted(() => ({
  canViewExpenses: true,
  canManageFinance: true,
  canViewOwnSettlements: false,
}));
const expenseHooks = vi.hoisted(() => ({
  useExpense: vi.fn(),
  useExpenseHistory: vi.fn(),
  useMySettlementDetail: vi.fn(),
}));
const historyState = vi.hoisted(() => ({
  data: null as ExpenseHistory | null,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
}));
const mySettlementState = vi.hoisted(() => ({
  data: undefined as ExpenseHistory | undefined,
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
const voidPaymentMutation = vi.hoisted(() => ({
  isPending: false,
  mutate: vi.fn(),
}));
const settlementMutation = vi.hoisted(() => ({
  isPending: false,
  mutate: vi.fn(),
}));
const teacherOptionsState = vi.hoisted(() => ({
  data: [
    { id: 'teacher-1', name: 'Aziz Karimov', branch_id: 'branch-1' },
    { id: 'teacher-2', name: 'Malika Yusupova', branch_id: 'branch-2' },
  ],
}));

expenseHooks.useExpense.mockImplementation(() => queryState);
expenseHooks.useExpenseHistory.mockImplementation(() => historyState);
expenseHooks.useMySettlementDetail.mockImplementation(() => mySettlementState);

vi.mock('@/services/expenseService', () => ({
  useExpense: expenseHooks.useExpense,
  useExpenseHistory: expenseHooks.useExpenseHistory,
  useMySettlementDetail: expenseHooks.useMySettlementDetail,
  useExpenseBranchOptions: () => ({ data: [] }),
  useExpenseTeacherOptions: () => teacherOptionsState,
  useExpenseVehicleOptions: () => ({ data: [] }),
  useCreateExpensePayment: () => paymentMutation,
  useCancelExpense: () => cancelMutation,
  useDeleteExpense: () => deleteMutation,
  useCreateExpense: () => lifecycleMutation,
  useCreateTeacherSettlement: () => settlementMutation,
  useUpdateExpense: () => updateMutation,
  useVoidExpensePayment: () => voidPaymentMutation,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/useCan', () => ({
  useCan: (capability: string) => {
    if (capability === 'viewExpenses') return permissionState.canViewExpenses;
    if (capability === 'manageCompanyFinance')
      return permissionState.canManageFinance;
    if (capability === 'viewOwnSettlements')
      return permissionState.canViewOwnSettlements;
    return false;
  },
}));

const expense: Expense = {
  id: 'expense-1',
  branch_id: 'branch-1',
  branch_name: 'Chorsu',
  vehicle_id: null,
  vehicle_plate_number: null,
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
  reviewed_at: null,
  reviewed_by_id: null,
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
  mySettlementState.data = undefined;
  mySettlementState.isLoading = false;
  mySettlementState.isError = false;
  mySettlementState.refetch.mockReset();
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
  voidPaymentMutation.isPending = false;
  voidPaymentMutation.mutate.mockReset();
  settlementMutation.isPending = false;
  settlementMutation.mutate.mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  permissionState.canViewExpenses = true;
  permissionState.canManageFinance = true;
  permissionState.canViewOwnSettlements = false;
  expenseHooks.useExpense.mockReset().mockImplementation(() => queryState);
  expenseHooks.useExpenseHistory
    .mockReset()
    .mockImplementation(() => historyState);
  expenseHooks.useMySettlementDetail
    .mockReset()
    .mockImplementation(() => mySettlementState);
  cleanup();
});

describe('ExpenseDetailPage', () => {
  it('uses teacher-scoped settlement data without finance actions', async () => {
    permissionState.canViewExpenses = false;
    permissionState.canManageFinance = false;
    permissionState.canViewOwnSettlements = true;
    const ownSettlement = {
      ...expense,
      category: 'teacher_settlement' as const,
      teacher_id: 'teacher-1',
    };
    mySettlementState.data = {
      ...history,
      expense: ownSettlement,
    };

    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/my-settlements/expense-1',
      routePattern: '/my-settlements/$id',
      params: { id: 'expense-1' },
    });

    expect(expenseHooks.useExpense).toHaveBeenCalledWith(undefined);
    expect(expenseHooks.useExpenseHistory).toHaveBeenCalledWith(undefined);
    expect(expenseHooks.useMySettlementDetail).toHaveBeenCalledWith(
      'expense-1',
    );
    expect(screen.getByText('Office rent')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: 'expenses.payments.void_action',
      }),
    ).not.toBeInTheDocument();
  });

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

    fireEvent.mouseDown(
      screen.getByRole('tab', { name: 'expenses.payments.title' }),
    );

    expect(screen.getByText('expenses.payments.active')).toBeInTheDocument();
    expect(screen.getByText('expenses.payments.voided')).toBeInTheDocument();
    expect(screen.getByText(/2026-08-30/)).toBeInTheDocument();
  });

  it.each([
    [
      'branch',
      '?return_attention=overdue&return_branch_id=branch-2&return_scope=company',
      { attention: 'overdue', branch_id: 'branch-2' },
    ],
    [
      'company',
      '?return_attention=overdue&return_scope=company',
      { attention: 'overdue', scope: 'company' },
    ],
  ] as const)(
    'returns from success to the exact overdue %s scope',
    async (_label, search, expected) => {
      queryState.data = expense;
      historyState.data = history;
      const { router } = await renderWithRouter(<ExpenseDetailPage />, {
        initialEntry: `/expenses/expense-1${search}`,
        routePattern: '/expenses/$id',
        params: { id: 'expense-1' },
      });

      fireEvent.click(
        screen.getByRole('button', { name: 'expenses.detail.back' }),
      );

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/expenses');
        expect(router.state.location.search).toEqual(expected);
      });
    },
  );

  it.each(['loading', 'error'] as const)(
    'uses overdue return context from the %s state',
    async (state) => {
      queryState.isLoading = state === 'loading';
      queryState.isError = state === 'error';
      const { router } = await renderWithRouter(<ExpenseDetailPage />, {
        initialEntry:
          '/expenses/expense-1?return_attention=overdue&return_scope=company',
        routePattern: '/expenses/$id',
        params: { id: 'expense-1' },
      });

      fireEvent.click(
        screen.getByRole('button', { name: 'expenses.detail.back' }),
      );

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/expenses');
        expect(router.state.location.search).toEqual({
          attention: 'overdue',
          scope: 'company',
        });
      });
    },
  );

  it('shows payment-history loading and retry states', async () => {
    queryState.data = expense;
    historyState.isLoading = true;
    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });
    fireEvent.mouseDown(
      screen.getByRole('tab', { name: 'expenses.payments.title' }),
    );
    expect(screen.getByText('expenses.payments.loading')).toBeInTheDocument();

    cleanup();
    historyState.isLoading = false;
    historyState.isError = true;
    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });
    fireEvent.mouseDown(
      screen.getByRole('tab', { name: 'expenses.payments.title' }),
    );
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

    fireEvent.mouseDown(
      screen.getByRole('tab', { name: 'expenses.payments.title' }),
    );

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

    fireEvent.mouseDown(
      screen.getByRole('tab', { name: 'expenses.payments.title' }),
    );

    expect(
      screen.getByRole('button', { name: 'expenses.payments.saving' }),
    ).toBeDisabled();
    expect(screen.getByLabelText('expenses.payments.amount')).toBeDisabled();
  });

  it('lets finance users edit metadata after payment and cancel with reason/version', async () => {
    const paidExpense = {
      ...expense,
      vehicle_id: 'vehicle-old',
      vehicle_plate_number: 'OLD 001',
      has_payment_history: true,
    };
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
    expect(screen.getByLabelText('expenses.form.vehicle')).toBeDisabled();
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
    expect(updateMutation.mutate.mock.calls[0][0]).not.toHaveProperty(
      'vehicle_id',
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

  it('keeps a transferred vehicle link on an unrelated finance edit', async () => {
    const transferredVehicleExpense = {
      ...expense,
      vehicle_id: 'vehicle-old',
      vehicle_plate_number: 'OLD 001',
      paid_amount: '0.00',
      remaining_amount: expense.amount,
      status: 'planned' as const,
      has_payment_history: false,
    };
    queryState.data = transferredVehicleExpense;
    historyState.data = {
      ...history,
      expense: transferredVehicleExpense,
      payments: [],
    };
    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
    fireEvent.change(await screen.findByLabelText(/expenses\.table\.title/), {
      target: { value: 'Updated rent note' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.form.update_submit' }),
    );

    await waitFor(() => expect(updateMutation.mutate).toHaveBeenCalledOnce());
    const payload = updateMutation.mutate.mock.calls[0][0];
    expect(payload).not.toHaveProperty('branch_id');
    expect(payload).not.toHaveProperty('vehicle_id');
  });

  it('clears the vehicle when finance explicitly moves the expense to company-wide', async () => {
    const linkedExpense = {
      ...expense,
      vehicle_id: 'vehicle-old',
      vehicle_plate_number: 'OLD 001',
      paid_amount: '0.00',
      remaining_amount: expense.amount,
      status: 'planned' as const,
      has_payment_history: false,
    };
    queryState.data = linkedExpense;
    historyState.data = { ...history, expense: linkedExpense, payments: [] };
    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
    fireEvent.click(screen.getByLabelText(/expenses\.form\.branch/));
    fireEvent.click(
      screen.getByRole('option', { name: 'expenses.form.company_wide' }),
    );
    expect(screen.getByLabelText('expenses.form.vehicle')).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.form.update_submit' }),
    );

    await waitFor(() => expect(updateMutation.mutate).toHaveBeenCalledOnce());
    expect(updateMutation.mutate.mock.calls[0][0]).toMatchObject({
      branch_id: null,
      vehicle_id: null,
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

  it('consumes an initial pay-remaining intent once in React StrictMode', async () => {
    const freshExpense = { ...expense, remaining_amount: '90432.12' };
    let resolveRefresh!: (value: unknown) => void;
    const refresh = new Promise((resolve) => {
      resolveRefresh = resolve;
    });
    queryState.data = expense;
    historyState.data = history;
    historyState.refetch.mockReturnValue(refresh);

    const { router } = await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry:
        '/expenses/expense-1?tab=payments&action=pay_remaining&return_attention=overdue&return_scope=company',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
      reactStrictMode: true,
    });

    await waitFor(() => {
      expect(historyState.refetch).toHaveBeenCalledOnce();
      expect(historyState.refetch.mock.calls[0]).toEqual([]);
      expect(router.state.location.search).toEqual({
        tab: 'payments',
        return_attention: 'overdue',
        return_scope: 'company',
      });
    });
    expect(router.history.canGoBack()).toBe(false);
    expect(screen.getByLabelText('expenses.payments.amount')).toBeDisabled();
    expect(queryState.refetch).not.toHaveBeenCalled();

    await act(async () => {
      resolveRefresh({
        isSuccess: true,
        data: { ...history, expense: freshExpense },
      });
      await refresh;
    });

    await waitFor(() => {
      expect(screen.getByLabelText('expenses.payments.amount')).toHaveValue(
        '90432.12',
      );
      expect(
        screen.getByLabelText('expenses.payments.amount'),
      ).not.toBeDisabled();
    });
    expect(historyState.refetch).toHaveBeenCalledOnce();
  });

  it('runs later and repeated pay-remaining intents on the same mounted route', async () => {
    const firstFreshExpense = {
      ...expense,
      remaining_amount: '90432.12',
      version: 2,
    };
    const secondFreshExpense = {
      ...expense,
      remaining_amount: '80000.00',
      version: 3,
    };
    let resolveFirstRefresh!: (value: unknown) => void;
    const firstRefresh = new Promise((resolve) => {
      resolveFirstRefresh = resolve;
    });
    queryState.data = expense;
    historyState.data = history;
    historyState.refetch
      .mockReturnValueOnce(firstRefresh)
      .mockResolvedValueOnce({
        isSuccess: true,
        data: { ...history, expense: secondFreshExpense },
      });

    const { router } = await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1?tab=payments',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });

    await act(async () => {
      await router.navigate({
        href: '/expenses/expense-1?tab=payments&action=pay_remaining',
      });
    });

    expect(screen.getByLabelText('expenses.payments.amount')).toBeDisabled();
    await waitFor(() => {
      expect(historyState.refetch).toHaveBeenCalledOnce();
      expect(historyState.refetch).toHaveBeenLastCalledWith();
      expect(router.state.location.search).toEqual({ tab: 'payments' });
    });
    expect(queryState.refetch).not.toHaveBeenCalled();

    await act(async () => {
      resolveFirstRefresh({
        isSuccess: true,
        data: { ...history, expense: firstFreshExpense },
      });
      await firstRefresh;
    });
    await waitFor(() => {
      expect(screen.getByLabelText('expenses.payments.amount')).toHaveValue(
        '90432.12',
      );
      expect(
        screen.getByLabelText('expenses.payments.amount'),
      ).not.toBeDisabled();
    });

    await act(async () => {
      await router.navigate({
        href: '/expenses/expense-1?tab=payments&action=pay_remaining',
      });
    });

    await waitFor(() => {
      expect(historyState.refetch).toHaveBeenCalledTimes(2);
      expect(screen.getByLabelText('expenses.payments.amount')).toHaveValue(
        '80000.00',
      );
      expect(router.state.location.search).toEqual({ tab: 'payments' });
    });
    expect(queryState.refetch).not.toHaveBeenCalled();
  });

  it('ignores an older deferred response after expense-id/action navigation', async () => {
    const expenseTwo = {
      ...expense,
      id: 'expense-2',
      title: 'Vehicle fuel',
      remaining_amount: '700.00',
    };
    const historyTwo = { ...history, expense: expenseTwo, payments: [] };
    const refreshes = new Map<string, ReturnType<typeof vi.fn>>();
    let resolveExpenseOne!: (value: unknown) => void;
    const expenseOneRefresh = new Promise((resolve) => {
      resolveExpenseOne = resolve;
    });
    let resolveExpenseTwo!: (value: unknown) => void;
    const expenseTwoRefresh = new Promise((resolve) => {
      resolveExpenseTwo = resolve;
    });
    refreshes.set('expense-1', vi.fn().mockReturnValue(expenseOneRefresh));
    refreshes.set('expense-2', vi.fn().mockReturnValue(expenseTwoRefresh));
    expenseHooks.useExpense.mockImplementation((expenseId?: string) => ({
      ...queryState,
      data: expenseId === 'expense-2' ? expenseTwo : expense,
    }));
    expenseHooks.useExpenseHistory.mockImplementation((expenseId?: string) => ({
      ...historyState,
      data: expenseId === 'expense-2' ? historyTwo : history,
      refetch: refreshes.get(expenseId ?? ''),
    }));

    const { router } = await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1?tab=payments&action=pay_remaining',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });
    await waitFor(() => {
      expect(refreshes.get('expense-1')).toHaveBeenCalledOnce();
      expect(router.state.location.search).toEqual({ tab: 'payments' });
    });

    await act(async () => {
      await router.navigate({
        href: '/expenses/expense-2?tab=payments&action=pay_remaining',
      });
    });
    await waitFor(() => {
      expect(refreshes.get('expense-2')).toHaveBeenCalledOnce();
      expect(screen.getByLabelText('expenses.payments.amount')).toBeDisabled();
      expect(router.state.location.search).toEqual({ tab: 'payments' });
    });
    expect(expenseHooks.useExpense).toHaveBeenLastCalledWith('expense-2');
    expect(expenseHooks.useExpenseHistory).toHaveBeenLastCalledWith(
      'expense-2',
    );

    await act(async () => {
      resolveExpenseOne({
        isSuccess: true,
        data: { ...history, expense: { ...expense, remaining_amount: '1.00' } },
      });
      await expenseOneRefresh;
    });
    expect(screen.getByLabelText('expenses.payments.amount')).toHaveValue('');
    expect(screen.getByLabelText('expenses.payments.amount')).toBeDisabled();

    await act(async () => {
      resolveExpenseTwo({ isSuccess: true, data: historyTwo });
      await expenseTwoRefresh;
    });
    await waitFor(() => {
      expect(screen.getByLabelText('expenses.payments.amount')).toHaveValue(
        '700.00',
      );
      expect(
        screen.getByLabelText('expenses.payments.amount'),
      ).not.toBeDisabled();
    });
  });

  it('clears shortcut pending without overwriting input when history refresh rejects', async () => {
    queryState.data = expense;
    historyState.data = history;
    historyState.refetch.mockRejectedValue(new Error('history unavailable'));

    const { router } = await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1?tab=payments',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });
    fireEvent.change(screen.getByLabelText('expenses.payments.amount'), {
      target: { value: '321.00' },
    });

    await act(async () => {
      await router.navigate({
        href: '/expenses/expense-1?tab=payments&action=pay_remaining',
      });
    });

    await waitFor(() => {
      expect(historyState.refetch).toHaveBeenCalledOnce();
      expect(
        screen.getByLabelText('expenses.payments.amount'),
      ).not.toBeDisabled();
      expect(router.state.location.search).toEqual({ tab: 'payments' });
    });
    expect(screen.getByLabelText('expenses.payments.amount')).toHaveValue(
      '321.00',
    );
    expect(queryState.refetch).not.toHaveBeenCalled();
  });

  it.each(['planned', 'paid', 'cancelled'] as const)(
    'does not prefill after an authoritative %s result',
    async (status) => {
      const freshExpense = {
        ...expense,
        status,
        remaining_amount: '123.45',
      };
      queryState.data = expense;
      historyState.data = history;
      historyState.refetch.mockResolvedValue({
        isSuccess: true,
        data: { ...history, expense: freshExpense },
      });

      await renderWithRouter(<ExpenseDetailPage />, {
        initialEntry: '/expenses/expense-1?tab=payments&action=pay_remaining',
        routePattern: '/expenses/$id',
        params: { id: 'expense-1' },
      });

      await waitFor(() =>
        expect(
          screen.getByLabelText('expenses.payments.amount'),
        ).not.toBeDisabled(),
      );
      expect(screen.getByLabelText('expenses.payments.amount')).toHaveValue('');
    },
  );

  it('preserves user edits across cache rerenders after consuming an intent', async () => {
    const freshExpense = { ...expense, remaining_amount: '90432.12' };
    queryState.data = expense;
    historyState.data = history;
    historyState.refetch.mockResolvedValue({
      isSuccess: true,
      data: { ...history, expense: freshExpense },
    });

    const rendered = await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1?tab=payments&action=pay_remaining',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });
    await waitFor(() =>
      expect(screen.getByLabelText('expenses.payments.amount')).toHaveValue(
        '90432.12',
      ),
    );
    fireEvent.change(screen.getByLabelText('expenses.payments.amount'), {
      target: { value: '80000.00' },
    });
    historyState.data = {
      ...history,
      expense: { ...freshExpense, remaining_amount: '70000.00', version: 3 },
    };
    rendered.rerender(<ExpenseDetailPage />);

    expect(screen.getByLabelText('expenses.payments.amount')).toHaveValue(
      '80000.00',
    );
    expect(historyState.refetch).toHaveBeenCalledOnce();
  });

  it('removes a crafted manager action without refreshing or exposing payments', async () => {
    permissionState.canManageFinance = false;
    queryState.data = expense;
    historyState.data = history;

    const { router } = await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1?tab=payments&action=pay_remaining',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });

    expect(screen.queryByText('expenses.payments.title')).toBeNull();
    expect(screen.queryByLabelText('expenses.payments.amount')).toBeNull();
    expect(queryState.refetch).not.toHaveBeenCalled();
    expect(historyState.refetch).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ tab: 'payments' }),
    );
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

  it('renders void button for active payment and opens dialog', async () => {
    queryState.data = expense;
    historyState.data = history;

    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1?tab=payments',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });

    const voidButtons = screen.getAllByRole('button', {
      name: 'expenses.payments.void_action',
    });
    expect(voidButtons).toHaveLength(1);

    fireEvent.click(voidButtons[0]);

    expect(
      screen.getByText('expenses.payments.void_title'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('expenses.payments.void_reason'),
    ).toBeInTheDocument();
  });

  it('validates void reason is required before submitting', async () => {
    queryState.data = expense;
    historyState.data = history;

    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1?tab=payments',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.payments.void_action' }),
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.payments.void_confirm' }),
    );

    expect(
      screen.getByText('expenses.payments.void_reason_required'),
    ).toBeInTheDocument();
    expect(voidPaymentMutation.mutate).not.toHaveBeenCalled();
  });

  it('submits void mutation with reason and expected_version, then refetches queries', async () => {
    queryState.data = expense;
    historyState.data = history;

    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1?tab=payments',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.payments.void_action' }),
    );

    fireEvent.change(screen.getByLabelText('expenses.payments.void_reason'), {
      target: { value: 'Paid via wrong bank account' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.payments.void_confirm' }),
    );

    expect(voidPaymentMutation.mutate).toHaveBeenCalledOnce();
    const [payload, options] = voidPaymentMutation.mutate.mock.calls[0];
    expect(payload).toEqual({
      paymentId: 'payment-active',
      reason: 'Paid via wrong bank account',
      expected_version: expense.version,
    });

    await act(async () => {
      options.onSuccess();
    });
    await waitFor(() => {
      expect(queryState.refetch).toHaveBeenCalledOnce();
      expect(historyState.refetch).toHaveBeenCalledOnce();
    });
  });

  it('handles 409 conflict during void payment and refetches data', async () => {
    queryState.data = expense;
    historyState.data = history;

    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1?tab=payments',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.payments.void_action' }),
    );

    fireEvent.change(screen.getByLabelText('expenses.payments.void_reason'), {
      target: { value: 'Void duplicate' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.payments.void_confirm' }),
    );

    const [, options] = voidPaymentMutation.mutate.mock.calls[0];
    await act(async () => {
      options.onError({ response: { status: 409 } });
    });

    await waitFor(() => {
      expect(
        screen.getByText('expenses.payments.void_conflict'),
      ).toBeInTheDocument();
      expect(queryState.refetch).toHaveBeenCalledOnce();
      expect(historyState.refetch).toHaveBeenCalledOnce();
    });
  });

  it('does not show void action button when user lacks finance permission', async () => {
    permissionState.canManageFinance = false;
    queryState.data = expense;
    historyState.data = history;

    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1',
      routePattern: '/expenses/$id',
      params: { id: 'expense-1' },
    });

    expect(
      screen.queryByRole('button', { name: 'expenses.payments.void_action' }),
    ).toBeNull();
  });
});

describe('ExpenseFormDialog settlement mode', () => {
  const branches = [{ id: 'branch-1', name: 'Chorsu' }];

  const pickTeacher = (name: string) => {
    fireEvent.click(screen.getByLabelText(/expenses\.settlement\.teacher/));
    fireEvent.click(within(screen.getByRole('listbox')).getByText(name));
  };

  const fillSettlementForm = () => {
    pickTeacher('Aziz Karimov');
    fireEvent.change(
      screen.getByLabelText(/expenses\.settlement\.period_month/),
      { target: { value: '2026-09' } },
    );
    fireEvent.change(screen.getByLabelText(/expenses\.table\.title/), {
      target: { value: 'September settlement' },
    });
    fireEvent.change(screen.getByLabelText(/expenses\.form\.amount/), {
      target: { value: '150000.00' },
    });
  };

  it('submits teacher/month settlement without branch_id', async () => {
    await renderWithRouter(
      <ExpenseFormDialog
        open
        mode="settlement"
        branches={branches}
        onClose={vi.fn()}
      />,
      { initialEntry: '/expenses', routePattern: '/expenses' },
    );

    expect(screen.queryByLabelText('expenses.form.vehicle')).toBeNull();
    expect(screen.queryByText('Chorsu')).not.toBeInTheDocument();
    expect(
      screen.getByText('expenses.settlement.branch_pending'),
    ).toBeInTheDocument();
    fillSettlementForm();
    expect(screen.getByText('Chorsu')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.settlement.submit' }),
    );

    await waitFor(() => {
      expect(settlementMutation.mutate).toHaveBeenCalledOnce();
    });

    const [payload] = settlementMutation.mutate.mock.calls[0];
    expect(payload).toMatchObject({
      teacher_id: 'teacher-1',
      period_month: '2026-09',
      title: 'September settlement',
      amount: '150000.00',
      due_date: null,
      payee: null,
      note: null,
    });
    expect(payload).toHaveProperty('idempotency_key');
    expect(payload).not.toHaveProperty('branch_id');
    expect(payload).not.toHaveProperty('category');
  });

  it('surfaces duplicate-month / foreign-teacher server errors', async () => {
    await renderWithRouter(
      <ExpenseFormDialog
        open
        mode="settlement"
        branches={branches}
        onClose={vi.fn()}
      />,
      { initialEntry: '/expenses', routePattern: '/expenses' },
    );

    fillSettlementForm();
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.settlement.submit' }),
    );

    await waitFor(() => {
      expect(settlementMutation.mutate).toHaveBeenCalledOnce();
    });

    const [, options] = settlementMutation.mutate.mock.calls[0];
    await act(async () => {
      options.onError({
        response: {
          status: 409,
          data: {
            error: {
              message:
                'Active settlement already exists for this teacher and month',
            },
          },
        },
      });
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Active settlement already exists for this teacher and month',
        expect.objectContaining({
          action: expect.objectContaining({ label: 'common.retry' }),
        }),
      );
    });
  });
});
