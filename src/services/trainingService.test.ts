import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import {
  fetchTrainingEnrollment,
  fetchTrainingEnrollmentsPage,
  fetchTrainingProgram,
  fetchTrainingProgramsPage,
  fetchActiveTrainingPrograms,
  createTrainingEnrollment,
} from './trainingService';

vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

describe('training API', () => {
  it('loads approved programs with server-side filters', async () => {
    const program = { id: 'p1', name: 'B amaliyoti' };
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          data: [program],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        },
      },
    });
    const result = await fetchTrainingProgramsPage({
      branchId: 'b1',
      category: 'B',
      active: true,
    });
    expect(result.data).toEqual([program]);
    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/training-programs',
      expect.objectContaining({
        params: {
          branch_id: 'b1',
          category: 'B',
          is_active: true,
          page: 1,
          limit: 20,
        },
      }),
    );
  });

  it('loads a program detail', async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: { success: true, data: { id: 'p1' } },
    });
    await expect(fetchTrainingProgram('p1')).resolves.toEqual({ id: 'p1' });
    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/training-programs/p1',
      expect.any(Object),
    );
  });

  it('lists and loads company student enrollments', async () => {
    vi.mocked(axiosInstance.get)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            data: [{ id: 'e1' }],
            meta: { total: 1, page: 2, limit: 10, totalPages: 2 },
          },
        },
      })
      .mockResolvedValueOnce({ data: { success: true, data: { id: 'e1' } } });
    expect(
      (
        await fetchTrainingEnrollmentsPage({
          branchId: 'b1',
          studentId: 's1',
          page: 2,
          limit: 10,
        })
      ).data,
    ).toEqual([{ id: 'e1' }]);
    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/training-enrollments',
      expect.objectContaining({
        params: {
          branch_id: 'b1',
          student_id: 's1',
          status: undefined,
          page: 2,
          limit: 10,
        },
      }),
    );
    await expect(fetchTrainingEnrollment('e1')).resolves.toEqual({ id: 'e1' });
  });

  it('creates an enrollment without a branch override for managers', async () => {
    vi.mocked(axiosInstance.post).mockResolvedValue({
      data: { success: true, data: { id: 'e1' } },
    });
    await createTrainingEnrollment({ student_id: 's1', program_id: 'p1' });
    expect(axiosInstance.post).toHaveBeenCalledWith('/training-enrollments', {
      student_id: 's1',
      program_id: 'p1',
    });
  });

  it('loads every active program in a branch for enrollment selection', async () => {
    vi.mocked(axiosInstance.get)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            data: [{ id: 'p1' }],
            meta: { page: 1, limit: 100, total: 101, totalPages: 2 },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            data: [{ id: 'p2' }],
            meta: { page: 2, limit: 100, total: 101, totalPages: 2 },
          },
        },
      });
    await expect(fetchActiveTrainingPrograms('b1')).resolves.toEqual([
      { id: 'p1' },
      { id: 'p2' },
    ]);
    expect(axiosInstance.get).toHaveBeenNthCalledWith(
      1,
      '/training-programs',
      expect.objectContaining({
        params: {
          branch_id: 'b1',
          category: undefined,
          is_active: true,
          page: 1,
          limit: 100,
        },
      }),
    );
    expect(axiosInstance.get).toHaveBeenNthCalledWith(
      2,
      '/training-programs',
      expect.objectContaining({
        params: {
          branch_id: 'b1',
          category: undefined,
          is_active: true,
          page: 2,
          limit: 100,
        },
      }),
    );
  });
});
