import type { PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import { ApiContractError } from '@/lib/apiEnvelope';
import {
  fetchOverdueExpenseSweep,
  overdueExpenseSweepQueryOptions,
  useExpensesPage,
  useOverdueExpenseSweep,
} from '@/services/expenseService';
import { useAuthStore } from '@/store/authStore';
import type { Expense, ExpenseListFilters } from '@/types/expense';

vi.mock('@/api/axiosInstance', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const makeExpense = (id: string, overdueDays = 1): Expense => ({
  id,
  branch_id: 'branch-1',
  branch_name: 'Chilonzor',
  vehicle_id: null,
  vehicle_plate_number: null,
  created_by_id: 'owner-1',
  category: 'rent',
  title: `Expense ${id}`,
  amount: '100.00',
  expense_date: '2026-08-01',
  due_date: '2026-08-31',
  payee: null,
  note: null,
  paid_amount: '0.00',
  remaining_amount: '100.00',
  status: 'planned',
  reviewed_at: null,
  reviewed_by_id: null,
  version: 1,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
  overdue_days: overdueDays,
});

const pageResponse = (
  rows: Expense[],
  page: number,
  total: number,
  totalPages: number,
  limit = 100,
) => ({
  data: {
    data: rows,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  },
});

const makeWrapper = (queryClient: QueryClient) =>
  function QueryWrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(axiosInstance.get).mockReset();
  useAuthStore.getState().setAuth('token', {
    id: 'owner-1',
    email: 'owner@example.com',
    role: 'owner',
    company_id: 'company-1',
    branch_id: 'jwt-branch-1',
  });
});

