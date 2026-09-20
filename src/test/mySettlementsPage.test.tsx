import { screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MySettlementsPage from '@/pages/MySettlementsPage';
import { renderWithRouter } from '@/test/utils/renderWithRouter';
import type { Expense } from '@/types/expense';

const { useMySettlementsMock, useCanMock } = vi.hoisted(() => ({
  useMySettlementsMock: vi.fn(),
  useCanMock: vi.fn(),
}));

vi.mock('@/hooks/useCan', () => ({
  useCan: (cap: string) => useCanMock(cap),
}));

vi.mock('@/services/expenseService', () => ({
  useMySettlements: (...args: unknown[]) => useMySettlementsMock(...args),
}));

const settlement = (over: Partial<Expense> = {}): Expense => ({
  id: '33333333-3333-4333-8333-333333333333',
  branch_id: '22222222-2222-4222-8222-222222222222',
  branch_name: 'Markaziy',
  vehicle_id: null,
  vehicle_plate_number: null,
  created_by_id: '55555555-5555-4555-8555-555555555555',
  category: 'teacher_settlement',
  title: "O'qituvchi hisob-kitobi",
  amount: '125000.00',
  expense_date: '2026-08-01',
  due_date: null,
  payee: null,
  note: null,
  teacher_id: '88888888-8888-4888-8888-888888888888',
  period_month: '2026-08',
  paid_amount: '50000.00',
  remaining_amount: '75000.00',
  status: 'partially_paid',
  reviewed_at: null,
  reviewed_by_id: null,
  version: 1,
  created_at: '2026-08-01T12:00:00.000Z',
  updated_at: '2026-08-10T12:00:00.000Z',
  ...over,
});

const pageOf = (
  rows: Expense[],
  meta: Partial<{ total: number; page: number; totalPages: number }> = {},
) => ({
  data: {
    data: rows,
    meta: {
      total: rows.length,
      page: 1,
      totalPages: 1,
      ...meta,
    },
  },
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
});

const renderPage = () =>
  renderWithRouter(<MySettlementsPage />, {
    initialEntry: '/my-settlements',
    routePattern: '/my-settlements',
  });

beforeEach(() => {
  useCanMock.mockReset();
  useCanMock.mockImplementation((cap: string) => cap === 'viewOwnSettlements');
  useMySettlementsMock.mockReset();
  useMySettlementsMock.mockReturnValue(pageOf([settlement()]));
});

describe('MySettlementsPage', () => {
  it('shows a skeleton loading state', async () => {
    useMySettlementsMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      isError: false,
      refetch: vi.fn(),
    });
    await renderPage();
    expect(screen.getByLabelText('my_settlements.loading')).toBeInTheDocument();
  });

  it('renders the explicit empty state', async () => {
    useMySettlementsMock.mockReturnValue(pageOf([]));
    await renderPage();
    expect(screen.getByText('my_settlements.empty')).toBeInTheDocument();
    expect(
      screen.queryByText("O'qituvchi hisob-kitobi"),
    ).not.toBeInTheDocument();
  });

  it('shows error + retry without using the empty state', async () => {
    const refetch = vi.fn();
    useMySettlementsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch,
    });
    await renderPage();
    expect(screen.getByText('my_settlements.load_error')).toBeInTheDocument();
    expect(screen.queryByText('my_settlements.empty')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('common.retry'));
    expect(refetch).toHaveBeenCalled();
  });

  it('renders settlement data and summary totals', async () => {
    await renderPage();
    expect(screen.getByText("O'qituvchi hisob-kitobi")).toBeInTheDocument();
    expect(screen.getByText('2026-08 · Markaziy')).toBeInTheDocument();
    expect(
      screen.getByText('my_settlements.summary.total'),
    ).toBeInTheDocument();
    expect(useMySettlementsMock).toHaveBeenCalledWith(1, true);
  });

  it('moves to the selected server page', async () => {
    useMySettlementsMock.mockImplementation((page: number) =>
      pageOf([settlement()], { total: 11, page, totalPages: 2 }),
    );

    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'common.next' }));

    expect(useMySettlementsMock).toHaveBeenLastCalledWith(2, true);
  });
});
