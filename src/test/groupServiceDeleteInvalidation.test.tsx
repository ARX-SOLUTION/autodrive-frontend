import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect } from 'vitest';
import { useDeleteGroup } from '@/services/groupService';
import axiosInstance from '@/api/axiosInstance';

vi.mock('@/api/axiosInstance', () => ({
  default: { delete: vi.fn() },
}));

// Regression test for autodrive-f9u.11: useDeleteGroup only invalidated
// ['groups']/['groups-overview']. The backend nulls out groupId on every
// enrolled student in the same transaction when a group is deleted, but
// ['students']/['student'] were never invalidated -- a cached student
// list/detail view kept showing the deleted group.
describe('useDeleteGroup cache invalidation', () => {
  it('invalidates groups, groups-overview, students, and student on success', async () => {
    (axiosInstance.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDeleteGroup(), { wrapper });

    result.current.mutate('group-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (call) => (call[0] as { queryKey: unknown[] })?.queryKey?.[0],
    );
    expect(invalidatedKeys).toEqual(
      expect.arrayContaining([
        'groups',
        'groups-overview',
        'students',
        'student',
      ]),
    );
  });
});
