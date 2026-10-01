import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import axios from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { useWriteOptions } from './useWriteOptions';

vi.mock('@/api/axiosInstance', () => ({ default: { get: vi.fn() } }));

describe('minimal write options', () => {
  it('loads only the write-purpose endpoint and offers only authorized branches', async () => {
    useAuthStore.setState({
      user: {
        id: 'writer',
        email: 'w@example.com',
        role: 'operator',
        branch_ids: ['a', 'b'],
        permissions: [
          { permission: 'students.create', scope: 'branch', branch_id: 'a' },
        ],
      },
      activeBranchId: 'a',
    });
    vi.mocked(axios.get).mockImplementation(async (url) => ({
      data:
        url === '/permissions'
          ? {
              branches: [
                { id: 'a', name: 'A' },
                { id: 'b', name: 'B' },
              ],
              permissions: [],
              templates: {},
              delegations: [],
              own_resources: [],
            }
          : {
              courses: [{ id: 'course', name: 'Course', branch_id: 'a' }],
              branches: [{ id: 'a', name: 'A' }],
            },
    }));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => useWriteOptions('students', 'create', 'a'),
      { wrapper },
    );
    await waitFor(() =>
      expect(result.current.data?.courses?.[0].id).toBe('course'),
    );
    expect(result.current.branches).toEqual([{ id: 'a', name: 'A' }]);
    expect(axios.get).toHaveBeenCalledWith(
      '/permissions/options',
      expect.objectContaining({
        params: { resource: 'students', action: 'create', branchId: 'a' },
      }),
    );
    expect(
      vi
        .mocked(axios.get)
        .mock.calls.map(([url]) => url)
        .sort(),
    ).toEqual(['/permissions', '/permissions/options']);
  });
  it('uses the sole authorized catalogue branch for an owner without memberships', async () => {
    useAuthStore.setState({
      user: {
        id: 'owner',
        email: 'owner@example.com',
        role: 'owner',
        permissions: [],
      },
      activeBranchId: null,
    });
    vi.mocked(axios.get).mockImplementation(async (url) => ({
      data:
        url === '/permissions'
          ? {
              branches: [{ id: 'a', name: 'A' }],
              permissions: [],
              templates: {},
              delegations: [],
              own_resources: [],
            }
          : {
              students: [
                {
                  id: 'student-a',
                  first_name: 'A',
                  last_name: 'B',
                  branch_id: 'a',
                },
              ],
            },
    }));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useWriteOptions('payments', 'create'), {
      wrapper,
    });
    await waitFor(() =>
      expect(result.current.data?.students?.[0].id).toBe('student-a'),
    );
  });
  it('requires a branch choice for multiple branches and clears old results when switching', async () => {
    useAuthStore.setState({
      user: {
        id: 'owner',
        email: 'owner@example.com',
        role: 'owner',
        permissions: [],
      },
      activeBranchId: null,
    });
    vi.mocked(axios.get).mockClear();
    vi.mocked(axios.get).mockImplementation(async (url, config) => ({
      data:
        url === '/permissions'
          ? {
              branches: [
                { id: 'a', name: 'A' },
                { id: 'b', name: 'B' },
              ],
              permissions: [],
              templates: {},
              delegations: [],
              own_resources: [],
            }
          : {
              vehicles: [
                {
                  id: config?.params.branchId,
                  plate_number: 'TEST',
                  branch_id: config?.params.branchId,
                },
              ],
            },
    }));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(
      ({ branch }: { branch?: string }) =>
        useWriteOptions('fuel', 'create', branch),
      { initialProps: { branch: undefined } as { branch?: string }, wrapper },
    );
    await waitFor(() => expect(result.current.branches).toHaveLength(2));
    expect(
      vi
        .mocked(axios.get)
        .mock.calls.some(([url]) => url === '/permissions/options'),
    ).toBe(false);
    rerender({ branch: 'a' });
    await waitFor(() =>
      expect(result.current.data?.vehicles?.[0].id).toBe('a'),
    );
    rerender({ branch: 'b' });
    expect(result.current.data?.vehicles?.[0].id).not.toBe('a');
    await waitFor(() =>
      expect(result.current.data?.vehicles?.[0].id).toBe('b'),
    );
  });
});
