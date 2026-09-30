import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VehicleSessionsTab from './VehicleSessionsTab';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'uz' },
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

const mockData = vi.hoisted(() => ({
  isLoading: false,
  isError: false,
  sessions: [] as unknown[],
  meta: { page: 1, totalPages: 1, totalItems: 0, hasNextPage: false },
}));

vi.mock('@/features/driving-sessions/api/drivingSessionService', () => ({
  useDrivingSessionsPage: () => ({
    data: {
      data: mockData.sessions,
      meta: mockData.meta,
    },
    isLoading: mockData.isLoading,
    isError: mockData.isError,
    refetch: vi.fn(),
  }),
}));

describe('VehicleSessionsTab', () => {
  it('shows empty state when vehicle has no driving sessions', () => {
    mockData.isLoading = false;
    mockData.isError = false;
    mockData.sessions = [];

    render(<VehicleSessionsTab vehicleId="v1" />);
    expect(screen.getByText('vehicles.no_sessions')).toBeInTheDocument();
    expect(
      screen.getByText('vehicles.session_conflict_notice'),
    ).toBeInTheDocument();
  });

  it('renders sessions table and highlights active session if occurring right now', () => {
    const now = new Date();
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    const fiftyMinLater = new Date(
      now.getTime() + 50 * 60 * 1000,
    ).toISOString();

    mockData.isLoading = false;
    mockData.isError = false;
    mockData.sessions = [
      {
        id: 's-active',
        starts_at: tenMinAgo,
        ends_at: fiftyMinLater,
        status: 'planned',
        planned_minutes: 60,
        instructor: { id: 'ins1', name: 'Rustam Karimov' },
        student: { id: 'st1', first_name: 'Anvar', last_name: 'Saidov' },
      },
      {
        id: 's-past',
        starts_at: '2026-09-20T09:00:00Z',
        ends_at: '2026-09-20T11:00:00Z',
        status: 'approved',
        planned_minutes: 120,
        instructor: { id: 'ins2', name: 'Farhod Aliyev' },
        student: { id: 'st2', first_name: 'Malika', last_name: 'Tursunova' },
      },
    ];
    mockData.meta = {
      page: 1,
      totalPages: 1,
      totalItems: 2,
      hasNextPage: false,
    };

    render(<VehicleSessionsTab vehicleId="v1" />);

    // Active session indicator
    expect(screen.getByText('vehicles.active_now')).toBeInTheDocument();
    expect(screen.getAllByText('Rustam Karimov').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Anvar Saidov/).length).toBeGreaterThan(0);

    // Past session in table
    expect(screen.getByText('Farhod Aliyev')).toBeInTheDocument();
    expect(screen.getByText(/Malika Tursunova/)).toBeInTheDocument();
  });
});
