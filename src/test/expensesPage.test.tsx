import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import ExpensesPage from '@/pages/ExpensesPage';
import type { Expense } from '@/types/expense';
import { renderWithRouter } from '@/test/utils/renderWithRouter';
import { useAuthStore } from '@/store/authStore';

const {
  createExpenseMock,
  useExpensesPageMock,
  useOverdueExpenseSweepMock,
  useExpenseTriageCountsMock,
  useExpenseBranchOptionsMock,
  useExpenseVehicleOptionsMock,
  useUpdateExpenseMock,
  useDeletedExpenseHistoryPageMock,
} = vi.hoisted(() => ({
  createExpenseMock: vi.fn(),
  useExpensesPageMock: vi.fn(),
  useOverdueExpenseSweepMock: vi.fn(),
  useExpenseTriageCountsMock: vi.fn(),
  useExpenseBranchOptionsMock: vi.fn(),
  useExpenseVehicleOptionsMock: vi.fn(),
  useUpdateExpenseMock: vi.fn(),
  useDeletedExpenseHistoryPageMock: vi.fn(),
}));

vi.mock('@/services/expenseService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/expenseService')>();
  return {
    ...actual,
    useExpensesPage: useExpensesPageMock,
    useOverdueExpenseSweep: useOverdueExpenseSweepMock,
    useExpenseTriageCounts: useExpenseTriageCountsMock,
    useExpenseBranchOptions: useExpenseBranchOptionsMock,
    useExpenseVehicleOptions: useExpenseVehicleOptionsMock,
    useExpenseTeacherOptions: () => ({ data: [] }),
    useDeletedExpenseHistoryPage: useDeletedExpenseHistoryPageMock,
    useCreateExpense: () => ({ mutate: createExpenseMock, isPending: false }),
    useCreateTeacherSettlement: () => ({
      mutate: vi.fn(),
      isPending: false,
    }),
    useUpdateExpense: () => ({
      mutate: useUpdateExpenseMock,
      isPending: false,
    }),
  };
});

const EXPENSES: Expense[] = [
  {
    id: 'e1',
    branch_id: 'b1',
    branch_name: 'Chilonzor',
    vehicle_id: 'v1',
    vehicle_plate_number: '01 A 123 BC',
    created_by_id: 'u1',
    category: 'rent',
    title: 'Ofis ijarasi',
    amount: '1250000',
    expense_date: '2026-08-12',
    due_date: '2026-08-20',
    payee: 'Real Estate LLC',
    note: 'August rent',
    paid_amount: '500000',
    remaining_amount: '750000',
    status: 'partially_paid',
    reviewed_at: null,
    reviewed_by_id: null,
    version: 1,
    created_at: '2026-08-12T00:00:00.000Z',
    updated_at: '2026-08-12T00:00:00.000Z',
  },
];

const renderPage = (initialEntry = '/expenses') =>
  renderWithRouter(<ExpensesPage />, {
    initialEntry,
    routePattern: '/expenses',
  });

