import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect } from 'vitest';
import {
  useCreateTeacher,
  useDeleteTeacher,
  useTeachers,
  useUpdateTeacher,
} from '@/services/teacherService';
import {
  useCreateOperator,
  useDeleteOperator,
  useOperators,
  useUpdateOperator,
} from '@/services/operatorService';
import { useUsers } from '@/services/userService';
import { userKeys, teacherKeys, operatorKeys } from '@/lib/queryKeys';
import axiosInstance from '@/api/axiosInstance';

// autodrive-52v.2: useUpdateTeacher / useUpdateOperator only invalidated
// their own domain root (teacherKeys.all / operatorKeys.all). UserDetailPage
// (/users/:id, shared by every role incl. teacher/operator) reads via
// userKeys.detail(id) -- a root neither covered -- so an already-open detail
// tab kept showing the pre-edit name/phone for up to the 30s global
// staleTime after a save from TeachersPage/OperatorsPage.

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ user: { branch_id: 'b1' } }),
}));

vi.mock('@/hooks/useCan', () => ({ useIsCrossTenant: () => false }));

const wrapperFor = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

describe('staff lookup and cache invalidation', () => {
  it('requests the first 100 teachers, operators and users for lookups', async () => {
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: [] },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(
      () => ({
        teachers: useTeachers(),
        operators: useOperators(),
        users: useUsers(),
      }),
      { wrapper: wrapperFor(queryClient) },
    );

    await waitFor(() => {
      expect(result.current.teachers.isSuccess).toBe(true);
      expect(result.current.operators.isSuccess).toBe(true);
      expect(result.current.users.isSuccess).toBe(true);
    });

    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({
        params: expect.objectContaining({
          role: 'teacher',
          page: 1,
          limit: 100,
        }),
      }),
    );
    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({
        params: expect.objectContaining({
          role: 'operator',
          page: 1,
          limit: 100,
        }),
      }),
    );
    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({
        params: expect.objectContaining({ page: 1, limit: 100 }),
      }),
    );
  });

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

  it('teacher create and delete invalidate both teacher and user roots', async () => {
    (axiosInstance.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { id: 't1' } },
    });
    (axiosInstance.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(
      () => ({ create: useCreateTeacher(), remove: useDeleteTeacher() }),
      { wrapper: wrapperFor(queryClient) },
    );

    result.current.create.mutate({
      fullName: 'Aziz',
      phone: '+998901234567',
      specialization: 'THEORY',
    });
    await waitFor(() => expect(result.current.create.isSuccess).toBe(true));
    result.current.remove.mutate('t1');
    await waitFor(() => expect(result.current.remove.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: teacherKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: userKeys.all });
  });

  it('operator create and delete invalidate both operator and user roots', async () => {
    (axiosInstance.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { id: 'o1' } },
    });
    (axiosInstance.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(
      () => ({ create: useCreateOperator(), remove: useDeleteOperator() }),
      { wrapper: wrapperFor(queryClient) },
    );

    result.current.create.mutate({
      fullName: 'Malika',
      phone: '+998901234568',
    });
    await waitFor(() => expect(result.current.create.isSuccess).toBe(true));
    result.current.remove.mutate('o1');
    await waitFor(() => expect(result.current.remove.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: operatorKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: userKeys.all });
  });
});
