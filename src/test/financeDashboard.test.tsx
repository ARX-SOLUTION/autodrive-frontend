import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FinanceDashboard from '@/pages/dashboard/FinanceDashboard';
import { formatMoney } from '@/lib/money';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

const auth = vi.hoisted(() => ({
  user: {
    name: 'Accountant',
    role: 'accountant' as const,
    branch_id: undefined as string | undefined,
  },
}));

const summaryState = vi.hoisted(() => ({
  data: {
    from: '2026-09-01',
    to: '2026-09-15',
    income: '1000.00',
    paid_expenses: '250.00',
    cash_flow_balance: '750.00',
    outstanding_expenses: '300.00',
    teacher_payable: '100.00',
  },
  isLoading: false,
  isError: false,
  isFetching: false,
  refetch: vi.fn(),
  query: undefined as unknown,
}));

const breakdownState = vi.hoisted(() => ({
  data: {
    from: '2026-09-01',
    to: '2026-09-15',
    total: '150.00',
    company_wide: { total: '30.00' },
    by_branch: [
      {
        branch_id: 'branch-a',
        branch_name: 'Asosiy filial',
        total: '120.00',
      },
    ],
    by_category: [
      { category: 'rent' as const, total: '100.00' },
      { category: 'utilities' as const, total: '50.00' },
    ],
  },
  isLoading: false,
  isError: false,
  isFetching: false,
  refetch: vi.fn(),
  query: undefined as unknown,
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: typeof auth) => unknown) => selector(auth),
}));

vi.mock('@/services/dashboardService', () => ({
  useFinanceSummary: (query: unknown) => {
    summaryState.query = query;
    return {
      data:
        summaryState.isLoading || summaryState.isError
          ? undefined
          : summaryState.data,
      isLoading: summaryState.isLoading,
      isError: summaryState.isError,
      isFetching: summaryState.isFetching,
      refetch: summaryState.refetch,
    };
  },
  useExpenseBreakdown: (query: unknown) => {
    breakdownState.query = query;
    return {
      data:
        breakdownState.isLoading || breakdownState.isError
          ? undefined
          : breakdownState.data,
      isLoading: breakdownState.isLoading,
      isError: breakdownState.isError,
      isFetching: breakdownState.isFetching,
      refetch: breakdownState.refetch,
    };
  },
}));

afterEach(() => {
  summaryState.isLoading = false;
  summaryState.isError = false;
  summaryState.data = {
    from: '2026-09-01',
    to: '2026-09-15',
    income: '1000.00',
    paid_expenses: '250.00',
    cash_flow_balance: '750.00',
    outstanding_expenses: '300.00',
    teacher_payable: '100.00',
  };
  auth.user.branch_id = undefined;
  summaryState.query = undefined;
  breakdownState.isLoading = false;
  breakdownState.isError = false;
  breakdownState.query = undefined;
  vi.clearAllMocks();
});

const renderFinanceDashboard = () =>
  renderWithRouter(<FinanceDashboard />, {
    initialEntry: '/dashboard',
    routePattern: '/dashboard',
  });

describe('FinanceDashboard', () => {
  it('keeps an accountant summary company-wide even when its JWT includes a branch', async () => {
    auth.user.branch_id = 'branch-a';

    await renderFinanceDashboard();

    expect(summaryState.query).not.toHaveProperty('branchId');
  });

  it('shows a skeleton while finance summary is loading', async () => {
    summaryState.isLoading = true;
    await renderFinanceDashboard();
    expect(screen.getByTestId('finance-summary-section')).toHaveAttribute(
      'data-state',
      'loading',
    );
  });

  it('shows error with retry when finance summary fails', async () => {
    summaryState.isError = true;
    await renderFinanceDashboard();
    expect(screen.getByTestId('finance-summary-section')).toHaveAttribute(
      'data-state',
      'error',
    );
    fireEvent.click(screen.getByText('common.retry'));
    expect(summaryState.refetch).toHaveBeenCalled();
  });

  it('renders KPI cards and sends branch ledger drill-downs to URL-backed expense filters', async () => {
    const { router } = await renderFinanceDashboard();
    expect(screen.getByTestId('finance-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('finance-kpi-income')).toHaveTextContent(
      formatMoney('1000.00'),
    );
    expect(screen.getByTestId('finance-kpi-paid_expenses')).toHaveTextContent(
      formatMoney('250.00'),
    );
    expect(
      screen.getByTestId('finance-kpi-cash_flow_balance'),
    ).toHaveTextContent(formatMoney('750.00'));
    expect(
      screen.getByTestId('finance-kpi-outstanding_expenses'),
    ).toHaveTextContent(formatMoney('300.00'));
    expect(screen.getByTestId('finance-kpi-teacher_payable')).toHaveTextContent(
      formatMoney('100.00'),
    );
    expect(screen.queryByText(/profit/i)).toBeNull();
    expect(screen.queryByText(/sof foyda/i)).toBeNull();
    expect(
      screen.getByTestId('finance-expense-company-wide'),
    ).toHaveTextContent(formatMoney('30.00'));

    fireEvent.click(screen.getByTestId('finance-expense-branch-branch-a'));
    expect(router.state.location.pathname).toBe('/expenses');
    expect(router.state.location.search).toMatchObject({
      branch_id: 'branch-a',
      date_from: '2026-09-01',
      date_to: '2026-09-15',
    });
  });

  it('keeps the selected date window when a category segment opens expenses', async () => {
    const { router } = await renderFinanceDashboard();

    fireEvent.click(screen.getByTestId('finance-expense-category-rent'));
    expect(router.state.location.pathname).toBe('/expenses');
    expect(router.state.location.search).toMatchObject({
      category: 'rent',
      date_from: '2026-09-01',
      date_to: '2026-09-15',
    });
  });

  it('shows zero cards and empty state when all KPIs are zero', async () => {
    summaryState.data = {
      from: '2026-09-01',
      to: '2026-09-15',
      income: '0.00',
      paid_expenses: '0.00',
      cash_flow_balance: '0.00',
      outstanding_expenses: '0.00',
      teacher_payable: '0.00',
    };
    await renderFinanceDashboard();
    expect(screen.getByTestId('finance-kpi-income')).toHaveTextContent(
      formatMoney('0.00'),
    );
    expect(screen.getByTestId('finance-summary-empty')).toBeInTheDocument();
  });
});
