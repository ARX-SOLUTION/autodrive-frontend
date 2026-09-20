import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpensesTable } from '@/pages/expenses/ExpensesTable';
import { useAuthStore } from '@/store/authStore';
import type { Expense, ExpenseStatus } from '@/types/expense';
import type { UserRole } from '@/types/user';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

const viewport = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => viewport.isMobile,
}));

const expense = (status: ExpenseStatus, index: number): Expense => ({
  id: `expense-${index}`,
  branch_id: 'branch-1',
  branch_name: 'Chilonzor',
  vehicle_id: null,
  vehicle_plate_number: null,
  created_by_id: 'owner-1',
  category: 'rent',
  title: `${status} expense`,
  amount: '100.00',
  expense_date: '2026-08-31',
  due_date: null,
  payee: null,
  note: null,
  paid_amount: status === 'planned' ? '0.00' : '25.00',
  remaining_amount: status === 'paid' ? '0.00' : '75.00',
  status,
  reviewed_at: null,
  reviewed_by_id: null,
  version: 1,
  created_at: '2026-08-31T00:00:00.000Z',
  updated_at: '2026-08-31T00:00:00.000Z',
});

const expenses = [
  expense('planned', 1),
  expense('partially_paid', 2),
  expense('paid', 3),
  expense('cancelled', 4),
];

const renderTable = (role: UserRole) => {
  useAuthStore.setState({
    user: {
      id: `${role}-1`,
      role,
      company_id: 'company-1',
    } as never,
  });

  return renderWithRouter(
    <ExpensesTable
      expenses={expenses}
      isLoading={false}
      isFetching={false}
      isError={false}
      onRetry={vi.fn()}
      currentPage={1}
      pageSize={20}
      totalExpenses={expenses.length}
      totalPages={1}
      onPageChange={vi.fn()}
    />,
    { initialEntry: '/expenses', routePattern: '/expenses' },
  );
};

beforeEach(() => {
  viewport.isMobile = false;
});

afterEach(() => {
  cleanup();
  useAuthStore.setState({ user: null });
});

describe.each(['owner', 'accountant'] as const)(
  '%s pay-remaining expense shortcut',
  (role) => {
    it.each([
      ['desktop row', false],
      ['mobile card', true],
    ] as const)(
      'shows only for a partial %s and navigates with exact search',
      async (_view, isMobile) => {
        viewport.isMobile = isMobile;
        const { router } = await renderTable(role);

        const shortcut = screen.getByRole('link', {
          name: 'expenses.payments.submit: partially_paid expense',
        });
        expect(
          screen.queryByRole('link', {
            name: 'expenses.payments.submit: planned expense',
          }),
        ).toBeNull();
        expect(
          screen.queryByRole('link', {
            name: 'expenses.payments.submit: paid expense',
          }),
        ).toBeNull();
        expect(
          screen.queryByRole('link', {
            name: 'expenses.payments.submit: cancelled expense',
          }),
        ).toBeNull();

        fireEvent.keyDown(shortcut, { key: 'Enter' });
        fireEvent.click(shortcut);

        expect(router.state.location.pathname).toBe('/expenses/expense-2');
        expect(router.state.location.search).toEqual({
          tab: 'payments',
          action: 'pay_remaining',
        });
      },
    );
  },
);

it.each([
  ['desktop rows', false],
  ['mobile cards', true],
] as const)(
  'hides finance shortcuts from managers on %s',
  async (_view, isMobile) => {
    viewport.isMobile = isMobile;
    await renderTable('manager');

    expect(
      screen.queryByRole('link', { name: /expenses\.payments\.submit/ }),
    ).toBeNull();
  },
);

it('preserves ordinary desktop row navigation', async () => {
  const { router } = await renderTable('owner');
  fireEvent.click(screen.getByRole('row', { name: 'partially_paid expense' }));

  expect(router.state.location.pathname).toBe('/expenses/expense-2');
  expect(router.state.location.search).toEqual({});
});

it('keeps the mobile shortcut outside the interactive card and preserves card activation', async () => {
  viewport.isMobile = true;
  const { router } = await renderTable('owner');
  const shortcut = screen.getByRole('link', {
    name: 'expenses.payments.submit: partially_paid expense',
  });
  const card = screen.getByRole('button', { name: /partially_paid expense/ });

  expect(card).not.toContainElement(shortcut);
  expect(shortcut.parentElement).toBe(card.parentElement);

  fireEvent.keyDown(card, { key: 'Enter' });
  expect(router.state.location.pathname).toBe('/expenses/expense-2');
  expect(router.state.location.search).toEqual({});

  await router.navigate({ to: '/expenses' });
  fireEvent.click(shortcut);
  expect(router.state.location.search).toEqual({
    tab: 'payments',
    action: 'pay_remaining',
  });
  expect(within(card).queryByRole('link')).toBeNull();
});
