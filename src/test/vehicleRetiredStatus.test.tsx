import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VehicleFormDialog from '@/pages/vehicles/VehicleFormDialog';
import type { Vehicle } from '@/types/vehicle';

vi.mock('@/hooks/useCan', () => ({ useCan: () => true }));
vi.mock('@/services/vehicleService', () => ({
  useCreateVehicle: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateVehicle: () => ({ mutate: vi.fn(), isPending: false }),
}));

const retired: Vehicle = {
  id: 'v1',
  company_id: 'c1',
  branch_id: 'b1',
  plate_number: '01 A 123 BC',
  vin: null,
  make: 'Chevrolet',
  model: 'Cobalt',
  manufacture_year: 2022,
  categories: ['B'],
  odometer_km: 12000,
  status: 'retired',
  available_for_booking: false,
  unavailable_reasons: ['status_retired'],
  created_at: '2026-09-20T00:00:00Z',
  updated_at: '2026-09-20T00:00:00Z',
};

describe('retired vehicle editing', () => {
  it('does not offer a terminal status reactivation control', () => {
    render(
      <VehicleFormDialog
        open
        vehicle={retired}
        branches={[]}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('combobox', { name: 'common.status' }),
    ).toBeDisabled();
    expect(screen.getByDisplayValue('Chevrolet')).not.toBeDisabled();
  });
});
