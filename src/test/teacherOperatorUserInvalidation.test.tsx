import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect } from 'vitest';
import { useUpdateTeacher } from '@/services/teacherService';
import { useUpdateOperator } from '@/services/operatorService';
import { userKeys, teacherKeys, operatorKeys } from '@/lib/queryKeys';
import axiosInstance from '@/api/axiosInstance';

// autodrive-52v.2: useUpdateTeacher / useUpdateOperator only invalidated
// their own domain root (teacherKeys.all / operatorKeys.all). UserDetailPage
// (/users/:id, shared by every role incl. teacher/operator) reads via
// userKeys.detail(id) -- a root neither covered -- so an already-open detail
// tab kept showing the pre-edit name/phone for up to the 30s global
// staleTime after a save from TeachersPage/OperatorsPage.

vi.mock('@/api/axiosInstance', () => ({
  default: { patch: vi.fn() },
}));

const wrapperFor = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

describe('useUpdateTeacher / useUpdateOperator cache invalidation', () => {
  it('useUpdateTeacher invalidates both teacherKeys.all and userKeys.all', async () => {
    (axiosInstance.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 't1', name: 'Aziz' },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateTeacher(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ id: 't1', fullName: 'Aziz' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: teacherKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: userKeys.all });
  });

  it('useUpdateOperator invalidates both operatorKeys.all and userKeys.all', async () => {
    (axiosInstance.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 'o1', name: 'Malika' },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateOperator(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ id: 'o1', fullName: 'Malika' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: operatorKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: userKeys.all });
  });
});
