import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LeadMetricsView } from './LeadMetricsView';
import type { LeadMetrics } from '../types/leads.types';

const mockUseLeadMetricsQuery = vi.fn();

vi.mock('../queries/leadsQueries', () => ({
  useLeadMetricsQuery: (params: unknown) => mockUseLeadMetricsQuery(params),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

describe('LeadMetricsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons while fetching data', () => {
    mockUseLeadMetricsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    const { container } = render(<LeadMetricsView />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(
      0,
    );
  });

  it('renders error state and handles retry', () => {
    const mockRefetch = vi.fn();
    mockUseLeadMetricsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    });

    render(<LeadMetricsView />);
    expect(screen.getByText('Xatolik yuz berdi')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /qayta urinish/i });
    fireEvent.click(retryBtn);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('renders metrics data without error when breakdowns are empty', () => {
    const emptyMetrics: LeadMetrics = {
      totalLeads: 0,
      wonLeads: 0,
      lostLeads: 0,
      conversionRate: 0,
      avgTimeToWonDays: null,
      bySource: {},
      byLostReason: {},
      byStage: {},
    };

    mockUseLeadMetricsQuery.mockReturnValue({
      data: emptyMetrics,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<LeadMetricsView />);
    expect(screen.getByText('Jami lidlar')).toBeInTheDocument();
    expect(
      screen.getByText('Davrda yaratilganlardan aylangan'),
    ).toBeInTheDocument();
    // Breakdown empty states
    const noDataList = screen.getAllByText('Ma’lumotlar yo‘q');
    expect(noDataList.length).toBe(3);
  });

  it('renders complete metrics with breakdown progress bars and operational alerts', () => {
    const richMetrics: LeadMetrics = {
      totalLeads: 25,
      wonLeads: 5,
      lostLeads: 4,
      conversionRate: 20,
      avgTimeToWonDays: 3,
      bySource: {
        telegram: { count: 15, won: 3, conversionRate: 20 },
      },
      byLostReason: {
        EXPENSIVE: 3,
        FAR_AWAY: 1,
      },
      byStage: {
        Yangi: 10,
        Aloqa: 6,
      },
      overdueCount: 2,
      untouchedCount: 4,
    };

    mockUseLeadMetricsQuery.mockReturnValue({
      data: richMetrics,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<LeadMetricsView />);
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('3 kun')).toBeInTheDocument();

    // Operational alert highlights
    expect(screen.getByText('Kechikkan vazifalar')).toBeInTheDocument();
    expect(screen.getByText('3+ kundan beri tegilmagan')).toBeInTheDocument();

    // Accessible progress bars
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('calls onPeriodChange when user selects another period', () => {
    const onPeriodChange = vi.fn();
    mockUseLeadMetricsQuery.mockReturnValue({
      data: {
        totalLeads: 10,
        wonLeads: 2,
        lostLeads: 1,
        conversionRate: 20,
        avgTimeToWonDays: null,
        bySource: {},
        byLostReason: {},
        byStage: {},
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<LeadMetricsView period="30d" onPeriodChange={onPeriodChange} />);
    const sevenDaysBtn = screen.getByRole('button', { name: /7 kun/i });
    fireEvent.click(sevenDaysBtn);
    expect(onPeriodChange).toHaveBeenCalledWith('7d');
  });
  it('uses the current open snapshot rather than period-created count for stage shares', () => {
    mockUseLeadMetricsQuery.mockReturnValue({
      data: {
        totalLeads: 1,
        wonLeads: 0,
        lostLeads: 0,
        conversionRate: 0,
        avgTimeToWonDays: null,
        bySource: {},
        byLostReason: {},
        byStage: { Existing: 10 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    render(<LeadMetricsView />);
    expect(
      screen.getByRole('progressbar', { name: 'Existing: 10 (100%)' }),
    ).toHaveAttribute('aria-valuenow', '100');
  });
});
