import type { PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import {
  expenseDetailQueryOptions,
  expensesPageQueryOptions,
  useCancelExpense,
  useCreateExpensePayment,
  useExpenseBranchOptions,
  useExpense,
  useExpenseHistory,
  useUpdateExpense,
} from '@/services/expenseService';
import { dashboardKeys, expenseKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/store/authStore';

vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const makeWrapper =
  (queryClient: QueryClient) =>
  ({ children }: PropsWithChildren) => {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

describe('useExpense capability gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setAuth('token', {
      id: 'dev-1',
      email: 'dev@example.com',
      role: 'dev',
    });
  });

  it('does not request an expense for a direct dev session', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const expenseQuery = renderHook(() => useExpense('expense-1'), {
      wrapper: makeWrapper(queryClient),
    });
    const historyQuery = renderHook(() => useExpenseHistory('expense-1'), {
      wrapper: makeWrapper(queryClient),
    });

    expect(expenseQuery.result.current.fetchStatus).toBe('idle');
    expect(historyQuery.result.current.fetchStatus).toBe('idle');
    expect(axiosInstance.get).not.toHaveBeenCalled();
  });

  it('keeps manager history/options disabled and keys detail/list by JWT branch', () => {
    useAuthStore.getState().setAuth('token', {
      id: 'manager-1',
      email: 'manager@example.com',
      role: 'manager',
      company_id: 'company-1',
      branch_id: 'branch-1',
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const historyQuery = renderHook(() => useExpenseHistory('expense-1'), {
      wrapper: makeWrapper(queryClient),
    });
    const branchOptionsQuery = renderHook(() => useExpenseBranchOptions(), {
      wrapper: makeWrapper(queryClient),
    });

    expect(historyQuery.result.current.fetchStatus).toBe('idle');
    expect(branchOptionsQuery.result.current.fetchStatus).toBe('idle');
    expect(axiosInstance.get).not.toHaveBeenCalled();

    const detailKey = expenseDetailQueryOptions('expense-1').queryKey.at(-1);
    expect(detailKey).toEqual({
      companyId: 'company-1',
      branchId: undefined,
      jwtBranchId: 'branch-1',
    });
    const listKey = expensesPageQueryOptions({ branchId: 'branch-1' }).queryKey;
    expect(listKey[2]).toMatchObject({ jwtBranchId: 'branch-1' });
  });

  it('invalidates expense detail/list and finance summary after a payment', async () => {
    useAuthStore.getState().setAuth('token', {
      id: 'owner-1',
      email: 'owner@example.com',
      role: 'owner',
      company_id: 'company-1',
    });
    vi.mocked(axiosInstance.post).mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 'payment-1',
          expense_id: 'expense-1',
          company_id: 'company-1',
          branch_id: null,
          amount: '10.00',
          payment_method: 'naqd',
          date: '2026-08-31',
          note: null,
          recorded_by_id: 'owner-1',
          idempotency_key: 'payment-key-1',
          voided_at: null,
          created_at: '2026-08-31T00:00:00.000Z',
        },
      },
    });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateExpensePayment('expense-1'), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate({
      amount: '10.00',
      payment_method: 'naqd',
      date: '2026-08-31',
      note: null,
      idempotency_key: 'payment-key-1',
      expected_version: 1,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: expenseKeys.detail('expense-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: expenseKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: dashboardKeys.financeSummary(),
    });
  });

  it('refreshes expense state after an update conflict', async () => {
    useAuthStore.getState().setAuth('token', {
      id: 'manager-1',
      email: 'manager@example.com',
      role: 'manager',
      company_id: 'company-1',
      branch_id: 'branch-1',
    });
    vi.mocked(axiosInstance.patch).mockRejectedValue({
      response: { status: 409 },
    });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateExpense(), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate({
      id: 'expense-1',
      title: 'Updated title',
      expected_version: 3,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: expenseKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: expenseKeys.detail('expense-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: dashboardKeys.financeSummary(),
    });
  });

  it('invalidates list/detail/history/summary after a lifecycle mutation', async () => {
    useAuthStore.getState().setAuth('token', {
      id: 'owner-1',
      email: 'owner@example.com',
      role: 'owner',
      company_id: 'company-1',
    });
    vi.mocked(axiosInstance.patch).mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 'expense-1',
          version: 2,
        },
      },
    });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCancelExpense('expense-1'), {
      wrapper: makeWrapper(queryClient),
    });

    result.current.mutate({
      reason: 'Contract ended',
      expected_version: 1,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(axiosInstance.patch).toHaveBeenCalledWith(
      '/expenses/expense-1/cancel',
      { reason: 'Contract ended', expected_version: 1 },
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: expenseKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: expenseKeys.detail('expense-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [...expenseKeys.detail('expense-1'), 'history'],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: dashboardKeys.financeSummary(),
    });
  });
});
