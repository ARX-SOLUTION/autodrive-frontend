import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import {
  approveDrivingSession,
  correctDrivingSession,
  fetchDrivingSession,
  fetchDrivingSessionsForReport,
  fetchDrivingSessionsPage,
  fetchDrivingSummary,
  fetchPracticeInstructors,
  submitDrivingSession,
} from './drivingSessionService';

vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

describe('driving sessions API', () => {
  it('lists sessions by enrollment and branch', async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          data: [{ id: 'd1' }],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        },
      },
    });
    expect(
      (await fetchDrivingSessionsPage({ enrollmentId: 'e1', branchId: 'b1' }))
        .data,
    ).toEqual([{ id: 'd1' }]);
    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/driving-sessions',
      expect.objectContaining({
        params: expect.objectContaining({
          enrollment_id: 'e1',
          branch_id: 'b1',
          page: 1,
          limit: 20,
        }),
      }),
    );
  });

  it('loads session and approved-only summary separately', async () => {
    vi.mocked(axiosInstance.get)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: { id: 'd1', status: 'submitted', approved_minutes: 0 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            enrollment_id: 'e1',
            approved_minutes: 0,
            entered_minutes: 40,
          },
        },
      });
    await expect(fetchDrivingSession('d1')).resolves.toMatchObject({
      approved_minutes: 0,
    });
    await expect(fetchDrivingSummary('e1')).resolves.toMatchObject({
      approved_minutes: 0,
      entered_minutes: 40,
    });
    expect(axiosInstance.get).toHaveBeenLastCalledWith(
      '/driving-sessions/summary',
      expect.objectContaining({ params: { enrollment_id: 'e1' } }),
    );
  });

  it('sends actual minutes and a mandatory GPS exception through distinct decisions', async () => {
    vi.mocked(axiosInstance.post).mockResolvedValue({
      data: { success: true, data: { id: 'd1' } },
    });
    await submitDrivingSession('d1', { actual_minutes: 40 });
    await approveDrivingSession('d1', {
      gps_exception_reason: 'Tracker unavailable',
    });
    await correctDrivingSession('d1', {
      actual_minutes: 35,
      reason: 'Instructor correction',
    });
    expect(axiosInstance.post).toHaveBeenNthCalledWith(
      1,
      '/driving-sessions/d1/submit',
      { actual_minutes: 40 },
    );
    expect(axiosInstance.post).toHaveBeenNthCalledWith(
      2,
      '/driving-sessions/d1/approve',
      { gps_exception_reason: 'Tracker unavailable' },
    );
    expect(axiosInstance.post).toHaveBeenNthCalledWith(
      3,
      '/driving-sessions/d1/correct',
      { actual_minutes: 35, reason: 'Instructor correction' },
    );
  });

  it('finds practice instructors beyond the first company-wide page within the branch', async () => {
    vi.mocked(axiosInstance.get)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            data: [{ id: 'theory', specialization: 'THEORY' }],
            meta: { page: 1, limit: 100, total: 101, totalPages: 2 },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            data: [{ id: 'practice', specialization: 'PRACTICE' }],
            meta: { page: 2, limit: 100, total: 101, totalPages: 2 },
          },
        },
      });
    await expect(fetchPracticeInstructors('b1')).resolves.toEqual([
      { id: 'practice', specialization: 'PRACTICE' },
    ]);
    expect(axiosInstance.get).toHaveBeenNthCalledWith(
      1,
      '/users',
      expect.objectContaining({
        params: {
          role: 'teacher',
          branchId: 'b1',
          isActive: true,
          page: 1,
          limit: 100,
        },
      }),
    );
    expect(axiosInstance.get).toHaveBeenNthCalledWith(
      2,
      '/users',
      expect.objectContaining({
        params: {
          role: 'teacher',
          branchId: 'b1',
          isActive: true,
          page: 2,
          limit: 100,
        },
      }),
    );
  });

  it('includes every session page in the printable learner report', async () => {
    vi.mocked(axiosInstance.get)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            data: [{ id: 'd1' }],
            meta: { page: 1, limit: 100, total: 101, totalPages: 2 },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            data: [{ id: 'd2' }],
            meta: { page: 2, limit: 100, total: 101, totalPages: 2 },
          },
        },
      });
    await expect(fetchDrivingSessionsForReport('e1')).resolves.toEqual([
      { id: 'd1' },
      { id: 'd2' },
    ]);
    expect(axiosInstance.get).toHaveBeenNthCalledWith(
      2,
      '/driving-sessions',
      expect.objectContaining({
        params: expect.objectContaining({
          enrollment_id: 'e1',
          page: 2,
          limit: 100,
        }),
      }),
    );
  });
});
