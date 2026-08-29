import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  studentsPageQueryOptions,
  useStudents,
  useStudentsPage,
  useRestoreStudent,
} from '@/services/studentService';
import axiosInstance from '@/api/axiosInstance';
import { studentKeys } from '@/lib/queryKeys';

// autodrive-cg9: owner-only "show deleted" toggle on StudentsPage. Pins the
// exact wire contract the backend is building to in parallel --
// include_deleted=true only when the toggle is on, and PATCH /students/:id/
// restore for the restore action -- plus the query-key requirement called
// out in the task (turning the toggle on must not silently serve the
// cached un-deleted list from a stale cache entry).

vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'owner', branch_id: 'b1' } }),
}));

const emptyPage = {
  data: [],
  meta: {
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

const makeWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('useStudentsPage includeDeleted (autodrive-cg9)', () => {
  it('normalizes page and list cache keys exactly like request filters', async () => {
    const rawPage = studentsPageQueryOptions({
      branchId: 'b1',
      search: '  Ali  ',
      dateFrom: new Date(2026, 6, 1, 8),
      sortBy: 'unsupported',
      includeDeleted: false,
    });
    const normalizedPage = studentsPageQueryOptions({
      branchId: 'b1',
      search: 'Ali',
      dateFrom: new Date(2026, 6, 1, 20),
    });
    expect(rawPage.queryKey).toEqual(normalizedPage.queryKey);

    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: emptyPage,
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const wrapper = makeWrapper(queryClient);

    const { result: rawList } = renderHook(
      () =>
        useStudents(undefined, 'b1', 1, 50, undefined, {
          search: '  Ali  ',
          dateFrom: new Date(2026, 6, 1, 8),
          sortBy: 'unsupported',
          includeDeleted: false,
        }),
      { wrapper },
    );
    await waitFor(() => expect(rawList.current.data).toEqual([]));

    const { result: normalizedList } = renderHook(
      () =>
        useStudents(undefined, 'b1', 1, 50, undefined, {
          search: 'Ali',
          dateFrom: new Date(2026, 6, 1, 20),
        }),
      { wrapper },
    );
    await waitFor(() => expect(normalizedList.current.data).toEqual([]));

    expect(queryClient.getQueryCache().getAll()).toHaveLength(1);
    expect(axiosInstance.get).toHaveBeenCalledTimes(1);
  });

  it('sends include_deleted=true on the wire when the toggle is on', async () => {
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: emptyPage,
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(
      () =>
        useStudentsPage(undefined, 'b1', 1, 50, undefined, {
          includeDeleted: true,
        }),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/students',
      expect.objectContaining({
        params: expect.objectContaining({ include_deleted: true }),
      }),
    );
  });

  it('omits include_deleted from the request when the toggle is off', async () => {
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: emptyPage,
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(
      () => useStudentsPage(undefined, 'b1', 1, 50, undefined, {}),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const call = (axiosInstance.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(
      (call[1] as { params: Record<string, unknown> }).params.include_deleted,
    ).toBeUndefined();
  });

  // The task's own warning: getting the query key wrong here silently
  // serves the cached un-deleted list when the toggle flips on. Proven by
  // seeding a live-only cache entry, then rendering with the toggle on --
  // a shared/stale key would resolve instantly from cache and never call
  // axios a second time.
  it('caches includeDeleted true/false as separate query-cache entries', async () => {
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: emptyPage,
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = makeWrapper(queryClient);

    const { result: off } = renderHook(
      () => useStudentsPage(undefined, 'b1', 1, 50, undefined, {}),
      { wrapper },
    );
    await waitFor(() => expect(off.current.isSuccess).toBe(true));

    const { result: on } = renderHook(
      () =>
        useStudentsPage(undefined, 'b1', 1, 50, undefined, {
          includeDeleted: true,
        }),
      { wrapper },
    );
    await waitFor(() => expect(on.current.isSuccess).toBe(true));

    expect(queryClient.getQueryCache().getAll()).toHaveLength(2);
    expect(axiosInstance.get).toHaveBeenCalledTimes(2);
  });
});

describe('useRestoreStudent (autodrive-cg9)', () => {
  it('PATCHes /students/:id/restore and invalidates the student list', async () => {
    (axiosInstance.patch as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(studentKeys.detail('s1'), { id: 's1' });

    const { result } = renderHook(() => useRestoreStudent(), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate('s1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(axiosInstance.patch).toHaveBeenCalledWith('/students/s1/restore');
    expect(
      queryClient.getQueryState(studentKeys.detail('s1'))?.isInvalidated,
    ).toBe(true);
  });
});