describe('overdue expense sweep service', () => {
  it('aggregates captured pages in order with exact forced params and one signal', async () => {
    const first = Array.from({ length: 100 }, (_, index) =>
      makeExpense(`expense-${index + 1}`),
    );
    const second = Array.from({ length: 100 }, (_, index) =>
      makeExpense(`expense-${index + 101}`),
    );
    const third = [makeExpense('expense-201')];
    let releaseSecondPage: () => void = () => undefined;
    const secondPageGate = new Promise<void>((resolve) => {
      releaseSecondPage = resolve;
    });
    vi.mocked(axiosInstance.get)
      .mockResolvedValueOnce(pageResponse(first, 1, 201, 3))
      .mockImplementationOnce(async () => {
        await secondPageGate;
        return pageResponse(second, 2, 201, 3);
      })
      .mockResolvedValueOnce(pageResponse(third, 3, 201, 3));
    const signal = new AbortController().signal;
    const filters: ExpenseListFilters = {
      branchId: 'branch-2',
      scope: 'company',
      category: 'rent',
      status: 'paid',
      attention: 'overdue',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      page: 7,
      limit: 20,
    };

    const resultPromise = fetchOverdueExpenseSweep(filters, signal);
    await vi.waitFor(() => expect(axiosInstance.get).toHaveBeenCalledTimes(2));
    expect(axiosInstance.get).not.toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      expect.anything(),
    );
    releaseSecondPage();
    const result = await resultPromise;

    expect(result.map((expense) => expense.id)).toEqual(
      [...first, ...second, ...third].map((expense) => expense.id),
    );
    for (const [index, page] of [1, 2, 3].entries()) {
      expect(axiosInstance.get).toHaveBeenNthCalledWith(
        index + 1,
        '/expenses',
        {
          params: {
            branch_id: 'branch-2',
            scope: 'company',
            category: 'rent',
            status: undefined,
            attention: 'overdue',
            date_from: '2026-08-01',
            date_to: '2026-08-31',
            page,
            limit: 100,
          },
          signal,
        },
      );
    }
    expect(filters).toMatchObject({ status: 'paid', page: 7, limit: 20 });
  });

  it('stops after page one for an empty result', async () => {
    vi.mocked(axiosInstance.get).mockResolvedValueOnce(
      pageResponse([], 1, 0, 0),
    );

    await expect(fetchOverdueExpenseSweep({ page: 5 })).resolves.toEqual([]);
    expect(axiosInstance.get).toHaveBeenCalledOnce();
  });

  it('rejects the whole sweep when a later page fails', async () => {
    const first = Array.from({ length: 100 }, (_, index) =>
      makeExpense(`expense-${index + 1}`),
    );
    const failure = new Error('page failed');
    vi.mocked(axiosInstance.get)
      .mockResolvedValueOnce(pageResponse(first, 1, 101, 2))
      .mockRejectedValueOnce(failure);

    await expect(fetchOverdueExpenseSweep({})).rejects.toBe(failure);
  });

  it.each([
    ['wrong requested page', [pageResponse([makeExpense('one')], 2, 1, 1)]],
    [
      'wrong requested limit',
      [pageResponse([makeExpense('one')], 1, 1, 1, 20)],
    ],
    [
      'changed total',
      [
        pageResponse(
          Array.from({ length: 100 }, (_, index) =>
            makeExpense(`expense-${index + 1}`),
          ),
          1,
          101,
          2,
        ),
        pageResponse([makeExpense('expense-101')], 2, 102, 2),
      ],
    ],
    [
      'changed total pages',
      [
        pageResponse(
          Array.from({ length: 100 }, (_, index) =>
            makeExpense(`expense-${index + 1}`),
          ),
          1,
          101,
          2,
        ),
        pageResponse([makeExpense('expense-101')], 2, 101, 3),
      ],
    ],
    [
      'short non-final page with an oversized final page',
      [
        pageResponse(
          Array.from({ length: 99 }, (_, index) =>
            makeExpense(`expense-${index + 1}`),
          ),
          1,
          199,
          2,
        ),
        pageResponse(
          Array.from({ length: 100 }, (_, index) =>
            makeExpense(`expense-${index + 100}`),
          ),
          2,
          199,
          2,
        ),
      ],
    ],
    [
      'duplicate ID',
      [pageResponse([makeExpense('same'), makeExpense('same')], 1, 2, 1)],
    ],
    [
      'missing overdue days',
      [
        pageResponse(
          [{ ...makeExpense('one'), overdue_days: undefined }],
          1,
          1,
          1,
        ),
      ],
    ],
    ['zero overdue days', [pageResponse([makeExpense('one', 0)], 1, 1, 1)]],
    [
      'fractional overdue days',
      [pageResponse([makeExpense('one', 1.5)], 1, 1, 1)],
    ],
    [
      'non-finite pagination',
      [pageResponse([makeExpense('one')], 1, Number.POSITIVE_INFINITY, 1)],
    ],
    ['final row count mismatch', [pageResponse([makeExpense('one')], 1, 2, 1)]],
  ])('rejects contract drift: %s', async (_label, responses) => {
    for (const response of responses) {
      vi.mocked(axiosInstance.get).mockResolvedValueOnce(response);
    }

    await expect(fetchOverdueExpenseSweep({})).rejects.toBeInstanceOf(
      ApiContractError,
    );
  });

  it('keys by tenant, scope, retained filters, and business day but not list pagination/status', () => {
    const filters: ExpenseListFilters = {
      branchId: 'branch-2',
      scope: 'company',
      category: 'rent',
      status: 'paid',
      attention: 'overdue',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      page: 2,
      limit: 20,
    };
    const base = overdueExpenseSweepQueryOptions(
      filters,
      true,
      '2026-09-01',
    ).queryKey;
    const listOnlyChanges = overdueExpenseSweepQueryOptions(
      { ...filters, status: 'planned', page: 99, limit: 1 },
      true,
      '2026-09-01',
    ).queryKey;
    const nextDay = overdueExpenseSweepQueryOptions(
      filters,
      true,
      '2026-09-02',
    ).queryKey;
    const changedFilters = overdueExpenseSweepQueryOptions(
      { ...filters, category: 'vehicle', dateTo: '2026-09-01' },
      true,
      '2026-09-01',
    ).queryKey;
    const changedScope = overdueExpenseSweepQueryOptions(
      { ...filters, scope: undefined },
      true,
      '2026-09-01',
    ).queryKey;
    const changedBranch = overdueExpenseSweepQueryOptions(
      { ...filters, branchId: 'branch-3' },
      true,
      '2026-09-01',
    ).queryKey;

    expect(base).toEqual(listOnlyChanges);
    expect(base).not.toEqual(nextDay);
    expect(base).not.toEqual(changedFilters);
    expect(base).not.toEqual(changedScope);
    expect(base).not.toEqual(changedBranch);
    expect(base.at(-1)).toEqual({
      companyId: 'company-1',
      branchId: 'branch-2',
      jwtBranchId: 'jwt-branch-1',
      viewerRole: 'owner',
      scope: 'company',
      category: 'rent',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      attention: 'overdue',
      businessDay: '2026-09-01',
    });

    useAuthStore.getState().setAuth('token', {
      id: 'owner-2',
      email: 'owner-2@example.com',
      role: 'owner',
      company_id: 'company-2',
      branch_id: 'jwt-branch-1',
    });
    const changedTenant = overdueExpenseSweepQueryOptions(
      filters,
      true,
      '2026-09-01',
    ).queryKey;
    useAuthStore.getState().setAuth('token', {
      id: 'owner-1',
      email: 'owner@example.com',
      role: 'owner',
      company_id: 'company-1',
      branch_id: 'jwt-branch-2',
    });
    const changedJwtBranch = overdueExpenseSweepQueryOptions(
      filters,
      true,
      '2026-09-01',
    ).queryKey;

    expect(changedTenant).not.toEqual(base);
    expect(changedJwtBranch).not.toEqual(base);
  });
});

