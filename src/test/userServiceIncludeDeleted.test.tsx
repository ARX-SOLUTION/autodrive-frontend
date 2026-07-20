import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useUsersPage, useRestoreUser } from '@/services/userService';
import axiosInstance from '@/api/axiosInstance';
import { userKeys } from '@/lib/queryKeys';

// autodrive-cg9: owner-only "show deleted" toggle on UsersPage (managers).
// Pins the wire contract (include_deleted=true only when the toggle is on,
// PATCH /users/:id/restore) and the query-key requirement (toggling on
// must not serve the cached un-deleted list from a stale cache entry).

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
    limit: 100,
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

describe('useUsersPage includeDeleted (autodrive-cg9)', () => {
  it('sends include_deleted=true on the wire when the toggle is on', async () => {
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: emptyPage,
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(
      () =>
        useUsersPage('manager', 1, 100, {
          branchId: 'b1',
          includeDeleted: true,
        }),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/users',
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
      () => useUsersPage('manager', 1, 100, { branchId: 'b1' }),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const call = (axiosInstance.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(
      (call[1] as { params: Record<string, unknown> }).params.include_deleted,
    ).toBeUndefined();
  });

  it('caches includeDeleted true/false as separate query-cache entries', async () => {
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: emptyPage,
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = makeWrapper(queryClient);

    const { result: off } = renderHook(
      () => useUsersPage('manager', 1, 100, { branchId: 'b1' }),
      { wrapper },
    );
    await waitFor(() => expect(off.current.isSuccess).toBe(true));

    const { result: on } = renderHook(
      () =>
        useUsersPage('manager', 1, 100, {
          branchId: 'b1',
          includeDeleted: true,
        }),
      { wrapper },
    );
    await waitFor(() => expect(on.current.isSuccess).toBe(true));

    expect(queryClient.getQueryCache().getAll()).toHaveLength(2);
    expect(axiosInstance.get).toHaveBeenCalledTimes(2);
  });
});

describe('useRestoreUser (autodrive-cg9)', () => {
  it('PATCHes /users/:id/restore and invalidates the user list', async () => {
    (axiosInstance.patch as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(userKeys.detail('u1'), { id: 'u1' });

    const { result } = renderHook(() => useRestoreUser(), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate('u1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(axiosInstance.patch).toHaveBeenCalledWith('/users/u1/restore');
    expect(
      queryClient.getQueryState(userKeys.detail('u1'))?.isInvalidated,
    ).toBe(true);
  });
});
