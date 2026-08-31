import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import ExpensesPage from '@/pages/ExpensesPage';
import type { Expense } from '@/types/expense';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

const {
  createExpenseMock,
  useExpensesPageMock,
  useExpenseBranchOptionsMock,
  useUpdateExpenseMock,
} = vi.hoisted(() => ({
  createExpenseMock: vi.fn(),
  useExpensesPageMock: vi.fn(),
  useExpenseBranchOptionsMock: vi.fn(),
  useUpdateExpenseMock: vi.fn(),
}));

vi.mock('@/services/expenseService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/expenseService')>();
  return {
    ...actual,
    useExpensesPage: useExpensesPageMock,
    useExpenseBranchOptions: useExpenseBranchOptionsMock,
    useCreateExpense: () => ({ mutate: createExpenseMock, isPending: false }),
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
  createExpenseMock.mockReset();
  useExpenseBranchOptionsMock.mockReset().mockReturnValue({
    data: [{ id: 'b1', name: 'Chilonzor' }],
    isLoading: false,
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
    expect(screen.getByText('Ofis ijarasi')).toBeInTheDocument();

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
});
