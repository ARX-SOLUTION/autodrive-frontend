import { createElement, type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import { useGlobalSearch } from './searchService';

const access = vi.hoisted(() => ({ allowed: false }));

vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn() },
}));

vi.mock('@/hooks/useCan', () => ({
  useCan: () => access.allowed,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('global search access', () => {
  beforeEach(() => {
    access.allowed = false;
    vi.clearAllMocks();
  });

  it('does not request operational search without access', () => {
    const { result } = renderHook(() => useGlobalSearch('student'), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(axiosInstance.get).not.toHaveBeenCalled();
  });

  it('keeps operational search enabled for an allowed role', async () => {
    access.allowed = true;
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        success: true,
        data: { students: [], groups: [], staff: [] },
      },
    });

    renderHook(() => useGlobalSearch('student'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(axiosInstance.get).toHaveBeenCalledOnce());
    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/search',
      expect.objectContaining({ params: { q: 'student' } }),
    );
  });
});
