import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VehicleDetailPage from '@/pages/VehicleDetailPage';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

vi.mock('@/services/vehicleService', () => ({
  useVehicle: () => ({
    data: {
      id: 'v1',
      branch_id: 'b1',
      plate_number: '01 A 123 BC',
      vin: null,
      make: 'Chevrolet',
      model: 'Cobalt',
      manufacture_year: 2022,
      categories: ['B'],
      odometer_km: 12000,
      status: 'active',
      available_for_booking: false,
      unavailable_reasons: ['missing_insurance'],
      documents: [
        {
          id: 'd1',
          type: 'registration',
          label: 'Tex pasport',
          reference: null,
          expires_on: null,
          created_at: '2026-09-20T00:00:00Z',
        },
      ],
      maintenance: [],
      transfers: [],
    },
    isLoading: false,
    isError: false,
  }),
  useCreateVehicle: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateVehicle: () => ({ mutate: vi.fn(), isPending: false }),
  useAddVehicleDocument: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateVehicleDocument: () => ({ mutate: vi.fn(), isPending: false }),
  useAddVehicleMaintenance: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateVehicleMaintenance: () => ({ mutate: vi.fn(), isPending: false }),
  useTransferVehicle: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({ data: [{ id: 'b1', name: 'Yunusobod' }] }),
}));

const access = vi.hoisted(() => ({ canManage: false }));
vi.mock('@/hooks/useCan', () => ({
  useCan: (cap: string) => cap === 'manageVehicles' && access.canManage,
}));

afterEach(() => {
  access.canManage = false;
  cleanup();
});

describe('VehicleDetailPage', () => {
  it('shows booking blocker and recorded document without fabricating an expiry', async () => {
    await renderWithRouter(<VehicleDetailPage />, {
      initialEntry: '/vehicles/v1',
      routePattern: '/vehicles/$id',
    });
    expect(screen.getByText('01 A 123 BC')).toBeTruthy();
    expect(screen.getByText('vehicles.reasons.missing_insurance')).toBeTruthy();
    fireEvent.mouseDown(
      screen.getByRole('tab', { name: 'vehicles.documents' }),
    );
    expect(screen.getByText('Tex pasport')).toBeTruthy();
    expect(screen.getByText('common.na')).toBeTruthy();
  });

  it('lets a manager open the vehicle document form', async () => {
    access.canManage = true;
    await renderWithRouter(<VehicleDetailPage />, {
      initialEntry: '/vehicles/v1',
      routePattern: '/vehicles/$id',
    });
    fireEvent.mouseDown(
      screen.getByRole('tab', { name: 'vehicles.documents' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'vehicles.add_document' }),
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(
      within(screen.getByRole('dialog')).getByText('vehicles.expires_on'),
    ).toBeTruthy();
  });
});
