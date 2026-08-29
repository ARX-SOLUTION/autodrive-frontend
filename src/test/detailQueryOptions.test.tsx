import type { PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import {
  studentDetailQueryOptions,
  useStudent,
} from '@/services/studentService';
import { groupDetailQueryOptions, useGroup } from '@/services/groupService';
import { courseDetailQueryOptions, useCourse } from '@/services/courseService';

vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('detail query options', () => {
  it('reuses route-loader data in matching detail hooks', async () => {
    vi.mocked(axiosInstance.get).mockImplementation(async (url) => ({
      data: {
        data: {
          id: String(url).split('/').at(-1),
          name: 'Detail',
        },
      },
    }));

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 30_000 },
      },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    await Promise.all([
      queryClient.ensureQueryData(studentDetailQueryOptions('student-1')),
      queryClient.ensureQueryData(groupDetailQueryOptions('group-1')),
      queryClient.ensureQueryData(courseDetailQueryOptions('course-1')),
    ]);

    const student = renderHook(() => useStudent('student-1'), { wrapper });
    const group = renderHook(() => useGroup('group-1'), { wrapper });
    const course = renderHook(() => useCourse('course-1'), { wrapper });

    await waitFor(() => {
      expect(student.result.current.isSuccess).toBe(true);
      expect(group.result.current.isSuccess).toBe(true);
      expect(course.result.current.isSuccess).toBe(true);
    });

    expect(axiosInstance.get).toHaveBeenCalledTimes(3);
    expect(student.result.current.data?.id).toBe('student-1');
    expect(group.result.current.data?.id).toBe('group-1');
    expect(course.result.current.data?.id).toBe('course-1');
  });
});
