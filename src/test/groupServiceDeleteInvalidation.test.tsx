import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect } from 'vitest';
import { useDeleteGroup } from '@/services/groupService';
import axiosInstance from '@/api/axiosInstance';
import { groupKeys, studentKeys } from '@/lib/queryKeys';

vi.mock('@/api/axiosInstance', () => ({
  default: { delete: vi.fn() },
}));

// Regression test for autodrive-f9u.11: useDeleteGroup only invalidated
// ['groups']/['groups-overview']. The backend nulls out groupId on every
// enrolled student in the same transaction when a group is deleted, but
// students weren't invalidated -- a cached student list/detail view kept
// showing the deleted group.
//
// Stage 2 (autodrive-6cq.8) nests groupKeys.overview/studentKeys.detail
// under the 'groups'/'students' roots, so a single root-only invalidation
// now prefix-matches both the base list AND the nested key -- seed cache
// entries at those nested shapes to prove the invalidation actually reaches
// them, not just the bare root.
describe('useDeleteGroup cache invalidation', () => {
  it('invalidates groups (incl. overview) and students (incl. detail) on success', async () => {
    (axiosInstance.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(groupKeys.overview({ branchId: 'b1' }), []);
    queryClient.setQueryData(studentKeys.detail('s1'), { id: 's1' });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDeleteGroup(), { wrapper });

    result.current.mutate('group-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(
      queryClient.getQueryState(groupKeys.overview({ branchId: 'b1' }))
        ?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(studentKeys.detail('s1'))?.isInvalidated,
    ).toBe(true);
  });
});
