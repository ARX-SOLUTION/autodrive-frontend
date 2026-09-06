import type { PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import * as expenseService from '@/services/expenseService';
import {
  expenseDetailQueryOptions,
  expensesPageQueryOptions,
  useCancelExpense,
  useCreateExpensePayment,
  useExpenseBranchOptions,
  useExpense,
  useExpenseHistory,
  useExpensesPage,
  useUpdateExpense,
  toExpenseQueryParams,
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

type TriageCounts = {
  pending_total: number;
  due_today: number;
  due_within_three_days: number;
  overdue_1_7: number;
  overdue_8_30: number;
  overdue_31_plus: number;
  created_yesterday: number;
};

type TriageServiceContract = {
  fetchExpenseTriageCounts?: (
    filters: { branchId?: string; scope?: 'company' },
    signal?: AbortSignal,
  ) => Promise<TriageCounts>;
  expenseTriageCountsQueryOptions?: (
    filters: { branchId?: string; scope?: 'company' },
    enabled?: boolean,
    businessDay?: string,
  ) => { queryKey: readonly unknown[]; enabled?: boolean };
  useExpenseTriageCounts?: (
    filters: { branchId?: string; scope?: 'company' },
    enabled?: boolean,
    businessDay?: string,
  ) => { fetchStatus: string };
};

const triageService = expenseService as typeof expenseService &
  TriageServiceContract;

describe('expense triage API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setAuth('token', {
      id: 'owner-1',
      email: 'owner@example.com',
      role: 'owner',
      company_id: 'company-1',
    });
  });

  it('serializes overdue attention without a conflicting status', () => {
    expect(
      toExpenseQueryParams({
        attention: 'overdue',
        status: 'planned',
        branchId: 'branch-1',
      } as Parameters<typeof toExpenseQueryParams>[0] & {
        attention: 'overdue';
      }),
    ).toMatchObject({
      attention: 'overdue',
      branch_id: 'branch-1',
      status: undefined,
    });
  });

  it('requests triage counts with scope params and parses the item envelope', async () => {
    expect(triageService.fetchExpenseTriageCounts).toBeTypeOf('function');
    if (!triageService.fetchExpenseTriageCounts) return;

    const counts: TriageCounts = {
      pending_total: 12,
      due_today: 2,
      due_within_three_days: 3,
      overdue_1_7: 4,
      overdue_8_30: 5,
      overdue_31_plus: 6,
      created_yesterday: 7,
    };
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: { success: true, data: counts },
    });
    const controller = new AbortController();

    await expect(
      triageService.fetchExpenseTriageCounts(
        { scope: 'company' },
        controller.signal,
      ),
    ).resolves.toEqual(counts);
    expect(axiosInstance.get).toHaveBeenCalledWith('/expenses/triage-counts', {
      params: { branch_id: undefined, scope: 'company' },
      signal: controller.signal,
    });
  });

  it('keeps triage keys distinct across tenant, selected scope, and JWT branch', () => {
    expect(triageService.expenseTriageCountsQueryOptions).toBeTypeOf(
      'function',
    );
    if (!triageService.expenseTriageCountsQueryOptions) return;

    const companyScope = triageService.expenseTriageCountsQueryOptions({
      scope: 'company',
    }).queryKey;
    const selectedBranch = triageService.expenseTriageCountsQueryOptions({
      branchId: 'branch-2',
    }).queryKey;

    useAuthStore.getState().setAuth('token', {
      id: 'manager-1',
      email: 'manager@example.com',
      role: 'manager',
      company_id: 'company-2',
      branch_id: 'branch-3',
    });
    const managerBranch = triageService.expenseTriageCountsQueryOptions({
      branchId: 'branch-3',
    }).queryKey;

    expect(companyScope).not.toEqual(selectedBranch);
    expect(selectedBranch).not.toEqual(managerBranch);
    expect(companyScope.at(-1)).toMatchObject({
      companyId: 'company-1',
      branchId: undefined,
      jwtBranchId: undefined,
      scope: 'company',
    });
    expect(managerBranch.at(-1)).toMatchObject({
      companyId: 'company-2',
      branchId: 'branch-3',
      jwtBranchId: 'branch-3',
      scope: undefined,
    });
  });

  it('keys triage counts by business day without adding it to request params', async () => {
    expect(triageService.expenseTriageCountsQueryOptions).toBeTypeOf(
      'function',
    );
    if (!triageService.expenseTriageCountsQueryOptions) return;

    const firstDay = triageService.expenseTriageCountsQueryOptions(
      { branchId: 'branch-1' },
      true,
      '2026-09-01',
    ).queryKey;
    const secondDay = triageService.expenseTriageCountsQueryOptions(
      { branchId: 'branch-1' },
      true,
      '2026-09-02',
    ).queryKey;

    expect(firstDay).not.toEqual(secondDay);
    expect(firstDay.at(-1)).toMatchObject({ businessDay: '2026-09-01' });
    expect(secondDay.at(-1)).toMatchObject({ businessDay: '2026-09-02' });

    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: {
        data: {
          pending_total: 0,
          due_today: 0,
          due_within_three_days: 0,
          overdue_1_7: 0,
          overdue_8_30: 0,
          overdue_31_plus: 0,
          created_yesterday: 0,
        },
      },
    });
    await triageService.fetchExpenseTriageCounts?.({ branchId: 'branch-1' });
    expect(axiosInstance.get).toHaveBeenCalledWith('/expenses/triage-counts', {
      params: { branch_id: 'branch-1', scope: undefined },
      signal: undefined,
    });
  });

  it('gates triage counts by capability, explicit enabled state, and manager JWT branch', () => {
    expect(triageService.useExpenseTriageCounts).toBeTypeOf('function');
    if (!triageService.useExpenseTriageCounts) return;

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    useAuthStore.getState().setAuth('token', {
      id: 'dev-1',
      email: 'dev@example.com',
      role: 'dev',
      company_id: 'company-1',
    });
    const devQuery = renderHook(
      () => triageService.useExpenseTriageCounts!({}, true),
      { wrapper: makeWrapper(queryClient) },
    );
    expect(devQuery.result.current.fetchStatus).toBe('idle');
    devQuery.unmount();

    act(() =>
      useAuthStore.getState().setAuth('token', {
        id: 'owner-1',
        email: 'owner@example.com',
        role: 'owner',
        company_id: 'company-1',
      }),
    );
    const disabledOwnerQuery = renderHook(
      () => triageService.useExpenseTriageCounts!({}, false),
      { wrapper: makeWrapper(queryClient) },
    );
    expect(disabledOwnerQuery.result.current.fetchStatus).toBe('idle');
    disabledOwnerQuery.unmount();

    act(() =>
      useAuthStore.getState().setAuth('token', {
        id: 'manager-1',
        email: 'manager@example.com',
        role: 'manager',
        company_id: 'company-1',
        branch_id: null,
      }),
    );
    const unscopedManagerQuery = renderHook(
      () => triageService.useExpenseTriageCounts!({}, true),
      { wrapper: makeWrapper(queryClient) },
    );
    const unscopedManagerList = renderHook(() => useExpensesPage({}), {
      wrapper: makeWrapper(queryClient),
    });
    expect(unscopedManagerQuery.result.current.fetchStatus).toBe('idle');
    expect(unscopedManagerList.result.current.fetchStatus).toBe('idle');
    expect(axiosInstance.get).not.toHaveBeenCalled();
  });
});
