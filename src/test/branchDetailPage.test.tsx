import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { vi, describe, it, expect, afterEach } from 'vitest';
import BranchDetailPage from '@/pages/BranchDetailPage';
import { tashkentToday } from '@/lib/tashkentDate';
import { toLocalDateStr } from '@/services/studentService';

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
const branch = vi.hoisted(() => ({ current: null as typeof BRANCH | null }));
branch.current = BRANCH;

vi.mock('@/services/branchService', () => ({
  useBranch: () => ({
    data: branch.current,
    isLoading: false,
    isError: false,
  }),
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/branches/b1']}>
      <Routes>
        <Route path="/branches/:id" element={<BranchDetailPage />} />
        <Route path="/branches" element={<div>branches-list-page</div>} />
      </Routes>
    </MemoryRouter>,
  );

// Same DestinationProbe convention as companyRevenueDashboard.test.tsx — read
// the real pathname+search the drill-down link lands on.
const DestinationProbe = () => {
  const location = useLocation();
  return (
    <output data-testid="destination">
      {location.pathname}|{location.search}
    </output>
  );
};

const renderPageWithRoutes = () =>
  render(
    <MemoryRouter initialEntries={['/branches/b1']}>
      <Routes>
        <Route path="/branches/:id" element={<BranchDetailPage />} />
        <Route path="/students" element={<DestinationProbe />} />
        <Route path="/students/:id" element={<DestinationProbe />} />
        <Route path="/payments" element={<DestinationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

afterEach(() => {
  branch.current = BRANCH;
  cleanup();
});

describe('BranchDetailPage', () => {
  it('shows header fields and analytics', () => {
    renderPage();
    expect(screen.getByText('Yunusobod filiali')).toBeTruthy();
    expect(screen.getByText('Toshkent')).toBeTruthy();
    expect(screen.getByText(/Aziz Karimov/)).toBeTruthy();
    expect(screen.getByText('branches.detail.revenue')).toBeTruthy();
    expect(screen.getByText('branches.detail.debt')).toBeTruthy();
    expect(screen.getByText('branches.detail.today_payment')).toBeTruthy();
  });

  it('back button navigates to the branches list', () => {
    renderPage();
    fireEvent.click(screen.getByText('branches.title'));
    expect(screen.getByText('branches-list-page')).toBeTruthy();
  });
});

describe('BranchDetailPage drill-down navigation (autodrive-6ef.20)', () => {
  it('students count links to /students filtered by branch_id', () => {
    renderPageWithRoutes();
    fireEvent.click(screen.getByText('42'));
    const [pathname, search] =
      screen.getByTestId('destination').textContent?.split('|') ?? [];
    expect(pathname).toBe('/students');
    expect(new URLSearchParams(search).get('branch_id')).toBe('b1');
  });

  it("today's payment links to /payments filtered by branch_id + today's date", () => {
    renderPageWithRoutes();
    fireEvent.click(screen.getByText(/500 000/));
    const [pathname, search] =
      screen.getByTestId('destination').textContent?.split('|') ?? [];
    expect(pathname).toBe('/payments');
    const params = new URLSearchParams(search);
    expect(params.get('branch_id')).toBe('b1');
    const today = toLocalDateStr(tashkentToday());
    expect(params.get('date_from')).toBe(today);
    expect(params.get('date_to')).toBe(today);
  });

  it('shows the top-debtors preview list with a link to view all', () => {
    renderPageWithRoutes();
    expect(screen.getByText('Ali Valiyev')).toBeTruthy();
    fireEvent.click(screen.getByText('branches.detail.view_all_debtors'));
    const [pathname, search] =
      screen.getByTestId('destination').textContent?.split('|') ?? [];
    expect(pathname).toBe('/students');
    const params = new URLSearchParams(search);
    expect(params.get('branch_id')).toBe('b1');
    expect(params.get('has_debt')).toBe('true');
  });

  it('a debtor row links straight to their student detail page', () => {
    renderPageWithRoutes();
    fireEvent.click(screen.getByText('Ali Valiyev'));
    expect(screen.getByTestId('destination').textContent).toBe('/students/s1|');
  });

  it('renders the 6-month revenue trend chart heading', () => {
    renderPage();
    expect(screen.getByText('branches.detail.revenue_trend')).toBeTruthy();
  });

  it('falls back to a no-data state when monthly_revenue/top_debtors are absent', () => {
    branch.current = { ...BRANCH, monthly_revenue: [], top_debtors: [] };
    renderPage();
    expect(screen.getAllByText('common.no_data').length).toBe(2);
  });
});
