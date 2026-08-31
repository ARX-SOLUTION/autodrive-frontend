import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ExpensesPage from '@/pages/ExpensesPage';
import ExpenseDetailPage from '@/pages/ExpenseDetailPage';
import type { Expense, ExpenseHistory } from '@/types/expense';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

const state = vi.hoisted(() => ({
  user: {
    id: 'manager-1',
    role: 'manager' as const,
    company_id: 'company-1',
    branch_id: 'branch-1',
    branch_name: 'Chilonzor',
  },
  canViewExpenses: true,
  canManageFinance: false,
}));

const mocks = vi.hoisted(() => ({
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  useExpensesPage: vi.fn(),
  useExpenseBranchOptions: vi.fn(),
  useExpense: vi.fn(),
  useExpenseHistory: vi.fn(),
  useCreateExpensePayment: vi.fn(),
  useCancelExpense: vi.fn(),
  useDeleteExpense: vi.fn(),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (value: { user: typeof state.user }) => unknown) =>
    selector({ user: state.user }),
}));

vi.mock('@/hooks/useCan', () => ({
  useCan: (capability: string) =>
    capability === 'viewExpenses'
      ? state.canViewExpenses
      : state.canManageFinance,
}));

vi.mock('@/services/expenseService', () => ({
  expenseCategoryValues: [
    'rent',
    'utilities',
    'vehicle',
    'marketing',
    'supplies',
    'administrative',
    'other',
  ],
  expenseStatusValues: ['planned', 'partially_paid', 'paid', 'cancelled'],
  useExpensesPage: mocks.useExpensesPage,
  useExpenseBranchOptions: mocks.useExpenseBranchOptions,
  useCreateExpense: () => ({
    mutate: mocks.createExpense,
    isPending: false,
  }),
  useUpdateExpense: () => ({
    mutate: mocks.updateExpense,
    isPending: false,
  }),
  useExpense: mocks.useExpense,
  useExpenseHistory: mocks.useExpenseHistory,
  useCancelExpense: mocks.useCancelExpense,
  useDeleteExpense: mocks.useDeleteExpense,
  useCreateExpensePayment: () => ({
    mutate: mocks.useCreateExpensePayment,
    isPending: false,
  }),
}));

const expense: Expense = {
  id: 'expense-1',
  branch_id: 'branch-1',
  branch_name: 'Chilonzor',
  created_by_id: 'manager-1',
  category: 'supplies',
  title: 'Office supplies',
  amount: '100.00',
  expense_date: '2026-08-31',
  due_date: null,
  payee: null,
  note: null,
  paid_amount: '0.00',
  remaining_amount: '100.00',
  status: 'planned',
  version: 3,
  created_at: '2026-08-31T00:00:00.000Z',
  updated_at: '2026-08-31T00:00:00.000Z',
  has_payment_history: false,
};

const history: ExpenseHistory = {
  expense,
  payments: [
    {
      id: 'payment-1',
      expense_id: expense.id,
      company_id: 'company-1',
      branch_id: 'branch-1',
      amount: '10.00',
      payment_method: 'naqd',
      date: '2026-08-31',
      note: null,
      recorded_by_id: 'owner-1',
      idempotency_key: 'payment-1',
      voided_at: null,
      created_at: '2026-08-31T00:00:00.000Z',
    },
  ],
};

const listState = {
  data: { data: [expense], meta: { total: 1, totalPages: 1 } },
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
};

const detailState = {
  data: expense,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
};

