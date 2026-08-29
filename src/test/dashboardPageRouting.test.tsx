import { screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '@/pages/DashboardPage';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// autodrive-vh0.6: TeacherDashboard was extracted out of DashboardPage.tsx
// into its own module (dashboard/TeacherDashboard.tsx). This locks down that
// DashboardPage's role router still picks the right dashboard per role after
// the extraction -- LegacyMainDashboard/CompanyRevenueDashboard's own
// internals are untouched and out of scope here.

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

let user: Record<string, unknown> = { name: 'Test', role: 'owner' };

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user }),
}));
vi.mock('@/pages/dashboard/TeacherDashboard', () => ({
  default: () => <div data-testid="teacher-dashboard-marker" />,
}));
vi.mock('@/pages/dashboard/CompanyRevenueDashboard', () => ({
  default: () => <div data-testid="company-revenue-dashboard-marker" />,
}));
vi.mock('@/hooks/useCan', () => ({
  useCan: () => false,
  useIsCrossTenant: () => false,
}));
vi.mock('@/services/branchService', () => ({
  useBranches: () => ({ data: [{ id: 'b1', name: 'Chorsu' }] }),
}));
vi.mock('@/services/auditService', () => ({
  useAuditLogs: () => ({ data: undefined }),
}));
vi.mock('@/services/paymentService', () => ({
  usePaymentSnapshot: () => ({
    data: { today_income: 0, current_total_debt: 0, students_with_debt: 0 },
  }),
  usePaymentsPage: () => ({
    data: {
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 5,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
  }),
}));
vi.mock('@/services/dashboardService', () => ({
  useDashboardAnalytics: () => ({
    data: {
      total_students: 10,
      active_tezkor: 4,
      active_avto: 6,
      new_this_month: 2,
      new_last_month: 1,
      total_revenue: 1000000,
      total_debt: 0,
      avg_debt: 0,
      this_month_revenue: 100000,
      last_month_revenue: 90000,
      payment_status: { paid: 5, partial: 0, debt: 0 },
      result_stats: { oqimoqda: 5, topshirdi: 3, yiqildi: 1 },
      monthly_enrollment: [],
      monthly_revenue: [],
      branch_stats: [],
    },
    isLoading: false,
  }),
}));

afterEach(() => {
  user = { name: 'Test', role: 'owner' };
  vi.clearAllMocks();
  cleanup();
});

const renderDashboardPage = () =>
  renderWithRouter(<DashboardPage />, {
    initialEntry: '/dashboard',
    routePattern: '/dashboard',
  });

describe('DashboardPage role routing (autodrive-vh0.6 regression)', () => {
  // The sub-dashboards are now React.lazy, so the marker appears after the
  // Suspense boundary resolves — findBy* awaits that.
  it('routes a teacher to TeacherDashboard', async () => {
    user = { name: 'Teacher', role: 'teacher' };
    await renderDashboardPage();
    expect(
      await screen.findByTestId('teacher-dashboard-marker'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('company-revenue-dashboard-marker')).toBeNull();
  });

  it('routes a non-teacher role to CompanyRevenueDashboard, not TeacherDashboard', async () => {
    user = { name: 'Owner', role: 'owner' };
    await renderDashboardPage();
    expect(
      await screen.findByTestId('company-revenue-dashboard-marker'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('teacher-dashboard-marker')).toBeNull();
  });
});

describe('DashboardPage feature flag (company_dashboard_v2)', () => {
  it('renders LegacyMainDashboard when company_dashboard_v2 is false', async () => {
    user = {
      name: 'Owner',
      role: 'owner',
      branch_id: 'b1',
      company_features: { company_dashboard_v2: false },
    };
    await renderDashboardPage();
    expect(
      await screen.findByText('dashboard.hero_today_revenue'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('company-revenue-dashboard-marker')).toBeNull();
  });

  it('renders CompanyRevenueDashboard when company_dashboard_v2 is unset (default v2)', async () => {
    user = { name: 'Owner', role: 'owner' };
    await renderDashboardPage();
    expect(
      await screen.findByTestId('company-revenue-dashboard-marker'),
    ).toBeInTheDocument();
  });

  it('renders CompanyRevenueDashboard when company_dashboard_v2 is explicitly true', async () => {
    user = {
      name: 'Owner',
      role: 'owner',
      company_features: { company_dashboard_v2: true },
    };
    await renderDashboardPage();
    expect(
      await screen.findByTestId('company-revenue-dashboard-marker'),
    ).toBeInTheDocument();
  });
});
