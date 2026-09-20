import type { PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import {
  expenseBreakdownQueryOptions,
  teacherAnalyticsQueryOptions,
  useTeacherAnalytics,
} from '@/services/dashboardService';

vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn() },
}));

const teacherAnalytics = {
  active_groups: 6,
  total_students: 15,
  result_stats: { oqimoqda: 5, topshirdi: 4, yiqildi: 3 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('dashboard query options', () => {
  it('reuses loader-prefetched teacher analytics without a duplicate request', async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: { data: teacherAnalytics },
    });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 30_000 },
      },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    await queryClient.ensureQueryData(teacherAnalyticsQueryOptions());
    const { result } = renderHook(() => useTeacherAnalytics(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(teacherAnalytics);
    expect(axiosInstance.get).toHaveBeenCalledTimes(1);
    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/dashboard/teacher-analytics',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('requests the expense breakdown with the dashboard branch and date window', async () => {
    const breakdown = {
      from: '2026-09-01',
      to: '2026-09-15',
      total: '150.00',
      company_wide: { total: '30.00' },
      by_branch: [],
      by_category: [],
    };
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: { success: true, data: breakdown },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const result = await queryClient.fetchQuery(
      expenseBreakdownQueryOptions({
        branchId: 'branch-a',
        from: '2026-09-01',
        to: '2026-09-15',
      }),
    );

    expect(result).toEqual(breakdown);
    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/dashboard/expense-breakdown',
      expect.objectContaining({
        params: {
          branch_id: 'branch-a',
          from: '2026-09-01',
          to: '2026-09-15',
        },
        signal: expect.any(AbortSignal),
      }),
    );
  });
});
