import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAuditLogs } from '@/services/auditService';
import { useAuthStore } from '@/store/authStore';
import axiosInstance from '@/api/axiosInstance';
import { User } from '@/types/user';

vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn() },
}));

const owner: User = {
  id: 'u1',
  email: 'o@x.com',
  role: 'owner',
  branch_id: 'b1',
};

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Regression test for autodrive-bpf: DashboardPage fired useAuditLogs even for
// roles whose UI hides the widget (manager: viewAudit is OWNERS-only). The hook
// now honors an `enabled` flag so callers gate firing beyond the role check.
describe('useAuditLogs enabled gating', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().setAuth('token', owner);
    vi.clearAllMocks();
  });

  it('does not fire when enabled:false, even for an owner', () => {
    const { result } = renderHook(
      () => useAuditLogs({ page: 1, limit: 6, enabled: false }),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(axiosInstance.get).not.toHaveBeenCalled();
  });

  it('fires for an owner when enabled is omitted', async () => {
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true, data: [], meta: { total: 0 } },
    });

    renderHook(() => useAuditLogs({ page: 1, limit: 6 }), { wrapper });

    await waitFor(() => expect(axiosInstance.get).toHaveBeenCalled());
  });
});
