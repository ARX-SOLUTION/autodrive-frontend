import type { ComponentProps } from 'react';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ExpensesPage from '@/pages/ExpensesPage';
import { ExpenseOverdueSweep } from '@/pages/expenses/ExpenseOverdueSweep';
import { formatMoney } from '@/lib/money';
import { renderWithRouter } from '@/test/utils/renderWithRouter';
import type { OverdueExpense } from '@/types/expense';

const authState = vi.hoisted(() => ({
  user: {
    id: 'owner-1',
    email: 'owner@example.com',
    role: 'owner' as 'owner' | 'accountant' | 'manager',
    company_id: 'company-1',
    branch_id: 'jwt-branch-1' as string | null,
    branch_name: 'Chilonzor',
  },
}));

const mocks = vi.hoisted(() => ({
  useExpensesPage: vi.fn(),
  useOverdueExpenseSweep: vi.fn(),
  useExpenseTriageCounts: vi.fn(),
  useExpenseBranchOptions: vi.fn(),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (
    selector: (state: { user: typeof authState.user }) => unknown,
  ) => selector({ user: authState.user }),
}));

vi.mock('@/hooks/useCan', () => ({
  useCan: (capability: string) =>
    capability === 'viewExpenses' || authState.user.role !== 'manager',
}));

vi.mock('@/lib/tashkentDate', () => ({
  tashkentTodayCalendarDate: vi.fn(() => '2026-09-01'),
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
  useOverdueExpenseSweep: mocks.useOverdueExpenseSweep,
  useExpenseTriageCounts: mocks.useExpenseTriageCounts,
  useExpenseBranchOptions: mocks.useExpenseBranchOptions,
  useCreateExpense: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateExpense: () => ({ mutate: vi.fn(), isPending: false }),
}));

const makeExpense = (
  id: string,
  overdueDays: number,
  title = `Expense ${id}`,
): OverdueExpense => ({
  id,
  branch_id: id === 'company' ? null : 'branch-1',
  branch_name: id === 'company' ? null : 'Chilonzor',
  created_by_id: 'owner-1',
  category: 'rent',
  title,
  amount: '200.00',
  expense_date: '2026-08-01',
  due_date: '2026-08-31',
  payee: null,
  note: null,
  paid_amount: '99.00',
  remaining_amount: '101.00',
  status: 'partially_paid',
  reviewed_at: null,
  reviewed_by_id: null,
  version: 1,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
  overdue_days: overdueDays,
});

const overdueRows = [
  makeExpense('eight-a', 8, 'Eight first'),
  makeExpense('one', 1, 'One day'),
  makeExpense('thirty-one', 31, 'Thirty one'),
  makeExpense('seven', 7, 'Seven days'),
  makeExpense('thirty', 30, 'Thirty days'),
  makeExpense('eight-b', 8, 'Eight second'),
];

const renderSweep = (
  props: Partial<ComponentProps<typeof ExpenseOverdueSweep>> = {},
) =>
  renderWithRouter(
    <ExpenseOverdueSweep
      expenses={overdueRows}
      isLoading={false}
      isFetching={false}
      isError={false}
      onRetry={vi.fn()}
      returnContext={{ return_attention: 'overdue' }}
      {...props}
    />,
    { initialEntry: '/expenses', routePattern: '/expenses' },
  );

