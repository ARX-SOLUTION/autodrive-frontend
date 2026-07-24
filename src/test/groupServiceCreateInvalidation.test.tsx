import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect } from 'vitest';
import { useCreateGroup } from '@/services/groupService';
import axiosInstance from '@/api/axiosInstance';
import { groupKeys } from '@/lib/queryKeys';

vi.mock('@/api/axiosInstance', () => ({
  default: { post: vi.fn() },
}));

vi.mock('@/lib/umami', () => ({ track: vi.fn() }));

// Regression test for autodrive-6cq.11.8: a group created elsewhere
// (GroupsPage) didn't show up in StudentModal's group selector until a full
// page reload. The original fix forced StudentModal to call refetch() on
// every open -- that forced fetch is now removed (it defeated groupService's
// 5-min staleTime on every single modal open). Freshness now comes from the
// cache instead: every group mutation invalidates groupKeys.all, whose root
// ['groups'] prefix-matches the list key StudentModal actually reads
// (groupKeys.list({...})), so the query refetches on its next mount. This
// proves the create-path invalidation really reaches a StudentModal-shaped
// list cache entry -- if it stops, the old bug is back.
describe('useCreateGroup cache invalidation', () => {
  it('invalidates a StudentModal-shaped groups list on success', async () => {
    (axiosInstance.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 'g1', name: 'New Group' },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    // The shape StudentModal's `useGroups()` produces (filters default to {},
    // only authBranchId comes from the JWT). Root-only invalidation must reach
    // this nested key, not just the bare ['groups'] root.
    const studentModalListKey = groupKeys.list({ authBranchId: 'b1' });
    queryClient.setQueryData(studentModalListKey, []);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateGroup(), { wrapper });

    result.current.mutate({
      name: 'New Group',
      branchId: 'b1',
      courseType: 'tezkor',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryState(studentModalListKey)?.isInvalidated).toBe(
      true,
    );
  });
});