const historyState = {
  data: history,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

beforeEach(() => {
  state.canViewExpenses = true;
  state.canManageFinance = false;
  mocks.createExpense.mockReset();
  mocks.updateExpense.mockReset();
  mocks.useExpensesPage.mockReset().mockReturnValue(listState);
  mocks.useExpenseBranchOptions.mockReset().mockReturnValue({ data: [] });
  mocks.useExpense.mockReset().mockReturnValue(detailState);
  mocks.useExpenseHistory.mockReset().mockReturnValue(historyState);
  mocks.useCreateExpensePayment.mockReset();
  mocks.useCancelExpense.mockReset().mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  mocks.useDeleteExpense.mockReset().mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('manager expense scope', () => {
  it('pins list scope to the JWT branch and omits branch_id from create payload', async () => {
    await renderWithRouter(<ExpensesPage />, {
      initialEntry: '/expenses?branch_id=other-branch&scope=company',
      routePattern: '/expenses',
    });

    const query = mocks.useExpensesPage.mock.calls.at(-1)?.[0];
    expect(query).toMatchObject({ branchId: 'branch-1' });
    expect(query.scope).toBeUndefined();

    fireEvent.click(screen.getByRole('button', { name: 'expenses.add' }));
    expect(screen.queryByText('expenses.form.branch')).toBeNull();
    fireEvent.change(await screen.findByLabelText(/expenses\.table\.title/), {
      target: { value: 'New supplies' },
    });
    fireEvent.change(screen.getByLabelText(/expenses\.form\.amount/), {
      target: { value: '25' },
    });
    fireEvent.change(screen.getByLabelText(/expenses\.form\.expense_date/), {
      target: { value: '2026-08-31' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.form.submit' }),
    );

    await waitFor(() => expect(mocks.createExpense).toHaveBeenCalledOnce());
    const payload = mocks.createExpense.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      title: 'New supplies',
      amount: '25.00',
      expense_date: '2026-08-31',
    });
    expect(payload).not.toHaveProperty('branch_id');
  });

  it('shows only own unpaid edit and never exposes payment history/actions', async () => {
    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1',
      routePattern: '/expenses/$id',
      params: { id: expense.id },
    });

    expect(
      screen.getByRole('button', { name: 'common.edit' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('expenses.payments.title')).toBeNull();
    expect(screen.queryByLabelText('expenses.payments.amount')).toBeNull();
    expect(screen.queryByText('expenses.payments.active')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
    fireEvent.change(await screen.findByLabelText(/expenses\.table\.title/), {
      target: { value: 'Updated supplies' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.form.update_submit' }),
    );

    await waitFor(() => expect(mocks.updateExpense).toHaveBeenCalledOnce());
    const [request] = mocks.updateExpense.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(request).toMatchObject({
      id: expense.id,
      expected_version: expense.version,
      title: 'Updated supplies',
    });
    expect(request).not.toHaveProperty('branch_id');
  });

  it('keeps the manager draft visible when a concurrent payment wins', async () => {
    const rendered = await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1',
      routePattern: '/expenses/$id',
      params: { id: expense.id },
    });

    fireEvent.click(screen.getByRole('button', { name: 'common.edit' }));
    const titleInput = await screen.findByLabelText(/expenses\.table\.title/);
    fireEvent.change(titleInput, { target: { value: 'Draft kept safely' } });
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.form.update_submit' }),
    );
    await waitFor(() => expect(mocks.updateExpense).toHaveBeenCalledOnce());

    const [, options] = mocks.updateExpense.mock.calls[0] as [
      Record<string, unknown>,
      { onError: (error: unknown) => void },
    ];
    options.onError({ response: { status: 409 } });
    mocks.useExpense.mockReturnValue({
      ...detailState,
      data: {
        ...expense,
        title: 'Server payment winner',
        paid_amount: '10.00',
        remaining_amount: '90.00',
        status: 'partially_paid',
        has_payment_history: true,
      },
    });
    rendered.rerender(<ExpenseDetailPage />);

    expect(screen.getByDisplayValue('Draft kept safely')).toBeInTheDocument();
    expect(
      screen.getByText('expenses.form.update_conflict'),
    ).toBeInTheDocument();
  });

  it('does not expose edit for another creator even when the expense is unpaid', async () => {
    mocks.useExpense.mockReturnValue({
      ...detailState,
      data: { ...expense, created_by_id: 'manager-2' },
    });

    await renderWithRouter(<ExpenseDetailPage />, {
      initialEntry: '/expenses/expense-1',
      routePattern: '/expenses/$id',
      params: { id: expense.id },
    });

    expect(screen.queryByRole('button', { name: 'common.edit' })).toBeNull();
    expect(screen.queryByText('expenses.payments.title')).toBeNull();
  });
});
