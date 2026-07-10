import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useRestoreSession } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import axiosInstance from '@/api/axiosInstance';
import { User } from '@/types/user';

vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn() },
}));

const user: User = { id: 'u1', email: 'old@x.com', role: 'owner' };

describe('useRestoreSession', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    useAuthStore.getState().setAuth('stale-token', user);
    // Leftover tenant-scoped data from the session that's about to expire.
    queryClient.setQueryData(['students', 'branch-1'], [{ id: 's1' }]);
  });

  it('clears the query cache when /auth/me 401s, so the next login never sees stale tenant data', async () => {
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { status: 401 },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useRestoreSession(), { wrapper });

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
    // The prior tenant's cached data must not survive for the next login.
    // (The hook's own ['me'] observer is still mounted in this harness —
    // same as ProtectedRoute until the route swap unmounts it — so it
    // immediately rebuilds an empty stub for its own key; that stub never
    // carries data, so it renders nothing for anyone.)
    expect(queryClient.getQueryData(['students', 'branch-1'])).toBeUndefined();
    for (const query of queryClient.getQueryCache().getAll()) {
      expect(query.state.data).toBeUndefined();
    }
  });
});
