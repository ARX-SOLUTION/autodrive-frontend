import type { PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import {
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
});
