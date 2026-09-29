import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DrivingSessionsPage from '@/features/driving-sessions/pages/DrivingSessionsPage';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

const drivingQuery = vi.hoisted(() => ({ empty: false }));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({
      user: {
        id: 'u1',
        branch_id: 'b1',
        branch_name: 'Yunusobod',
      },
    }),
}));

vi.mock('@/hooks/useCan', () => ({
  useCan: () => true,
}));

vi.mock('@/features/branches/api/branchService', () => ({
  useBranches: () => ({ data: [{ id: 'b1', name: 'Yunusobod' }] }),
}));

vi.mock('@/features/vehicles/api/vehicleService', () => ({
  useVehiclesPage: () => ({
    data: {
      data: [
        {
          id: 'v1',
          plate_number: '01 A 123 BC',
          make: 'Chevrolet',
          model: 'Cobalt',
        },
      ],
      meta: { total: 1, totalPages: 1 },
    },
  }),
}));

vi.mock('@/features/driving-sessions/api/drivingSessionService', () => ({
  usePracticeInstructors: () => ({
    data: [{ id: 'ins1', name: 'Alisher Ustoz' }],
  }),
  useDrivingSessionsPage: () => ({
    data: {
      data: drivingQuery.empty
        ? []
        : [
            {
              id: 'ds-1',
              enrollment_id: 'e1',
              student_id: 's1',
              student: { id: 's1', first_name: 'Ali', last_name: 'Valiyev' },
              vehicle_id: 'v1',
              vehicle: { id: 'v1', plate_number: '01 A 123 BC' },
              instructor_id: 'ins1',
              instructor: { id: 'ins1', name: 'Alisher Ustoz' },
              starts_at: '2026-09-20T07:00:00Z',
              ends_at: '2026-09-20T08:00:00Z',
              status: 'planned',
              planned_minutes: 60,
              actual_minutes: null,
              approved_minutes: 0,
            },
          ],
      meta: { total: drivingQuery.empty ? 0 : 1, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  drivingQuery.empty = false;
});

describe('DrivingSessionsPage', () => {
  it('renders driving session records in the data grid', async () => {
    await renderWithRouter(<DrivingSessionsPage />, {
      initialEntry: '/driving-sessions',
      routePattern: '/driving-sessions',
    });

    expect(screen.getByText('Valiyev Ali')).toBeTruthy();
    expect(screen.getAllByText('01 A 123 BC').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alisher Ustoz').length).toBeGreaterThan(0);
  });

  it('hydrates filters from URL params and displays active filter chips', async () => {
    await renderWithRouter(<DrivingSessionsPage />, {
      initialEntry:
        '/driving-sessions?status=planned&from=2026-09-01&to=2026-09-30&q=Ali&vehicle_id=v1',
      routePattern: '/driving-sessions',
    });

    const statusChip = screen.getByTestId('active-filter-chip-status');
    const dateChip = screen.getByTestId('active-filter-chip-date_range');
    const searchChip = screen.getByTestId('active-filter-chip-search');
    const vehicleChip = screen.getByTestId('active-filter-chip-vehicle');

    expect(statusChip.textContent).toContain('driving.status.planned');
    expect(dateChip.textContent).toContain('2026-09-01, 2026-09-30');
    expect(searchChip.textContent).toContain('Ali');
    expect(vehicleChip.textContent).toContain('01 A 123 BC');

    // Remove status chip
    const removeBtn = statusChip.querySelector('button')!;
    fireEvent.click(removeBtn);
    expect(screen.queryByTestId('active-filter-chip-status')).toBeNull();
  });
});
