import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
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