describe('overdue expense sweep viewer isolation', () => {
  it('separates owner and branchless-manager cache keys without keying by user ID', () => {
    useAuthStore.getState().setAuth('token', {
      id: 'owner-1',
      email: 'owner-1@example.com',
      role: 'owner',
      company_id: 'company-1',
      branch_id: null,
    });
    const ownerKey = overdueExpenseSweepQueryOptions(
      {},
      true,
      '2026-09-01',
    ).queryKey;
    useAuthStore.getState().setAuth('token', {
      id: 'owner-2',
      email: 'owner-2@example.com',
      role: 'owner',
      company_id: 'company-1',
      branch_id: null,
    });
    const otherOwnerKey = overdueExpenseSweepQueryOptions(
      {},
      true,
      '2026-09-01',
    ).queryKey;
    useAuthStore.getState().setAuth('token', {
      id: 'manager-1',
      email: 'manager@example.com',
      role: 'manager',
      company_id: 'company-1',
      branch_id: null,
    });
    const managerKey = overdueExpenseSweepQueryOptions(
      {},
      true,
      '2026-09-01',
    ).queryKey;

    expect(otherOwnerKey).toEqual(ownerKey);
    expect(managerKey).not.toEqual(ownerKey);
    expect(ownerKey.at(-1)).toMatchObject({ viewerRole: 'owner' });
    expect(managerKey.at(-1)).toMatchObject({ viewerRole: 'manager' });
  });

  it('does not disclose preseeded owner sweep data to a disabled branchless manager hook', () => {
    useAuthStore.getState().setAuth('token', {
      id: 'owner-1',
      email: 'owner@example.com',
      role: 'owner',
      company_id: 'company-1',
      branch_id: null,
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(
      overdueExpenseSweepQueryOptions({}, true, '2026-09-01').queryKey,
      [{ ...makeExpense('owner-expense'), overdue_days: 1 }],
    );
    act(() =>
      useAuthStore.getState().setAuth('token', {
        id: 'manager-1',
        email: 'manager@example.com',
        role: 'manager',
        company_id: 'company-1',
        branch_id: null,
      }),
    );

    const query = renderHook(
      () => useOverdueExpenseSweep({}, true, '2026-09-01'),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(query.result.current.fetchStatus).toBe('idle');
    expect(query.result.current.data).toBeUndefined();
    expect(axiosInstance.get).not.toHaveBeenCalled();
    query.unmount();
  });
});

describe('overdue expense sweep hook gating', () => {
  it.each(['owner', 'accountant', 'manager'] as const)(
    'allows a scoped %s with viewExpenses',
    async (role) => {
      act(() =>
        useAuthStore.getState().setAuth('token', {
          id: `${role}-1`,
          email: `${role}@example.com`,
          role,
          company_id: 'company-1',
          branch_id: 'branch-1',
        }),
      );
      vi.mocked(axiosInstance.get).mockResolvedValue(pageResponse([], 1, 0, 1));
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const query = renderHook(
        () =>
          useOverdueExpenseSweep({ branchId: 'branch-1' }, true, '2026-09-01'),
        { wrapper: makeWrapper(queryClient) },
      );

      await waitFor(() => expect(query.result.current.isSuccess).toBe(true));
      expect(axiosInstance.get).toHaveBeenCalledOnce();
    },
  );

  it('fails closed for explicit disable, a direct dev, and a branchless manager', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const disabled = renderHook(
      () => useOverdueExpenseSweep({}, false, '2026-09-01'),
      { wrapper: makeWrapper(queryClient) },
    );
    expect(disabled.result.current.fetchStatus).toBe('idle');
    disabled.unmount();

    act(() =>
      useAuthStore.getState().setAuth('token', {
        id: 'dev-1',
        email: 'dev@example.com',
        role: 'dev',
        company_id: 'company-1',
      }),
    );
    const dev = renderHook(
      () => useOverdueExpenseSweep({}, true, '2026-09-01'),
      { wrapper: makeWrapper(queryClient) },
    );
    expect(dev.result.current.fetchStatus).toBe('idle');
    dev.unmount();

    act(() =>
      useAuthStore.getState().setAuth('token', {
        id: 'manager-1',
        email: 'manager@example.com',
        role: 'manager',
        company_id: 'company-1',
        branch_id: null,
      }),
    );
    const sweep = renderHook(
      () => useOverdueExpenseSweep({}, true, '2026-09-01'),
      { wrapper: makeWrapper(queryClient) },
    );
    const page = renderHook(() => useExpensesPage({}, true), {
      wrapper: makeWrapper(queryClient),
    });

    expect(sweep.result.current.fetchStatus).toBe('idle');
    expect(page.result.current.fetchStatus).toBe('idle');
    expect(axiosInstance.get).not.toHaveBeenCalled();
  });
});
