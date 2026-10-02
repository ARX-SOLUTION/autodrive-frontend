import { screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import InspectionsPage from './InspectionsPage';
import { useWriteOptions } from '@/hooks/useWriteOptions';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'uz' },
  }),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { id: 'u1', role: 'owner' }, activeBranchId: 'b1' }),
}));

vi.mock('@/hooks/useCan', () => ({ useCan: () => true }));
vi.mock('@/hooks/useWriteOptions', () => ({ useWriteOptions: vi.fn() }));
vi.mock('@/features/branches/api/branchService', () => ({
  useBranches: () => ({ data: [] }),
}));
vi.mock('@/features/vehicles/api/vehicleService', () => ({
  useVehiclesPage: () => ({ data: undefined }),
}));
vi.mock('./service', () => ({
  useInspections: () => ({
    data: { data: [], meta: { total: 0, totalPages: 1 } },
    isLoading: false,
  }),
  useInspectionSummary: () => ({ data: undefined }),
  useInspectionReceivers: () => ({ data: undefined }),
  useInspectionMutation: () => ({ mutate: vi.fn(), isPending: false }),
  createInspection: vi.fn(),
}));

const mockVehicles = (vehicles: { id: string; plate_number: string }[]) =>
  vi.mocked(useWriteOptions).mockReturnValue({
    scoped: true,
    branches: [{ id: 'b1', name: 'Chilonzor' }],
    selectedBranchId: 'b1',
    data: {
      vehicles: vehicles.map((v) => ({
        ...v,
        branch_id: 'b1',
        available_for_booking: true,
        categories: ['B'],
      })),
    },
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useWriteOptions>);

const openCreate = async () => {
  await renderWithRouter(<InspectionsPage />);
  fireEvent.click(screen.getByRole('button', { name: 'inspections.create' }));
};

describe('inspection vehicle picker states', () => {
  beforeEach(() => vi.mocked(useWriteOptions).mockReset());

  it('explains a branch with no eligible vehicles and what to do next', async () => {
    mockVehicles([]);
    await openCreate();

    expect(screen.getByText('vehicles.no_eligible')).toBeInTheDocument();
    expect(screen.getByText('vehicles.no_eligible_desc')).toBeInTheDocument();
  });

  it('tells a search miss apart from a branch without vehicles', async () => {
    mockVehicles([{ id: 'v1', plate_number: '01A777AA' }]);
    await openCreate();
    fireEvent.change(screen.getByLabelText('inspections.vehicle_search'), {
      target: { value: 'ZZZ' },
    });

    expect(screen.getByText('vehicles.no_filter_results')).toBeInTheDocument();
    expect(screen.queryByText('vehicles.no_eligible')).toBeNull();
  });

  it('keeps the receiver disabled with a reason until a vehicle is picked', async () => {
    mockVehicles([{ id: 'v1', plate_number: '01A777AA' }]);
    await openCreate();
    const receiver = screen.getByLabelText('inspections.receiver');

    expect(receiver).toBeDisabled();
    expect(receiver).toHaveAccessibleDescription(
      'inspections.receiver_needs_vehicle',
    );
    fireEvent.change(screen.getByLabelText('inspections.vehicle'), {
      target: { value: 'v1' },
    });
    expect(receiver).toBeEnabled();
    expect(screen.queryByText('inspections.receiver_needs_vehicle')).toBeNull();
  });
});
