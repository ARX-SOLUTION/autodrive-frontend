import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import { fetchVehicle, fetchVehiclesPage } from './vehicleService';

vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const vehicle = {
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
  available_for_booking: true,
  unavailable_reasons: [],
  created_at: '2026-09-20T00:00:00Z',
  updated_at: '2026-09-20T00:00:00Z',
};

beforeEach(() => vi.clearAllMocks());

describe('vehicle API', () => {
  it('lists a server-paginated, branch-filtered fleet', async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          data: [vehicle],
          meta: { total: 1, page: 2, limit: 10, totalPages: 2 },
        },
      },
    });

    const result = await fetchVehiclesPage({
      branchId: 'b1',
      search: 'Cobalt',
      category: 'B',
      status: 'active',
      page: 2,
      limit: 10,
    });

    expect(result.data).toEqual([vehicle]);
    expect(result.meta.page).toBe(2);
    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/vehicles',
      expect.objectContaining({
        params: {
          branch_id: 'b1',
          search: 'Cobalt',
          category: 'B',
          status: 'active',
          page: 2,
          limit: 10,
        },
      }),
    );
  });

  it('loads a vehicle with detail subresources', async () => {
    const detail = {
      ...vehicle,
      documents: [],
      maintenance: [],
      transfers: [],
    };
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: { success: true, data: detail },
    });
    await expect(fetchVehicle('v1')).resolves.toEqual(detail);
    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/vehicles/v1',
      expect.any(Object),
    );
  });
});
