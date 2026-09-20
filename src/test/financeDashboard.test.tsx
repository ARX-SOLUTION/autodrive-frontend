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
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: typeof auth) => unknown) => selector(auth),
}));

vi.mock('@/services/dashboardService', () => ({
  useFinanceSummary: () => ({
    data:
      summaryState.isLoading || summaryState.isError
        ? undefined
        : summaryState.data,
    isLoading: summaryState.isLoading,
    isError: summaryState.isError,
    isFetching: summaryState.isFetching,
    refetch: summaryState.refetch,
  }),
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
  vi.clearAllMocks();
});

const renderFinanceDashboard = () =>
  renderWithRouter(<FinanceDashboard />, {
    initialEntry: '/dashboard',
    routePattern: '/dashboard',
  });

describe('FinanceDashboard', () => {
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

  it('renders KPI cards with server decimal strings and no profit label', async () => {
    await renderFinanceDashboard();
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
      screen.getByTestId('finance-summary-breakdown-empty'),
    ).toBeInTheDocument();
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
