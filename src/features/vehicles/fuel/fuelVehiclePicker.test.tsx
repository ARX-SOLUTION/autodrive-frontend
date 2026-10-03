import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FuelCreateDialog from './FuelCreateDialog';
import { useWriteOptions } from '@/hooks/useWriteOptions';

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { id: 'u1', role: 'owner' }, activeBranchId: 'b1' }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('@/hooks/useWriteOptions', () => ({ useWriteOptions: vi.fn() }));
vi.mock('./service', () => ({
  useFuelVehicles: () => ({ data: undefined }),
  useStations: () => ({ data: undefined }),
  useVehicleLastFuel: () => ({ data: undefined }),
  lookupReceipt: vi.fn(),
  submitFuelComplete: vi.fn(),
  saveFuel: vi.fn(),
}));

describe('fuel vehicle picker', () => {
  it('explains a branch with no eligible vehicles and what to do next', () => {
    vi.mocked(useWriteOptions).mockReturnValue({
      scoped: true,
      branches: [{ id: 'b1', name: 'Chilonzor' }],
      selectedBranchId: 'b1',
      data: { vehicles: [], stations: [] },
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useWriteOptions>);
    render(<FuelCreateDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByText('vehicles.no_eligible')).toBeInTheDocument();
    expect(screen.getByText('vehicles.no_eligible_desc')).toBeInTheDocument();
    expect(screen.queryByText('common.no_data')).toBeNull();
  });
});
