import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useLessons, useLessonById } from '@/services/attendanceService';
import { useAuthStore } from '@/store/authStore';
import axiosInstance from '@/api/axiosInstance';
import { User } from '@/types/user';
import { Lesson } from '@/types/attendance';

vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn() },
}));

const user: User = {
  id: 'u1',
  email: 'o@x.com',
  role: 'owner',
};

const lesson: Lesson = {
  id: 'l1',
  title: 'Theory 101',
  date: '2026-07-10T09:00:00.000Z',
  lesson_type: 'theory',
  group_id: 'g1',
  branch_id: 'b1',
  created_by_id: 'u1',
  created_at: '2026-07-01T00:00:00.000Z',
  attendance: [],
};

describe('useLessons', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().setAuth('token', user);
  });

  it('unwraps the real {success, data:{data,total,page,limit}} /lessons envelope', async () => {
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        success: true,
        data: { data: [lesson], total: 1, page: 1, limit: 50 },
      },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useLessons(1, 50), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].id).toBe('l1');
  });

  // Regression test for autodrive-6cq.5.71: parseListResponse's fallback
  // has no branch for a flat `total` sibling, so it fell back to
  // data.length (this page's row count) instead of the backend's real
  // cross-page total, hiding lessons on page 2+.
  it('reports the true cross-page total, not just this page row count', async () => {
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        success: true,
        data: { data: [lesson], total: 5, page: 2, limit: 1 },
      },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useLessons(2, 1), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.total).toBe(5);
  });
});

// Regression test for autodrive-6cq.5.17: useLessonById used to
// `.catch(() => null)`, so a real backend failure resolved as a
// successful "not found" instead of surfacing isError.
describe('useLessonById', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().setAuth('token', user);
  });

  it('surfaces isError instead of swallowing the request failure as null', async () => {
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('network down'),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useLessonById({ id: 'l1' }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