beforeEach(() => {
  localStorage.clear();
  authState.user = {
    id: 'owner-1',
    email: 'owner@example.com',
    role: 'owner',
    company_id: 'company-1',
    branch_id: 'jwt-branch-1',
    branch_name: 'Chilonzor',
  };
  mocks.useExpensesPage.mockReset().mockReturnValue({
    data: { data: [], meta: { total: 0, totalPages: 1 } },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  });
  mocks.useOverdueExpenseSweep.mockReset().mockReturnValue({
    data: overdueRows,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  });
  mocks.useExpenseTriageCounts.mockReset().mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  mocks.useExpenseBranchOptions.mockReset().mockReturnValue({ data: [] });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ExpenseOverdueSweep', () => {
  it('renders exact buckets in fixed order and preserves backend order within each list', async () => {
    await renderSweep();

    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual([
      'expenses.overdue_sweep.bucket_1_7',
      'expenses.overdue_sweep.bucket_8_30',
      'expenses.overdue_sweep.bucket_31_plus',
    ]);
    const lists = screen.getAllByRole('list');
    for (const list of lists) expect(list).toHaveAttribute('role', 'list');
    expect(
      within(lists[0])
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual([
      expect.stringContaining('One day'),
      expect.stringContaining('Seven days'),
    ]);
    expect(
      within(lists[1])
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual([
      expect.stringContaining('Eight first'),
      expect.stringContaining('Thirty days'),
      expect.stringContaining('Eight second'),
    ]);
    expect(within(lists[2]).getByRole('link')).toHaveTextContent('Thirty one');
  });

  it('uses native detail links and visibly includes every required field', async () => {
    await renderSweep({
      expenses: [makeExpense('company', 7, 'Company rent')],
      returnContext: {
        return_attention: 'overdue',
        return_scope: 'company',
      },
    });

    const link = screen.getByRole('link');
    const href = new URL(link.getAttribute('href') ?? '', 'http://localhost');
    expect(href.pathname).toBe('/expenses/company');
    expect(Object.fromEntries(href.searchParams)).toEqual({
      return_attention: 'overdue',
      return_scope: 'company',
    });
    expect(link).toHaveTextContent('Company rent');
    expect(link).toHaveTextContent('expenses.form.company_wide');
    expect(link).toHaveTextContent('expenses.category.rent');
    expect(link).toHaveTextContent('2026-08-31');
    expect(link).toHaveTextContent('7');
    const remainingAmount = within(link).getByText(formatMoney('101.00'));
    expect(remainingAmount).not.toHaveClass('whitespace-nowrap');
    expect(link).not.toHaveAttribute('role', 'button');
    expect(within(link).queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders every row without pagination controls when more than 20 are returned', async () => {
    const rows = Array.from({ length: 25 }, (_, index) =>
      makeExpense(`expense-${index + 1}`, (index % 31) + 1),
    );
    await renderSweep({ expenses: rows });

    expect(screen.getAllByRole('link')).toHaveLength(25);
    expect(screen.queryByText('common.previous')).not.toBeInTheDocument();
    expect(screen.queryByText('common.next')).not.toBeInTheDocument();
  });

  it('handles initial loading, complete error retry, empty success, and background fetch accessibly', async () => {
    const loading = await renderSweep({
      expenses: [],
      isLoading: true,
      isFetching: true,
    });
    expect(
      loading.container.querySelectorAll('.animate-pulse').length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('common.loading');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    loading.unmount();

    const retry = vi.fn();
    const error = await renderSweep({
      expenses: [],
      isError: true,
      onRetry: retry,
    });
    expect(
      screen.getByRole('heading', {
        name: 'expenses.overdue_sweep.load_error',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'expenses.overdue_sweep.load_error',
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(retry).toHaveBeenCalledOnce();
    error.unmount();

    const empty = await renderSweep({ expenses: [] });
    expect(
      screen.getByText('expenses.overdue_sweep.empty'),
    ).toBeInTheDocument();
    empty.unmount();

    await renderSweep({ isFetching: true });
    expect(screen.getAllByRole('link')).toHaveLength(overdueRows.length);
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('restores focus only after its explicit retry succeeds', async () => {
    const retry = vi.fn();
    const rendered = await renderSweep({
      expenses: [],
      isError: true,
      onRetry: retry,
    });
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    rendered.rerender(
      <ExpenseOverdueSweep
        expenses={[]}
        isLoading={false}
        isFetching
        isError
        onRetry={retry}
        returnContext={{ return_attention: 'overdue' }}
      />,
    );
    rendered.rerender(
      <ExpenseOverdueSweep
        expenses={overdueRows}
        isLoading={false}
        isFetching={false}
        isError={false}
        onRetry={retry}
        returnContext={{ return_attention: 'overdue' }}
      />,
    );

    expect(screen.getByRole('region')).toHaveFocus();
    rendered.unmount();

    const failed = await renderSweep({
      expenses: [],
      isError: true,
      onRetry: retry,
    });
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    failed.rerender(
      <ExpenseOverdueSweep
        expenses={[]}
        isLoading={false}
        isFetching
        isError
        onRetry={retry}
        returnContext={{ return_attention: 'overdue' }}
      />,
    );
    failed.rerender(
      <ExpenseOverdueSweep
        expenses={[]}
        isLoading={false}
        isFetching={false}
        isError
        onRetry={retry}
        returnContext={{ return_attention: 'overdue' }}
      />,
    );
    failed.rerender(
      <ExpenseOverdueSweep
        expenses={overdueRows}
        isLoading={false}
        isFetching={false}
        isError={false}
        onRetry={retry}
        returnContext={{ return_attention: 'overdue' }}
      />,
    );

    expect(screen.getByRole('region')).not.toHaveFocus();
  });
});

describe('ExpensesPage overdue query selection', () => {
  it('disables the normal page query in overdue mode, forwards retained company filters, and ignores stale URL page', async () => {
    const { router } = await renderWithRouter(<ExpensesPage />, {
      initialEntry:
        '/expenses?scope=company&category=rent&date_from=2026-08-01&date_to=2026-08-31&attention=overdue&page=9',
      routePattern: '/expenses',
    });

    expect(mocks.useExpensesPage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scope: 'company',
        category: 'rent',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31',
        attention: 'overdue',
        page: 9,
      }),
      false,
    );
    expect(mocks.useOverdueExpenseSweep).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scope: 'company',
        category: 'rent',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31',
      }),
      true,
      '2026-09-01',
    );
    expect(router.state.location.search).toMatchObject({ page: 9 });
    expect(screen.getAllByRole('link').length).toBeGreaterThan(0);
    expect(screen.queryByText('expenses.empty')).not.toBeInTheDocument();
  });

  it('keeps sweep links unobstructed during background refetch while retaining the normal table overlay', async () => {
    mocks.useOverdueExpenseSweep.mockReturnValue({
      data: overdueRows,
      isLoading: false,
      isFetching: true,
      isError: false,
      refetch: vi.fn(),
    });
    const sweep = await renderWithRouter(<ExpensesPage />, {
      initialEntry: '/expenses?attention=overdue',
      routePattern: '/expenses',
    });
    const sweepLink = screen.getAllByRole('link')[0];
    sweepLink.focus();

    expect(sweepLink).toHaveFocus();
    expect(sweep.container.querySelector('.absolute.inset-0.z-10')).toBeNull();
    expect(sweepLink.closest('.glass-card')).not.toHaveClass('opacity-50');
    expect(
      screen.getByRole('region', {
        name: 'expenses.overdue_sweep.title',
      }),
    ).toHaveAttribute('aria-busy', 'true');
    sweep.unmount();

    mocks.useExpensesPage.mockReturnValue({
      data: {
        data: overdueRows,
        meta: { total: overdueRows.length, totalPages: 1 },
      },
      isLoading: false,
      isFetching: true,
      isError: false,
      refetch: vi.fn(),
    });
    const normal = await renderWithRouter(<ExpensesPage />, {
      initialEntry: '/expenses',
      routePattern: '/expenses',
    });

    const normalOverlay = normal.container.querySelector(
      '.absolute.inset-0.z-10',
    );
    expect(normalOverlay).not.toBeNull();
    expect(normalOverlay?.nextElementSibling).toHaveClass('opacity-50');
  });

  it('forwards a selected branch to the overdue sweep', async () => {
    await renderWithRouter(<ExpensesPage />, {
      initialEntry: '/expenses?attention=overdue&branch_id=branch-2',
      routePattern: '/expenses',
    });

    expect(mocks.useOverdueExpenseSweep).toHaveBeenLastCalledWith(
      expect.objectContaining({ branchId: 'branch-2', scope: undefined }),
      true,
      '2026-09-01',
    );
    const href = new URL(
      screen.getAllByRole('link')[0].getAttribute('href') ?? '',
      'http://localhost',
    );
    expect(Object.fromEntries(href.searchParams)).toEqual({
      return_attention: 'overdue',
      return_branch_id: 'branch-2',
    });
  });

  it('enables only the normal page query outside overdue mode', async () => {
    await renderWithRouter(<ExpensesPage />, {
      initialEntry: '/expenses?branch_id=branch-2',
      routePattern: '/expenses',
    });

    expect(mocks.useExpensesPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ branchId: 'branch-2' }),
      true,
    );
    expect(mocks.useOverdueExpenseSweep).toHaveBeenLastCalledWith(
      expect.objectContaining({ branchId: 'branch-2' }),
      false,
      '2026-09-01',
    );
    expect(screen.getByText('expenses.empty')).toBeInTheDocument();
  });

  it.each(['owner', 'accountant', 'manager'] as const)(
    'makes the sweep available to a JWT-scoped %s',
    async (role) => {
      authState.user = {
        ...authState.user,
        id: `${role}-1`,
        email: `${role}@example.com`,
        role,
        branch_id: 'jwt-branch-2',
      };
      await renderWithRouter(<ExpensesPage />, {
        initialEntry: '/expenses?attention=overdue',
        routePattern: '/expenses',
      });

      expect(mocks.useOverdueExpenseSweep.mock.calls.at(-1)?.[1]).toBe(true);
      if (role === 'manager') {
        expect(
          mocks.useOverdueExpenseSweep.mock.calls.at(-1)?.[0],
        ).toMatchObject({
          branchId: 'jwt-branch-2',
          scope: undefined,
        });
      }
    },
  );

  it('disables both queries and hides stale rows for a branchless manager', async () => {
    authState.user = {
      ...authState.user,
      role: 'manager',
      branch_id: null,
    };
    mocks.useExpensesPage.mockReturnValue({
      data: {
        data: overdueRows,
        meta: { total: overdueRows.length, totalPages: 1 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
    const overdue = await renderWithRouter(<ExpensesPage />, {
      initialEntry: '/expenses?attention=overdue&scope=company',
      routePattern: '/expenses',
    });

    expect(mocks.useExpensesPage.mock.calls.at(-1)?.[1]).toBe(false);
    expect(mocks.useOverdueExpenseSweep.mock.calls.at(-1)?.[1]).toBe(false);
    expect(screen.queryByText('One day')).not.toBeInTheDocument();
    overdue.unmount();

    await renderWithRouter(<ExpensesPage />, {
      initialEntry: '/expenses',
      routePattern: '/expenses',
    });
    expect(mocks.useExpensesPage.mock.calls.at(-1)?.[1]).toBe(false);
    expect(mocks.useOverdueExpenseSweep.mock.calls.at(-1)?.[1]).toBe(false);
    expect(screen.queryByText('One day')).not.toBeInTheDocument();
  });
});
