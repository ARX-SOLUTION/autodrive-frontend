import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  usePermissionQuery,
  permissionForReadQuery,
} from './usePermissionQuery';

const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

describe('permission read queries', () => {
  it('does not fetch a list for a write-only user', async () => {
    useAuthStore.setState({
      user: {
        id: 'writer',
        email: 'w@example.com',
        role: 'operator',
        branch_ids: ['a'],
        permissions: [
          { permission: 'students.create', scope: 'branch', branch_id: 'a' },
        ],
      },
      activeBranchId: 'a',
    });
    const queryFn = vi.fn(async () => ['private record']);
    const { result } = renderHook(
      () => usePermissionQuery({ queryKey: ['students', 'list'], queryFn }),
      { wrapper: makeWrapper() },
    );
    expect(result.current.fetchStatus).toBe('idle');
    expect(queryFn).not.toHaveBeenCalled();
    useAuthStore.getState().setUser({
      ...useAuthStore.getState().user!,
      access_version: 2,
      permissions: [
        { permission: 'students.read', scope: 'branch', branch_id: 'a' },
      ],
    });
    await waitFor(() =>
      expect(result.current.data).toEqual(['private record']),
    );
  });
  it('keeps another feature lookup disabled without its own read grant', () => {
    expect(permissionForReadQuery(['teachers', 'list'])).toBe('staff.read');
    expect(
      permissionForReadQuery(['vehicle-inspections', 'scope', 'defects']),
    ).toBe('vehicle_defects.read');
    expect(permissionForReadQuery(['school-tests', 'assignments'])).toBe(
      'test_assignments.read',
    );
    expect(
      permissionForReadQuery(['users', 'detail', 'id', 'access']),
    ).toBeUndefined();
  });
});
