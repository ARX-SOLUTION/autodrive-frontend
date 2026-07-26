import { fireEvent, render, screen } from '@testing-library/react';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useSearchParams,
} from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CompanyRevenueDashboard from '@/pages/dashboard/CompanyRevenueDashboard';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

const auth = vi.hoisted(() => ({
  user: { name: 'Demo Owner', role: 'owner', branch_id: undefined },
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
      students: { active: 60, new: 12, completed: 14, dropped: 8 },
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
vi.mock('@/hooks/useCan', () => ({ useCan: () => true }));
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
  overviewState.isLoading = false;
  overviewState.isError = false;
  vi.clearAllMocks();
});

describe('CompanyRevenueDashboard', () => {
  it('shows a loading skeleton while overview data is fetching', () => {
    overviewState.isLoading = true;
    const { container } = render(
      <MemoryRouter>
        <CompanyRevenueDashboard />
      </MemoryRouter>,
    );
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('shows an error state with retry when overview fetch fails', () => {
    overviewState.isError = true;
    render(
      <MemoryRouter>
        <CompanyRevenueDashboard />
      </MemoryRouter>,
    );
    expect(screen.getByText('dashboard.v2.error_title')).toBeInTheDocument();
    fireEvent.click(screen.getByText('common.retry'));
    expect(overviewState.refetch).toHaveBeenCalled();
  });

  it('renders Variant B primary bands for the editorial layout', () => {
    render(
      <MemoryRouter>
        <CompanyRevenueDashboard />
      </MemoryRouter>,
    );
    expect(
      screen.getByTestId('dashboard-v2-primary-bands'),
    ).toBeInTheDocument();
  });

  it('renders revenue-control KPIs and the recovery queue', () => {
    render(
      <MemoryRouter>
        <CompanyRevenueDashboard />
      </MemoryRouter>,
    );

    expect(screen.getByText('dashboard.v2.today_revenue')).toBeInTheDocument();
    // exec-dash 7: the KPI tile's value and currency unit are now separate
    // elements (two-tier .num value + unit typography per the mock) instead
    // of one formatMoney() string, so check them independently.
    expect(
      screen.getByText((content) => content.replace(/\s/g, '') === '700000'),
    ).toBeInTheDocument();
    // react-i18next is mocked to `t: (str) => str` in test/setup.ts, so the
    // unit renders as the raw key here, not the real "so'm" translation.
    expect(
      screen.getAllByText('dashboard.currency_suffix').length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('Ali Valiyev')).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.replace(/\D/g, '') === '5000000'),
    ).toBeInTheDocument();
  });

  it('shows per-lesson revenue when lessons exist, and a no-lessons label when the count is 0', () => {
    render(
      <MemoryRouter>
        <CompanyRevenueDashboard />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('dashboard.v2.financial_block.per_lesson'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('dashboard.v2.financial_block.no_lessons'),
    ).toBeInTheDocument();
  });

  it('keeps dashboard filters in the URL', () => {
    const LocationProbe = () => {
      const [params] = useSearchParams();
      return <output data-testid="location-search">{params.toString()}</output>;
    };
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <CompanyRevenueDashboard />
        <LocationProbe />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('dashboard.v2.course'), {
      target: { value: 'tezkor' },
    });
    expect(screen.getByTestId('location-search')).toHaveTextContent(
      'course_type=tezkor',
    );
  });
});

// autodrive-ls5 — every dashboard click used to build uz-named paths
// (/talabalar, /tolovlar, /filiallar) that don't match App.tsx's real
// routes (students/payments/branches) and 404'd via the catch-all route.
// These assert navigation actually lands on the real routes with filters
// the destination page can consume.
const DestinationProbe = () => {
  const location = useLocation();
  return (
    <output data-testid="destination">
      {location.pathname}|{location.search}
    </output>
  );
};

const renderDashboardWithRoutes = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<CompanyRevenueDashboard />} />
        <Route path="/payments" element={<DestinationProbe />} />
        <Route path="/students" element={<DestinationProbe />} />
        <Route path="/students/:id" element={<DestinationProbe />} />
        <Route path="/branches" element={<DestinationProbe />} />
        <Route path="/branches/:id" element={<DestinationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

// Matches the component's own todayInUz() so the assertion doesn't hardcode
// a date that drifts stale the day after this test is written.
const todayInUz = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(
    new Date(),
  );

describe('CompanyRevenueDashboard navigation (autodrive-ls5)', () => {
  it('today-revenue KPI navigates to /payments, not /tolovlar', () => {
    renderDashboardWithRoutes();
    fireEvent.click(screen.getByText('dashboard.v2.today_revenue'));
    expect(screen.getByTestId('destination').textContent).toMatch(
      /^\/payments\|/,
    );
  });

  it('debt KPI navigates to /students with status+has_debt, not /talabalar', () => {
    renderDashboardWithRoutes();
    fireEvent.click(screen.getByText('dashboard.v2.outstanding_debt'));
    const [pathname, search] =
      screen.getByTestId('destination').textContent?.split('|') ?? [];
    expect(pathname).toBe('/students');
    const params = new URLSearchParams(search);
    expect(params.get('status')).toBe('active');
    expect(params.get('has_debt')).toBe('true');
  });

  it('recovery-queue row navigates to /students/:id, not a name-search', () => {
    renderDashboardWithRoutes();
    fireEvent.click(screen.getByText('Ali Valiyev'));
    expect(screen.getByTestId('destination').textContent).toBe(
      '/students/student-1|',
    );
  });

  // overview-fixes-frontend — the 90+ day debt-aging bucket had no
  // click-through at all; it now links to the same debt filter as the
  // "Jami qarzdorlik" KPI (recovery queue's underlying data).
  it('90+ day debt-aging card navigates to /students with status+has_debt', () => {
    renderDashboardWithRoutes();
    fireEvent.click(
      screen.getByText('dashboard.v2.financial_block.bucket_90_plus'),
    );
    const [pathname, search] =
      screen.getByTestId('destination').textContent?.split('|') ?? [];
    expect(pathname).toBe('/students');
    const params = new URLSearchParams(search);
    expect(params.get('status')).toBe('active');
    expect(params.get('has_debt')).toBe('true');
  });

  it('"manage branches" link navigates to the /branches list, not /filiallar', () => {
    renderDashboardWithRoutes();
    fireEvent.click(screen.getByText('dashboard.v2.manage_branches'));
    expect(screen.getByTestId('destination').textContent).toMatch(
      /^\/branches\|/,
    );
  });

  it('a branch row navigates straight to /branches/:id, not a filtered list', () => {
    renderDashboardWithRoutes();
    const branchTargets = screen
      .getAllByText('Chorsu')
      .filter((el) => el.closest('[role="button"]'));
    expect(branchTargets.length).toBeGreaterThan(0);
    fireEvent.click(branchTargets[0]);
    expect(screen.getByTestId('destination').textContent).toBe(
      '/branches/branch-1|',
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
  it('today-revenue KPI navigates to /payments with an explicit today date_from/date_to, not the ambient range', () => {
    render(
      <MemoryRouter
        initialEntries={['/dashboard?from=2026-07-01&to=2026-07-10']}
      >
        <Routes>
          <Route path="/dashboard" element={<CompanyRevenueDashboard />} />
          <Route path="/payments" element={<DestinationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('dashboard.v2.today_revenue'));
    const [pathname, search] =
      screen.getByTestId('destination').textContent?.split('|') ?? [];
    expect(pathname).toBe('/payments');
    const params = new URLSearchParams(search);
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
  it('shows — for null academic metrics and guards funnel divide-by-zero', () => {
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
    } as typeof original;
    try {
      const { container } = render(
        <MemoryRouter>
          <CompanyRevenueDashboard />
        </MemoryRouter>,
      );
      // exec-dash 7: attendance_rate null renders '—' in the academic block
      // (3 placeholders when the KPI grid tile was removed from primary bands).
      expect(screen.getAllByText('—')).toHaveLength(3);
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

  it('tones the on-time attendance KPI as success when the rate is >= 80', () => {
    Object.assign(overview.data.kpis, { on_time_attendance_marking_rate: 92 });
    render(
      <MemoryRouter>
        <CompanyRevenueDashboard />
      </MemoryRouter>,
    );
    const card = screen
      .getByText('dashboard.v2.staff_block.on_time_attendance_label')
      .closest('[role="button"]');
    expect(card?.innerHTML).toContain('bg-success');
  });

  it('tones the on-time attendance KPI as warning when the rate is < 80', () => {
    Object.assign(overview.data.kpis, { on_time_attendance_marking_rate: 40 });
    render(
      <MemoryRouter>
        <CompanyRevenueDashboard />
      </MemoryRouter>,
    );
    const card = screen
      .getByText('dashboard.v2.staff_block.on_time_attendance_label')
      .closest('[role="button"]');
    expect(card?.innerHTML).toContain('bg-warning');
  });
});
