import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VehiclesPage from '@/features/vehicles/pages/VehiclesPage';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

const vehicleQuery = vi.hoisted(() => ({ empty: false }));

vi.mock('@/features/vehicles/api/vehicleService', () => ({
  useCreateVehicle: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateVehicle: () => ({ mutate: vi.fn(), isPending: false }),
  useVehiclesPage: () => ({
    data: {
      data: vehicleQuery.empty
        ? []
        : [
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
      meta: { total: vehicleQuery.empty ? 0 : 1, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/branches/api/branchService', () => ({
  useBranches: () => ({ data: [{ id: 'b1', name: 'Yunusobod' }] }),
}));

vi.mock('@/hooks/useCan', () => ({ useCan: () => false }));

afterEach(() => {
  cleanup();
  vehicleQuery.empty = false;
});

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

  it('distinguishes filtered-empty results and lets users clear filters', async () => {
    vehicleQuery.empty = true;
    await renderWithRouter(<VehiclesPage />, {
      initialEntry: '/vehicles?status=retired',
      routePattern: '/vehicles',
    });

    expect(screen.getByText('vehicles.no_filter_results')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'common.clear' })[0]);
    expect(screen.getByText('vehicles.empty')).toBeTruthy();
  });

  it('hydrates filters from URL and renders active filter chips', async () => {
    await renderWithRouter(<VehiclesPage />, {
      initialEntry: '/vehicles?status=active&category=B&q=Cobalt',
      routePattern: '/vehicles',
    });

    const statusChip = screen.getByTestId('active-filter-chip-status');
    const categoryChip = screen.getByTestId('active-filter-chip-category');
    const searchChip = screen.getByTestId('active-filter-chip-search');

    expect(statusChip.textContent).toContain('vehicles.status.active');
    expect(categoryChip.textContent).toContain('vehicles.categories_list.B');
    expect(searchChip.textContent).toContain('Cobalt');

    // Remove status chip
    const removeBtn = statusChip.querySelector('button')!;
    fireEvent.click(removeBtn);
    expect(screen.queryByTestId('active-filter-chip-status')).toBeNull();
  });
});
