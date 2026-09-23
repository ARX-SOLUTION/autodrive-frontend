import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeletedExpenseHistoryDialog } from '@/pages/expenses/DeletedExpenseHistoryDialog';
import { useAuthStore } from '@/store/authStore';
import type { DeletedExpenseHistorySummary } from '@/types/expense';

const { useDeletedExpenseHistoryPageMock } = vi.hoisted(() => ({
  useDeletedExpenseHistoryPageMock: vi.fn(),
}));

vi.mock('@/services/expenseService', () => ({
  useDeletedExpenseHistoryPage: useDeletedExpenseHistoryPageMock,
}));

vi.mock('@/pages/expenses/ExpenseHistoryPanel', () => ({
  ExpenseHistoryPanel: ({ expenseId }: { expenseId: string }) => (
    <div data-testid="history-panel">history:{expenseId}</div>
  ),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string, options?: Record<string, string | number>) => {
      if (key === 'expenses.deleted_history.page_status') {
        return `Page ${options?.page} of ${options?.totalPages}`;
      }
      if (key === 'expenses.deleted_history.deleted_at') {
        return `Deleted ${options?.date}`;
      }
      return key;
    },
  }),
}));

const rows: DeletedExpenseHistorySummary[] = [
  {
    id: 'deleted-1',
    title: 'Fuel duplicate',
    category: 'vehicle',
    amount: '250000.00',
    branch_id: 'branch-1',
    branch_name: 'Chilonzor',
    deleted_at: '2026-09-24T08:30:00.000Z',
  },
  {
    id: 'deleted-2',
    title: 'Office rent',
    category: 'rent',
    amount: '900000.00',
    branch_id: null,
    branch_name: null,
    deleted_at: '2026-09-23T08:30:00.000Z',
  },
];

describe('DeletedExpenseHistoryDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAuthStore.getState().setAuth('token', {
      id: 'owner-1',
      email: 'owner@example.com',
      role: 'owner',
      company_id: 'company-1',
    });
    useDeletedExpenseHistoryPageMock.mockReset().mockReturnValue({
      data: { data: rows, meta: { total: 20, totalPages: 2 } },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces search, pages, and opens the selected record history', async () => {
    render(<DeletedExpenseHistoryDialog open onOpenChange={vi.fn()} />);

    expect(useDeletedExpenseHistoryPageMock.mock.calls.at(-1)?.[0]).toEqual({
      search: '',
      page: 1,
      limit: 10,
    });

    fireEvent.click(screen.getByRole('button', { name: /Fuel duplicate/ }));
    expect(screen.getByTestId('history-panel').textContent).toBe(
      'history:deleted-1',
    );

    fireEvent.change(
      screen.getByLabelText('expenses.deleted_history.search_label'),
      { target: { value: '  fuel card  ' } },
    );
    expect(screen.queryByTestId('history-panel')).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(useDeletedExpenseHistoryPageMock.mock.calls.at(-1)?.[0]).toEqual({
      search: 'fuel card',
      page: 1,
      limit: 10,
    });

    fireEvent.click(screen.getByRole('button', { name: 'common.next' }));
    expect(useDeletedExpenseHistoryPageMock.mock.calls.at(-1)?.[0]).toEqual({
      search: 'fuel card',
      page: 2,
      limit: 10,
    });
  });

  it('recovers when the requested page is beyond the resolved total pages', async () => {
    let shrinkToOnePage = false;
    useDeletedExpenseHistoryPageMock.mockImplementation(
      (filters: { page?: number }) => ({
        data:
          filters.page === 1
            ? {
                data: rows,
                meta: {
                  total: shrinkToOnePage ? rows.length : 20,
                  totalPages: shrinkToOnePage ? 1 : 2,
                },
              }
            : {
                data: [],
                meta: { total: rows.length, totalPages: 1 },
              },
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
      }),
    );

    render(<DeletedExpenseHistoryDialog open onOpenChange={vi.fn()} />);
    shrinkToOnePage = true;
    fireEvent.click(screen.getByRole('button', { name: 'common.next' }));

    expect(useDeletedExpenseHistoryPageMock.mock.calls.at(-1)?.[0]).toEqual({
      search: '',
      page: 2,
      limit: 10,
    });
    expect(screen.getByTestId('deleted-expense-loading')).toBeInTheDocument();

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    expect(useDeletedExpenseHistoryPageMock.mock.calls.at(-1)?.[0]).toEqual({
      search: '',
      page: 1,
      limit: 10,
    });
    expect(screen.getByText('Fuel duplicate')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });
});
