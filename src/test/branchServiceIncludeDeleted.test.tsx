import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useBranches, useRestoreBranch } from '@/services/branchService';
import axiosInstance from '@/api/axiosInstance';
import { branchKeys } from '@/lib/queryKeys';

// autodrive-cg9: owner-only "show deleted" toggle on BranchesPage. Pins the
// wire contract (include_deleted=true only when the toggle is on, PATCH
// /branches/:id/restore) and the query-key requirement (toggling on must
// not serve the cached un-deleted list from a stale cache entry).

vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn(), patch: vi.fn() },
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

describe('useBranches includeDeleted (autodrive-cg9)', () => {
  it('sends include_deleted=true on the wire when the toggle is on', async () => {
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: [] },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useBranches(true, true), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/branches',
      expect.objectContaining({
        params: expect.objectContaining({ include_deleted: true }),
      }),
    );
  });

  it('omits include_deleted from the request when the toggle is off (default)', async () => {
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: [] },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useBranches(), {
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

    const { result: off } = renderHook(() => useBranches(), { wrapper });
    await waitFor(() => expect(off.current.isSuccess).toBe(true));

    const { result: on } = renderHook(() => useBranches(true, true), {
      wrapper,
    });
    await waitFor(() => expect(on.current.isSuccess).toBe(true));

    expect(queryClient.getQueryCache().getAll()).toHaveLength(2);
    expect(axiosInstance.get).toHaveBeenCalledTimes(2);
  });
});

describe('useRestoreBranch (autodrive-cg9)', () => {
  it('PATCHes /branches/:id/restore and invalidates the branch list', async () => {
    (axiosInstance.patch as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(branchKeys.detail('br1'), { id: 'br1' });

    const { result } = renderHook(() => useRestoreBranch(), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate('br1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(axiosInstance.patch).toHaveBeenCalledWith('/branches/br1/restore');
    expect(
      queryClient.getQueryState(branchKeys.detail('br1'))?.isInvalidated,
    ).toBe(true);
  });
});
