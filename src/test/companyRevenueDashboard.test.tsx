import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CompanyRevenueDashboard from '@/pages/dashboard/CompanyRevenueDashboard';
import { formatMoney } from '@/lib/money';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

const auth = vi.hoisted(() => ({
  user: {
    name: 'Demo Owner',
    role: 'owner' as 'owner' | 'manager',
    branch_id: undefined as string | undefined,
  },
}));

const overview = vi.hoisted(() => ({
  data: {
    timezone: 'Asia/Tashkent',
    filters: {
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-10T00:00:00.000Z',
      granularity: 'day',
    },
    freshness: {
      generated_at: '2026-07-10T10:00:00.000Z',
      data_through: '2026-07-10T10:00:00.000Z',
    },
    kpis: {
      revenue: {
        today: 700000,
        period: 69300000,
        previous_period: 60000000,
        delta_percent: 15.5,
        currency: 'UZS',
      },
      debt: {
        current_outstanding: 10000000,
        students_with_debt: 10,
        avg_per_debtor: 1000000,
      },
      students: {
        active: 60,
        new: 12,
        new_previous_period: 8,
        completed: 14,
        dropped: 8,
      },
      attendance_rate: 91,
      collection: { paid: 40, partial: 10, debt: 10, coverage_rate: 66.7 },
      debt_aging: {
        bucket_0_30: 4000000,
        bucket_31_60: 3000000,
        bucket_61_90: 2000000,
        bucket_90_plus: 1000000,
      },
      arpu: 1155000,
      cash_collection_rate: 87.5,
      revenue_by_course_type: {
        tezkor: { revenue: 40000000, per_lesson: 200000 },
        avto_maktab: { revenue: 29300000, per_lesson: null },
      },
    },
    revenue_trend: [
      {
        period_start: '2026-07-02T00:00:00.000Z',
        amount: 69300000,
        payment_count: 53,
      },
    ],
    branch_performance: [
      {
        id: 'branch-1',
        name: 'Chorsu',
        active_students: 22,
        collected_revenue: 30000000,
        outstanding_debt: 3500000,
        new_students: 5,
        collection_rate: 70,
      },
    ],
    recovery_queue: [
      {
        student_id: 'student-1',
        student_name: 'Ali Valiyev',
        branch_name: 'Chorsu',
        course_type: 'avto_maktab',
        debt: 5000000,
        total_price: 10000000,
        last_payment_at: '2026-07-02T10:00:00.000Z',
      },
      {
        student_id: 'student-2',
        student_name: 'Dilnoza Karimova',
        branch_name: 'Chorsu',
        course_type: 'tezkor',
        debt: 4000000,
        total_price: 10000000,
        last_payment_at: '2026-07-03T10:00:00.000Z',
      },
      {
        student_id: 'student-3',
        student_name: 'Javohir Yusupov',
        branch_name: 'Chorsu',
        course_type: 'avto_maktab',
        debt: 3000000,
        total_price: 10000000,
        last_payment_at: '2026-07-04T10:00:00.000Z',
      },
      {
        student_id: 'student-4',
        student_name: 'Sevara Aliyeva',
        branch_name: 'Chorsu',
        course_type: 'avto_maktab',
        debt: 2000000,
        total_price: 10000000,
        last_payment_at: '2026-07-05T10:00:00.000Z',
      },
    ],
    operations: {
      next_lessons: [],
      incomplete_attendance_lessons: [],
      attendance_status: { present: 10, absent: 2 },
    },
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: typeof auth) => unknown) => selector(auth),
}));
vi.mock('@/hooks/useCan', () => ({
  useCan: (capability: string) =>
    capability === 'viewAllBranches' ? auth.user.role === 'owner' : true,
}));
vi.mock('@/services/branchService', () => ({
  useBranches: () => ({ data: [{ id: 'branch-1', name: 'Chorsu' }] }),
}));
const overviewState = vi.hoisted(() => ({
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
}));

vi.mock('@/services/dashboardService', () => ({
  useCompanyOverview: () => ({
    ...overview,
    data:
      overviewState.isLoading || overviewState.isError
        ? undefined
        : overview.data,
    isLoading: overviewState.isLoading,
    isFetching: false,
    isError: overviewState.isError,
    refetch: overviewState.refetch,
  }),
}));

afterEach(() => {
  auth.user = {
    name: 'Demo Owner',
    role: 'owner',
    branch_id: undefined,
  };
  overviewState.isLoading = false;
  overviewState.isError = false;
  vi.clearAllMocks();
});

