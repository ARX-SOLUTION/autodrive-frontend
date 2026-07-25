import { act, render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '@/pages/DashboardPage';

// Covers two DashboardPage.tsx fixes on the same (legacy, pre-dashboard-v2)
// component, both from the eslint-plugin-react-hooks 7 upgrade:
//
// - react-hooks/purity: the recent-payments "Xm ago" label used to call
//   Date.now() directly during render. Fixed via useState(() => Date.now())
//   + a 60s setInterval effect. This is the one site in the batch with a
//   real (additive, safe) timing change, so it gets a real regression test.
// - react-hooks/preserve-manual-memoization: studentsSpark's useMemo deps
//   widened from two leaf fields to the whole `analytics` object. This test
//   also doubles as a smoke test that the KPI grid (which reads
//   studentsSpark) still renders correctly with that dependency change.

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      user: {
        name: 'Owner',
        role: 'owner',
        branch_id: 'b1',
        company_features: { company_dashboard_v2: false },
      },
    }),
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
  usePayments: () => ({
    data: [
      {
        id: 'p1',
        student_name: 'Ali Valiyev',
        branch_name: 'Chorsu',
        course_type: 'avto_maktab',
        amount_paid: 500000,
        created_at: '2026-07-25T09:55:00.000Z',
      },
    ],
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
      monthly_enrollment: [
        { month: '2026-06', tezkor: 1, avto_maktab: 1 },
        { month: '2026-07', tezkor: 1, avto_maktab: 1 },
      ],
      monthly_revenue: [{ month: '2026-07', amount: 100000 }],
      branch_stats: [],
    },
    isLoading: false,
  }),
}));

const renderDashboard = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <DashboardPage />
    </MemoryRouter>,
  );

describe('LegacyMainDashboard relative-time refresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('renders KPIs from the widened studentsSpark memo dependency without crashing', () => {
    renderDashboard();
    expect(screen.getByText('Ali Valiyev')).toBeInTheDocument();
  });

  it('shows accurate elapsed time and keeps updating on a 60s interval', () => {
    renderDashboard();
    expect(screen.getByText('5m')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(screen.getByText('6m')).toBeInTheDocument();
    expect(screen.queryByText('5m')).not.toBeInTheDocument();
  });
});