beforeEach(() => {
  useAuthStore.getState().setAuth('token', {
    id: 'owner-1',
    email: 'owner@example.com',
    role: 'owner',
    company_id: 'company-1',
  });
  createExpenseMock.mockReset();
  useExpenseBranchOptionsMock.mockReset().mockReturnValue({
    data: [{ id: 'b1', name: 'Chilonzor' }],
    isLoading: false,
  });
  useExpenseVehicleOptionsMock.mockReset().mockReturnValue({
    data: [
      {
        id: 'v1',
        plate_number: '01 A 123 BC',
        branch_id: 'b1',
        make: 'Chevrolet',
        model: 'Cobalt',
      },
    ],
    isLoading: false,
  });
  useExpenseTriageCountsMock.mockReset().mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  useOverdueExpenseSweepMock.mockReset().mockReturnValue({
    data: [],
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  });
  useDeletedExpenseHistoryPageMock.mockReset().mockReturnValue({
    data: { data: [], meta: { total: 0, totalPages: 1 } },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  });
  useExpensesPageMock.mockReset().mockReturnValue({
    data: { data: EXPENSES, meta: { total: 1, totalPages: 1 } },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ExpensesPage', () => {
  it.each(['owner', 'accountant'] as const)(
    'shows finance-only deleted history to %s users',
    async (role) => {
      useAuthStore.getState().setAuth('token', {
        id: `${role}-1`,
        email: `${role}@example.com`,
        role,
        company_id: 'company-1',
      });

      await renderPage();

      expect(
        screen.getByRole('button', {
          name: 'expenses.deleted_history.action',
        }),
      ).toBeInTheDocument();
    },
  );

  it.each(['manager', 'operator', 'teacher', 'dev'] as const)(
    'hides finance-only deleted history from %s users',
    async (role) => {
      useAuthStore.getState().setAuth('token', {
        id: `${role}-1`,
        email: `${role}@example.com`,
        role,
        company_id: 'company-1',
        ...(role === 'manager' ? { branch_id: 'b1' } : {}),
      });

      await renderPage();

      expect(
        screen.queryByRole('button', {
          name: 'expenses.deleted_history.action',
        }),
      ).not.toBeInTheDocument();
    },
  );

  it.each(['owner', 'accountant'] as const)(
    'shows the month-close export to %s users',
    async (role) => {
      useAuthStore.getState().setAuth('token', {
        id: `${role}-1`,
        email: `${role}@example.com`,
        role,
        company_id: 'company-1',
      });

      await renderPage();

      expect(
        screen.getByRole('button', { name: 'expenses.month_close.action' }),
      ).toBeInTheDocument();
    },
  );

  it.each(['manager', 'operator', 'teacher', 'dev'] as const)(
    'hides the month-close export from %s users',
    async (role) => {
      useAuthStore.getState().setAuth('token', {
        id: `${role}-1`,
        email: `${role}@example.com`,
        role,
        company_id: 'company-1',
        ...(role === 'manager' ? { branch_id: 'b1' } : {}),
      });

      await renderPage();

      expect(
        screen.queryByRole('button', { name: 'expenses.month_close.action' }),
      ).not.toBeInTheDocument();
    },
  );

  it('blocks export while initial branch options are pending without data', async () => {
    useExpenseBranchOptionsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isPending: true,
      isError: false,
      refetch: vi.fn(),
    });
    await renderPage();

    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.month_close.action' }),
    );
    fireEvent.change(screen.getByLabelText('expenses.month_close.month'), {
      target: { value: '2026-08' },
    });

    expect(screen.getByText('common.loading')).toBeInTheDocument();
    expect(screen.getByLabelText('expenses.month_close.branch')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'expenses.month_close.submit' }),
    ).toBeDisabled();
  });

  it('shows branch option errors and retries without enabling export', async () => {
    const refetchBranches = vi.fn();
    useExpenseBranchOptionsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: refetchBranches,
    });
    await renderPage();

    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.month_close.action' }),
    );
    fireEvent.change(screen.getByLabelText('expenses.month_close.month'), {
      target: { value: '2026-08' },
    });

    expect(screen.getByText('common.error')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'expenses.month_close.submit' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(refetchBranches).toHaveBeenCalledTimes(1);
  });

  it('feeds URL filters into the query and opens the detail page from a row click', async () => {
    useExpensesPageMock.mockReturnValue({
      data: { data: EXPENSES, meta: { total: 1, totalPages: 2 } },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
    const { router } = await renderPage(
      '/expenses?branch_id=b1&category=rent&status=paid&page=2&date_from=2026-08-01&date_to=2026-08-31',
    );

    const call = useExpensesPageMock.mock.calls.at(-1)!;
    expect(call[0]).toMatchObject({
      branchId: 'b1',
      category: 'rent',
      status: 'paid',
      page: 2,
      limit: 20,
    });
    expect(
      screen.getByRole('combobox', { name: 'common.branch' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'expenses.table.category' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'expenses.table.status' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ofis ijarasi')).toBeInTheDocument();
    expect(screen.getAllByText('01 A 123 BC').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText('Ofis ijarasi'));
    expect(router.state.location.pathname).toBe('/expenses/e1');
  });

  it('renders explicit empty and error states', async () => {
    useExpensesPageMock.mockReturnValue({
      data: { data: [], meta: { total: 0, totalPages: 1 } },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
    await renderPage();
    expect(screen.getByText('expenses.empty')).toBeInTheDocument();

    const refetch = vi.fn();
    useExpensesPageMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch,
    });
    await renderPage('/expenses?status=cancelled');
    expect(screen.getByText('common.error')).toBeInTheDocument();
    fireEvent.click(screen.getByText('common.retry'));
    expect(refetch).toHaveBeenCalled();
  });

  it('submits the create form with a canonical company-wide payload', async () => {
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'expenses.add' }));
    expect(screen.getByText('expenses.form.title')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/expenses\.table\.title/), {
      target: { value: 'Ofis ijarasi' },
    });
    fireEvent.change(screen.getByLabelText(/expenses\.form\.amount/), {
      target: { value: '1250000' },
    });
    expect(screen.getByLabelText(/expenses\.form\.amount/)).toHaveValue(
      '1 250 000',
    );
    fireEvent.change(screen.getByLabelText(/expenses\.form\.expense_date/), {
      target: { value: '2026-08-12' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.form.submit' }),
    );

    await waitFor(() =>
      expect(createExpenseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          branch_id: null,
          category: 'rent',
          title: 'Ofis ijarasi',
          amount: '1250000.00',
          expense_date: '2026-08-12',
          due_date: null,
          idempotency_key: expect.any(String),
        }),
        expect.any(Object),
      ),
    );
  });

  it('clears the vehicle when the selected branch changes', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'expenses.add' }));
    fireEvent.click(screen.getByLabelText(/expenses\.form\.branch/));
    fireEvent.click(screen.getByRole('option', { name: 'Chilonzor' }));
    expect(useExpenseVehicleOptionsMock.mock.calls.at(-1)?.[0]).toBe('b1');
    fireEvent.click(screen.getByLabelText('expenses.form.vehicle'));
    fireEvent.click(screen.getByRole('option', { name: /01 A 123 BC/ }));
    fireEvent.click(screen.getByLabelText(/expenses\.form\.branch/));
    fireEvent.click(
      screen.getByRole('option', { name: 'expenses.form.company_wide' }),
    );
    expect(screen.getByLabelText('expenses.form.vehicle')).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/expenses\.table\.title/), {
      target: { value: 'Fuel' },
    });
    fireEvent.change(screen.getByLabelText(/expenses\.form\.amount/), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText(/expenses\.form\.expense_date/), {
      target: { value: '2026-09-20' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'expenses.form.submit' }),
    );
    await waitFor(() => expect(createExpenseMock).toHaveBeenCalledOnce());
    expect(createExpenseMock.mock.calls[0][0]).not.toHaveProperty('vehicle_id');
  });
});