const renderDashboard = (initialEntry = '/dashboard') =>
  renderWithRouter(<CompanyRevenueDashboard />, {
    initialEntry,
    routePattern: '/dashboard',
  });

describe('CompanyRevenueDashboard', () => {
  it('shows a loading skeleton while overview data is fetching', async () => {
    overviewState.isLoading = true;
    const { container } = await renderDashboard();
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('shows an error state with retry when overview fetch fails', async () => {
    overviewState.isError = true;
    await renderDashboard();
    expect(screen.getByText('dashboard.v2.error_title')).toBeInTheDocument();
    fireEvent.click(screen.getByText('common.retry'));
    expect(overviewState.refetch).toHaveBeenCalled();
  });

  it('renders Hierarchy B KPI strip (autodrive-9s5j dedupe)', async () => {
    await renderDashboard();
    const strip = screen.getByTestId('dashboard-v2-kpi-strip');
    expect(strip).toBeInTheDocument();
    expect(
      within(strip).getByText('dashboard.v2.today_revenue'),
    ).toBeInTheDocument();
    expect(
      within(strip).getByText('dashboard.v2.period_revenue'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('dashboard.v2.period_over_period'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('dashboard.hero_active_students'),
    ).toBeInTheDocument();
    expect(
      within(strip).getByText('dashboard.v2.outstanding_debt'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText('dashboard.v2.academic_block.attendance_rate').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('shows generated freshness without claiming the dashboard is live', async () => {
    await renderDashboard();

    const freshness = screen.getByTestId('dashboard-freshness-caption');
    expect(freshness).toHaveTextContent('dashboard.v2.updated');
    expect(freshness).toHaveTextContent('10.07.2026');
    expect(screen.getAllByText(/dashboard\.v2\.updated/)).toHaveLength(1);
    expect(screen.queryByText('dashboard.live_label')).not.toBeInTheDocument();
  });

  it('shows an older data-through timestamp when it adds freshness context', async () => {
    const originalDataThrough = overview.data.freshness.data_through;
    overview.data.freshness.data_through = '2026-07-09T08:30:00.000Z';

    try {
      await renderDashboard();

      const freshness = screen.getByTestId('dashboard-freshness-caption');
      expect(freshness).toHaveTextContent('dashboard.v2.to');
      expect(freshness).toHaveTextContent('09.07.2026');
    } finally {
      overview.data.freshness.data_through = originalDataThrough;
    }
  });

  it('keeps manual refresh connected to the overview query', async () => {
    await renderDashboard();

    fireEvent.click(
      screen.getByRole('button', { name: 'dashboard.v2.refresh' }),
    );
    expect(overviewState.refetch).toHaveBeenCalledTimes(1);
  });

  it('uses DateRangePicker and granularity as the only period controls', async () => {
    await renderDashboard();

    expect(
      screen.queryByRole('group', { name: 'dashboard.v2.period' }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('date-range-picker')).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'dashboard.v2.granularity' }),
    ).toBeInTheDocument();

    // Existing aggressive-dedupe guarantees remain covered here.
    expect(
      screen.queryByRole('combobox', { name: 'dashboard.v2.period' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('dashboard.v2.quick_actions'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('dashboard.v2.financial_block.mom_growth'),
    ).not.toBeInTheDocument();
  });

  it('shows period-over-period delta only on the PoP strip tile', async () => {
    await renderDashboard();
    const strip = screen.getByTestId('dashboard-v2-kpi-strip');
    // DeltaChip renders "+15.5%" for revenue.delta_percent
    const deltas = strip.querySelectorAll('[data-testid="kpi-delta"]');
    expect(deltas.length).toBe(1);
    expect(deltas[0].textContent).toMatch(/15\.5/);
    expect(deltas[0]).toHaveClass('dark:text-foreground');
  });

  it('renders revenue-control KPIs and the recovery queue', async () => {
    await renderDashboard();

    expect(screen.getByText('dashboard.v2.today_revenue')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-v2-kpi-strip')).toBeInTheDocument();
    expect(screen.getByText('Ali Valiyev')).toBeInTheDocument();
    expect(screen.getAllByText(formatMoney(69_300_000)).length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByText((content) => content.replace(/\D/g, '') === '5000000'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('recovery-count')).toHaveTextContent('10');
    expect(screen.queryByText('Sevara Aliyeva')).not.toBeInTheDocument();
  });

  it('shows branch sorting controls beside the section heading', async () => {
    await renderDashboard();

    const sorting = screen.getByRole('group', {
      name: 'dashboard.v2.sort_by',
    });
    expect(sorting).toBeInTheDocument();
    expect(
      within(sorting).getByRole('button', {
        name: 'dashboard.top_branches_revenue',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('combines revenue and payment count in one controllable trend', async () => {
    await renderDashboard();

    expect(
      await screen.findByTestId('revenue-payment-chart'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('chart-metric-revenue')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const paymentMetric = screen.getByTestId('chart-metric-payments');
    expect(paymentMetric).toHaveAttribute('aria-pressed', 'true');
    expect(paymentMetric).toHaveClass('border-primary');

    fireEvent.click(paymentMetric);
    expect(paymentMetric).toHaveAttribute('aria-pressed', 'false');
    expect(paymentMetric).toHaveClass('border-transparent');
    expect(
      screen.getByText('dashboard.v2.average_payment'),
    ).toBeInTheDocument();
  });

  it('keeps manager decisions branch-scoped and prioritizes operations', async () => {
    auth.user = {
      name: 'Demo Manager',
      role: 'manager',
      branch_id: 'branch-1',
    };

    await renderDashboard('/dashboard?branch_id=branch-2');

    expect(
      screen.getByText('dashboard.v2.branch_performance'),
    ).not.toBeVisible();
    expect(screen.getByText('dashboard.v2.operations')).toBeInTheDocument();
    expect(
      screen.getByText('dashboard.v2.quick_action_payment'),
    ).toBeInTheDocument();
    expect(screen.queryByText('nav.audit')).not.toBeInTheDocument();
  });

  it('shows per-lesson revenue when lessons exist, and a no-lessons label when the count is 0', async () => {
    await renderDashboard();

    expect(
      screen.getByText('dashboard.v2.financial_block.per_lesson'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('dashboard.v2.financial_block.no_lessons'),
    ).toBeInTheDocument();
  });

  it('keeps dashboard filters in the URL', async () => {
    const { router } = await renderDashboard();
    fireEvent.click(
      screen.getByRole('button', { name: 'students.course_fast' }),
    );
    await waitFor(() =>
      expect(
        new URLSearchParams(router.state.location.searchStr).get('course_type'),
      ).toBe('tezkor'),
    );
  });

  it('shows one clearly selected detail view at a time', async () => {
    await renderDashboard();

    const financial = screen.getByRole('button', {
      name: 'dashboard.v2.financial_block.title',
    });
    const academic = screen.getByRole('button', {
      name: 'dashboard.v2.academic_block.title',
    });

    expect(financial).toHaveAttribute('aria-pressed', 'true');
    expect(academic).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByText('dashboard.v2.financial_block.debt_age_title'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('dashboard.v2.academic_block.dropout_rate'),
    ).not.toBeInTheDocument();

    fireEvent.click(academic);

    expect(financial).toHaveAttribute('aria-pressed', 'false');
    expect(academic).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByText('dashboard.v2.academic_block.dropout_rate'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('dashboard.v2.financial_block.debt_age_title'),
    ).not.toBeInTheDocument();
  });
});

// autodrive-ls5 — every dashboard click used to build uz-named paths
// (/talabalar, /tolovlar, /filiallar) that don't match App.tsx's real
// routes (students/payments/branches) and 404'd via the catch-all route.
// These assert navigation actually lands on the real routes with filters
// the destination page can consume.
// Matches the component's own todayInUz() so the assertion doesn't hardcode
// a date that drifts stale the day after this test is written.
const todayInUz = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(
    new Date(),
  );

describe('CompanyRevenueDashboard navigation (autodrive-ls5)', () => {
  it('today-revenue KPI navigates to /payments, not /tolovlar', async () => {
    const { router } = await renderDashboard();
    fireEvent.click(screen.getByText('dashboard.v2.today_revenue'));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/payments'),
    );
  });

  it('debt KPI navigates to /students with status+has_debt, not /talabalar', async () => {
    const { router } = await renderDashboard();
    fireEvent.click(
      within(screen.getByTestId('dashboard-v2-kpi-strip')).getByText(
        'dashboard.v2.outstanding_debt',
      ),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/students'),
    );
    const params = new URLSearchParams(router.state.location.searchStr);
    expect(params.get('status')).toBe('active');
    expect(params.get('has_debt')).toBe('true');
  });

  it('recovery-queue row navigates to /students/:id, not a name-search', async () => {
    const { router } = await renderDashboard();
    const row = screen.getByText('Ali Valiyev').closest('li');
    expect(row).toBeInTheDocument();
    const link = within(row!).getByRole('link');
    expect(row).not.toHaveAttribute('role', 'button');
    fireEvent.click(link);
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/students/student-1'),
    );
  });

  it('"manage branches" link navigates to the /branches list, not /filiallar', async () => {
    const { router } = await renderDashboard();
    fireEvent.click(screen.getByText('dashboard.v2.manage_branches'));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/branches'),
    );
  });

  it('a branch row navigates straight to /branches/:id, not a filtered list', async () => {
    const { router } = await renderDashboard();
    const branchTargets = screen.getAllByText('Chorsu').filter((el) => {
      const btn = el.closest('button');
      return !!btn && !el.closest('ul') && btn.className.includes('w-full');
    });
    expect(branchTargets.length).toBeGreaterThan(0);
    fireEvent.click(branchTargets[0]);
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/branches/branch-1'),
    );
  });

  // dashboard-deep-review finding 1 — dashboardContext used to build
  // from/to, but /payments (and /students) only read date_from/date_to via
  // useUrlParams, so the date filter silently dropped on drill-down nav.
  //
  // overview-fixes-frontend — the KPI also used to carry whatever ambient
  // range filter was selected (e.g. "this month") instead of today's date;
  // it now always overrides date_from/date_to to today regardless of the
  // ambient from/to filter.
  it('today-revenue KPI navigates to /payments with an explicit today date_from/date_to, not the ambient range', async () => {
    const { router } = await renderDashboard(
      '/dashboard?from=2026-07-01&to=2026-07-10',
    );
    fireEvent.click(screen.getByText('dashboard.v2.today_revenue'));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/payments'),
    );
    const params = new URLSearchParams(router.state.location.searchStr);
    expect(params.get('date_from')).toBe(todayInUz());
    expect(params.get('date_to')).toBe(todayInUz());
    expect(params.get('from')).toBeNull();
    expect(params.get('to')).toBeNull();
  });
});

// autodrive-sgf.3 — academic block: null metrics must render a '—'
// placeholder (not "null%"/"NaN%"), and the enrollment-funnel bar width
// must not divide by a zero `contract` denominator (NaN%/Infinity% in the
// inline style would silently break the bar).
describe('CompanyRevenueDashboard academic block (autodrive-sgf.3)', () => {
  it('shows — for null academic metrics and guards funnel divide-by-zero', async () => {
    const original = overview.data.kpis;
    overview.data.kpis = {
      ...original,
      attendance_rate: null,
      dropout_rate: 5,
      exam_first_attempt_pass_rate: null,
      completion_time_median_days: null,
      enrollment_funnel: {
        contract: 0,
        active: 0,
        graduated: 0,
        dropped_or_suspended: 0,
      },
    } as unknown as typeof original;
    try {
      const { container } = await renderDashboard();
      fireEvent.click(
        screen.getByRole('button', {
          name: 'dashboard.v2.academic_block.title',
        }),
      );
      // exec-dash 7: attendance_rate null renders '—' in the academic block
      // (3 placeholders when the KPI grid tile was removed from primary bands).
      expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
      expect(container.innerHTML).not.toContain('NaN%');
      expect(container.innerHTML).not.toContain('Infinity%');
    } finally {
      overview.data.kpis = original;
    }
  });
});

// autodrive-sgf.4 — the on-time attendance KPI is the one card in the staff
// block with real conditional rendering (tone flips on a threshold), so it's
// the seam worth locking down; the other two staff-block KPIs are plain
// pass-through display like every other KpiCard already covered above.
describe('CompanyRevenueDashboard staff block (autodrive-sgf.4)', () => {
  afterEach(() => {
    Object.assign(overview.data.kpis, {
      on_time_attendance_marking_rate: undefined,
    });
  });

  it('tones the on-time attendance KPI as success when the rate is >= 80', async () => {
    Object.assign(overview.data.kpis, { on_time_attendance_marking_rate: 92 });
    await renderDashboard();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'dashboard.v2.staff_block.title',
      }),
    );
    const card = screen
      .getByText('dashboard.v2.staff_block.on_time_attendance_label')
      .closest('[role="button"]');
    expect(card?.innerHTML).toContain('bg-success');
  });

  it('tones the on-time attendance KPI as warning when the rate is < 80', async () => {
    Object.assign(overview.data.kpis, { on_time_attendance_marking_rate: 40 });
    await renderDashboard();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'dashboard.v2.staff_block.title',
      }),
    );
    const card = screen
      .getByText('dashboard.v2.staff_block.on_time_attendance_label')
      .closest('[role="button"]');
    expect(card?.innerHTML).toContain('bg-warning');
  });
});
