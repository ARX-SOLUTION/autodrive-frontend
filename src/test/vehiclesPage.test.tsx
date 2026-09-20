import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VehiclesPage from '@/pages/VehiclesPage';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

vi.mock('@/services/vehicleService', () => ({
  useCreateVehicle: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateVehicle: () => ({ mutate: vi.fn(), isPending: false }),
  useVehiclesPage: () => ({
    data: {
      data: [
        {
          id: 'v1',
          branch_id: 'b1',
          plate_number: '01 A 123 BC',
          make: 'Chevrolet',
          model: 'Cobalt',
          manufacture_year: 2022,
          categories: ['B'],
          odometer_km: 12000,
          status: 'active',
          available_for_booking: false,
          unavailable_reasons: ['missing_insurance'],
        },
      ],
      meta: { total: 1, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({ data: [{ id: 'b1', name: 'Yunusobod' }] }),
}));

vi.mock('@/hooks/useCan', () => ({ useCan: () => false }));

afterEach(cleanup);

describe('VehiclesPage', () => {
  it('shows an unavailable car and localizes the reason', async () => {
    await renderWithRouter(<VehiclesPage />, {
      initialEntry: '/vehicles',
      routePattern: '/vehicles',
    });
    expect(screen.getByText('01 A 123 BC')).toBeTruthy();
    expect(screen.getByText('Chevrolet Cobalt')).toBeTruthy();
    expect(screen.getByText('vehicles.reasons.missing_insurance')).toBeTruthy();
  });
});
