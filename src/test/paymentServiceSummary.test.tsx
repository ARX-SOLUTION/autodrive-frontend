import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { usePaymentSummary } from '@/services/paymentService';
import { useAuthStore } from '@/store/authStore';
import axiosInstance from '@/api/axiosInstance';
import { User } from '@/types/user';

vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn() },
}));

const user: User = {
  id: 'u1',
  email: 'o@x.com',
  role: 'owner',
  branch_id: 'b1',
};

// Regression test for autodrive-6cq.5.52: PaymentsPage used to fetch every
// matching page via fetchAllPayments and sum client-side on every
// filter/search change. usePaymentSummary should hit the backend's single
// /payments/summary aggregate instead — exactly one request, filters
// (including search) forwarded.
describe('usePaymentSummary', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().setAuth('token', user);
  });

  it('issues a single /payments/summary request carrying the active filters', async () => {
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        success: true,
        data: {
          period_collected: 500000,
          period_payments_count: 3,
          period_debt: 25000,
        },
      },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => usePaymentSummary({ branchId: 'b1', search: 'ali' }, true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(axiosInstance.get).toHaveBeenCalledTimes(1);
    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/payments/summary',
      expect.objectContaining({
        params: expect.objectContaining({ branch_id: 'b1', search: 'ali' }),
      }),
    );
    expect(result.current.data?.period_payments_count).toBe(3);
  });
});
