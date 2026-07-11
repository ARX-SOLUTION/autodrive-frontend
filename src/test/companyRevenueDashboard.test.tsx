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
vi.mock('@/services/dashboardService', () => ({
  useCompanyOverview: () => ({
    ...overview,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

afterEach(() => vi.clearAllMocks());

describe('CompanyRevenueDashboard', () => {
  it('renders revenue-control KPIs and the recovery queue', () => {
    render(
      <MemoryRouter>
        <CompanyRevenueDashboard />
      </MemoryRouter>,
    );

    expect(screen.getByText('dashboard.v2.today_revenue')).toBeInTheDocument();
    expect(
      screen.getByText(
        (content) => content.includes('700') && content.includes("so'm"),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Ali Valiyev')).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.replace(/\D/g, '') === '5000000'),
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
        <Route path="/branches" element={<DestinationProbe />} />
        <Route path="/branches/:id" element={<DestinationProbe />} />
      </Routes>
    </MemoryRouter>,
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

  it('recovery-queue row navigates to /students with q=<name>, not search=', () => {
    renderDashboardWithRoutes();
    fireEvent.click(screen.getByText('Ali Valiyev'));
    const [pathname, search] =
      screen.getByTestId('destination').textContent?.split('|') ?? [];
    expect(pathname).toBe('/students');
    const params = new URLSearchParams(search);
    expect(params.get('q')).toBe('Ali Valiyev');
    expect(params.get('search')).toBeNull();
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
});
