import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  groupsListQueryOptions,
  useGroups,
  useRestoreGroup,
} from '@/services/groupService';
import axiosInstance from '@/api/axiosInstance';
import { groupKeys, studentKeys } from '@/lib/queryKeys';

// autodrive-cg9: owner-only "show deleted" toggle on GroupsPage. Pins the
// wire contract (include_deleted=true only when the toggle is on, PATCH
// /groups/:id/restore) and the query-key requirement (toggling on must not
// serve the cached un-deleted list from a stale cache entry).

vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'owner', branch_id: 'b1' } }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const makeWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('useGroups includeDeleted (autodrive-cg9)', () => {
  it('normalizes list cache keys exactly like request filters', () => {
    const raw = groupsListQueryOptions({
      authBranchId: 'b1',
      branchId: '',
      search: '  Registon  ',
      courseType: 'unsupported',
      includeDeleted: false,
    });
    const normalized = groupsListQueryOptions({
      authBranchId: 'b1',
      search: 'Registon',
    });

    expect(raw.queryKey).toEqual(normalized.queryKey);
  });

  it('sends include_deleted=true on the wire when the toggle is on', async () => {
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: [] },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(
      () =>
        useGroups({
          branchId: 'b1',
          search: '  Registon  ',
          includeDeleted: true,
        }),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/groups',
      expect.objectContaining({
        params: expect.objectContaining({
          search: 'Registon',
          include_deleted: true,
        }),
      }),
    );
  });

  it('omits include_deleted from the request when the toggle is off', async () => {
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: [] },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useGroups({ branchId: 'b1' }), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const call = (axiosInstance.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(
      (call[1] as { params: Record<string, unknown> }).params.include_deleted,
    ).toBeUndefined();
  });

  it('caches includeDeleted true/false as separate query-cache entries', async () => {
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: [] },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = makeWrapper(queryClient);

    const { result: off } = renderHook(() => useGroups({ branchId: 'b1' }), {
      wrapper,
    });
    await waitFor(() => expect(off.current.isSuccess).toBe(true));

    const { result: on } = renderHook(
      () => useGroups({ branchId: 'b1', includeDeleted: true }),
      { wrapper },
    );
    await waitFor(() => expect(on.current.isSuccess).toBe(true));

    expect(queryClient.getQueryCache().getAll()).toHaveLength(2);
    expect(axiosInstance.get).toHaveBeenCalledTimes(2);
  });
});

describe('useRestoreGroup (autodrive-cg9)', () => {
  it('PATCHes /groups/:id/restore and invalidates the group list', async () => {
    (axiosInstance.patch as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(groupKeys.overview({ branchId: 'b1' }), []);

    const { result } = renderHook(() => useRestoreGroup(), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate('g1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(axiosInstance.patch).toHaveBeenCalledWith('/groups/g1/restore');
    expect(
      queryClient.getQueryState(groupKeys.overview({ branchId: 'b1' }))
        ?.isInvalidated,
    ).toBe(true);
  });

  // Restore does NOT un-null the groupId that delete cleared on each
  // enrolled student (see common.confirm_restore_desc) -- so unlike
  // useDeleteGroup, it must not invalidate studentKeys: there is nothing
  // student-side that actually changed.
  it('does not invalidate studentKeys (restore never touches student groupId)', async () => {
    (axiosInstance.patch as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(studentKeys.detail('s1'), { id: 's1' });

    const { result } = renderHook(() => useRestoreGroup(), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate('g1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(
      queryClient.getQueryState(studentKeys.detail('s1'))?.isInvalidated,
    ).toBeFalsy();
  });
});
