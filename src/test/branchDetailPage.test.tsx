import { screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import BranchDetailPage from '@/pages/BranchDetailPage';
import { tashkentToday } from '@/lib/tashkentDate';
import { toLocalDateStr } from '@/services/studentService';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// autodrive-6ef.19: branch detail page renders header + analytics fields.
// autodrive-6ef.20: all 4 stat cards drill down into filtered lists / inline
// panels instead of showing a bare number.

const BRANCH = {
  id: 'b1',
  name: 'Yunusobod filiali',
  location: 'Toshkent',
  phone: '+998901234567',
  manager_name: 'Aziz Karimov',
  active_students: 42,
  created_at: '2026-07-01T00:00:00.000Z',
  revenue: 15000000,
  debt: 2000000,
  today_payment: 500000,
  monthly_revenue: [
    { month: 'Feb', amount: 1000000 },
    { month: 'Mar', amount: 2000000 },
  ],
  top_debtors: [{ id: 's1', name: 'Ali Valiyev', debt: 900000 }],
};

// vi.hoisted so individual tests can swap the branch payload (e.g. the
// empty-state test below) without re-mocking the whole module per test.
const branch = vi.hoisted(() => ({
  current: null as typeof BRANCH | null,
  isError: false,
}));
branch.current = BRANCH;

vi.mock('@/services/branchService', () => ({
  useBranch: () => ({
    data: branch.current,
    isLoading: false,
    isError: branch.isError,
  }),
}));

const renderPage = () =>
  renderWithRouter(<BranchDetailPage />, {
    initialEntry: '/branches/b1',
    routePattern: '/branches/$id',
  });

afterEach(() => {
  branch.current = BRANCH;
  branch.isError = false;
  cleanup();
});

describe('BranchDetailPage', () => {
  it('shows header fields and analytics', async () => {
    await renderPage();
    expect(screen.getByText('Yunusobod filiali')).toBeTruthy();
    expect(screen.getByText('Toshkent')).toBeTruthy();
    expect(screen.getByText(/Aziz Karimov/)).toBeTruthy();
    expect(screen.getByText('branches.detail.revenue')).toBeTruthy();
    expect(screen.getByText('branches.detail.debt')).toBeTruthy();
    expect(screen.getByText('branches.detail.today_payment')).toBeTruthy();
  });

  it('back button navigates to the branches list', async () => {
    const { router } = await renderPage();
    fireEvent.click(screen.getByText('branches.title'));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/branches'),
    );
  });
});

describe('BranchDetailPage drill-down navigation (autodrive-6ef.20)', () => {
  it('students count links to /students filtered by branch_id', async () => {
    const { router } = await renderPage();
    fireEvent.click(screen.getByText('42'));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/students'),
    );
    expect(
      new URLSearchParams(router.state.location.searchStr).get('branch_id'),
    ).toBe('b1');
  });

  it("today's payment links to /payments filtered by branch_id + today's date", async () => {
    const { router } = await renderPage();
    fireEvent.click(screen.getByText(/500 000/));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/payments'),
    );
    const params = new URLSearchParams(router.state.location.searchStr);
    expect(params.get('branch_id')).toBe('b1');
    const today = toLocalDateStr(tashkentToday());
    expect(params.get('date_from')).toBe(today);
    expect(params.get('date_to')).toBe(today);
  });

  it('shows the top-debtors preview list with a link to view all', async () => {
    const { router } = await renderPage();
    expect(screen.getByText('Ali Valiyev')).toBeTruthy();
    fireEvent.click(screen.getByText('branches.detail.view_all_debtors'));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/students'),
    );
    const params = new URLSearchParams(router.state.location.searchStr);
    expect(params.get('branch_id')).toBe('b1');
    expect(params.get('has_debt')).toBe('true');
  });

  it('a debtor row links straight to their student detail page', async () => {
    const { router } = await renderPage();
    fireEvent.click(screen.getByText('Ali Valiyev'));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/students/s1'),
    );
  });

  it('renders the 6-month revenue trend chart heading', async () => {
    await renderPage();
    expect(screen.getByText('branches.detail.revenue_trend')).toBeTruthy();
  });

  it('falls back to a no-data state when monthly_revenue/top_debtors are absent', async () => {
    branch.current = { ...BRANCH, monthly_revenue: [], top_debtors: [] };
    await renderPage();
    expect(screen.getAllByText('common.no_data').length).toBe(2);
  });
});

// autodrive-d4j: a real fetch error must not read the same as a genuine
// not-found -- distinct title/icon per EntityDetailShell's isError/
// errorTitle/errorIcon props, same split AuditDetailPage already does.
describe('BranchDetailPage error vs not-found (autodrive-d4j)', () => {
  it('shows the not-found message when the branch genuinely does not exist', async () => {
    branch.current = null;
    branch.isError = false;
    await renderPage();
    expect(screen.getByText('common.not_found')).toBeTruthy();
    expect(screen.queryByText('common.error')).toBeNull();
  });

  it('shows the error message, not not-found, on a real fetch error', async () => {
    branch.current = null;
    branch.isError = true;
    await renderPage();
    expect(screen.getByText('common.error')).toBeTruthy();
    expect(screen.queryByText('common.not_found')).toBeNull();
  });
});
