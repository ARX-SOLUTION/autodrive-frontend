import type { ReactNode } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExpenseHistoryPanel } from '@/pages/expenses/ExpenseHistoryPanel';
import type { ExpenseEvent, ExpenseHistory } from '@/types/expense';

const timelineState = vi.hoisted(() => ({
  data: null as ExpenseHistory | null,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
}));

vi.mock('@/services/expenseService', () => ({
  useExpenseHistory: vi.fn(() => timelineState),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      if (key === 'expenses.history.actor_impersonated') {
        return `${options?.actor} via ${options?.impersonator}`;
      }
      return key;
    },
  }),
}));

const wrap = (node: ReactNode) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{node}</QueryClientProvider>,
  );
};

const events: ExpenseEvent[] = [
  {
    id: 'event-1',
    expense_id: 'expense-1',
    expense_payment_id: null,
    action: 'created',
    changes: { amount: '125000.00' },
    created_at: '2026-08-31T12:00:00.000Z',
    actor: { id: 'owner-1', name: 'Owner One', role: 'owner' },
    impersonator: {
      id: 'dev-1',
      name: 'Platform Dev',
      role: 'dev',
    },
  },
  {
    id: 'event-2',
    expense_id: 'expense-1',
    expense_payment_id: 'payment-1',
    action: 'payment_recorded',
    changes: { amount: '25000.00' },
    created_at: '2026-08-31T13:00:00.000Z',
    actor: { id: 'acct-1', name: 'Accountant', role: 'accountant' },
    impersonator: null,
  },
];

describe('ExpenseHistoryPanel', () => {
  beforeEach(() => {
    timelineState.data = null;
    timelineState.isLoading = false;
    timelineState.isError = false;
    timelineState.refetch.mockReset();
  });

  it('shows a loading state', () => {
    timelineState.isLoading = true;
    wrap(<ExpenseHistoryPanel expenseId="expense-1" />);
    expect(screen.getByTestId('expense-history-loading')).toBeTruthy();
  });

  it('shows an empty state', () => {
    timelineState.data = {
      expense: {} as ExpenseHistory['expense'],
      payments: [],
      events: [],
    };
    wrap(<ExpenseHistoryPanel expenseId="expense-1" />);
    expect(screen.getByText('common.no_data')).toBeTruthy();
  });

  it('shows an error state with retry', () => {
    timelineState.isError = true;
    wrap(<ExpenseHistoryPanel expenseId="expense-1" />);
    expect(screen.getByTestId('expense-history-error')).toBeTruthy();
    fireEvent.click(screen.getByText('common.retry'));
    expect(timelineState.refetch).toHaveBeenCalledOnce();
  });

  it('treats a missing events field as an error, not empty', () => {
    timelineState.data = {
      expense: {} as ExpenseHistory['expense'],
      payments: [],
    } as unknown as ExpenseHistory;
    // Simulate a malformed payload where events was omitted at runtime.
    wrap(<ExpenseHistoryPanel expenseId="expense-1" />);
    expect(screen.getByTestId('expense-history-error')).toBeTruthy();
    expect(screen.queryByText('common.no_data')).toBeNull();
  });

  it('renders ordered safe actor and impersonator labels', () => {
    timelineState.data = {
      expense: {} as ExpenseHistory['expense'],
      payments: [],
      events,
    };
    wrap(<ExpenseHistoryPanel expenseId="expense-1" />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('expenses.history.actions.created');
    expect(items[0].textContent).toContain(
      'Owner One (roles.owner) via Platform Dev (roles.dev)',
    );
    expect(items[1].textContent).toContain(
      'expenses.history.actions.payment_recorded',
    );
    expect(items[1].textContent).toContain('Accountant (roles.accountant)');
    expect(items[1].textContent).not.toContain('via');
  });
});
