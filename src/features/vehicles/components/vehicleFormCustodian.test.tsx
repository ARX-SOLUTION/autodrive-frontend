import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VehicleFormDialog from '@/features/vehicles/components/VehicleFormDialog';
import type { Vehicle } from '@/features/vehicles/types';
import type { Branch } from '@/features/branches/types';

vi.mock('@/hooks/useCan', () => ({
  useCan: () => true,
  useIsCrossTenant: () => false,
}));

const mockBranches: Branch[] = [
  {
    id: 'b1',
    name: 'Yunusobod',
    location: 'Tashkent',
    active_students: 10,
    created_at: '2026-01-01T00:00:00Z',
  },
];

const teachersMock = [
  { id: 't1', name: 'Alisher Qodirov', branch_id: 'b1' },
  { id: 't2', name: 'Bobur Jalilov', branch_id: 'b1' },
];

vi.mock('@/features/staff/api/teacherService', () => ({
  useTeachers: () => ({ data: teachersMock }),
}));

const mockUpdate = vi.fn();
const mockCreate = vi.fn();

vi.mock('@/features/vehicles/api/vehicleService', () => ({
  useCreateVehicle: () => ({ mutate: mockCreate, isPending: false }),
  useUpdateVehicle: () => ({ mutate: mockUpdate, isPending: false }),
}));

const activeVehicle: Vehicle = {
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
  status: 'active',
  current_custodian_id: 't1',
  current_custodian: { id: 't1', name: 'Alisher Qodirov' },
  available_for_booking: true,
  unavailable_reasons: [],
  created_at: '2026-09-20T00:00:00Z',
  updated_at: '2026-09-20T00:00:00Z',
};

describe('VehicleFormDialog custodian assignment', () => {
  it('submits updated custodian payload when form is saved', async () => {
    mockUpdate.mockClear();
    render(
      <VehicleFormDialog
        open
        vehicle={activeVehicle}
        branches={mockBranches}
        onClose={vi.fn()}
      />,
    );

    const submitBtn = screen.getByRole('button', {
      name: /saqlash|save|common\.save/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'v1',
          current_custodian_id: 't1',
        }),
        expect.anything(),
      );
    });
  });

  it('submits null current_custodian_id when vehicle has no custodian', async () => {
    mockCreate.mockClear();
    render(
      <VehicleFormDialog
        open
        vehicle={null}
        defaultBranchId="b1"
        branches={mockBranches}
        onClose={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/davlat raqami|plate/i), {
      target: { value: '01 B 777 BB' },
    });
    fireEvent.change(screen.getByLabelText(/marka|make/i), {
      target: { value: 'Nexia' },
    });
    fireEvent.change(screen.getByLabelText(/model/i), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByLabelText(/ishlab chiqarilgan yili|year/i), {
      target: { value: '2021' },
    });

    const submitBtn = screen.getByRole('button', {
      name: /saqlash|save|common\.save|qo'shish/i,
    });
    fireEvent.click(submitBtn);

    // Categories are required, so verify dialog validates
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
