import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useLessons } from '@/services/attendanceService';
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
});
