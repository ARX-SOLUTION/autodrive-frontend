import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useCan } from '@/hooks/useCan';
import { useAuthStore } from '@/store/authStore';
import {
  ApiContractError,
  parseItemEnvelope,
  parseListEnvelope,
} from '@/lib/apiEnvelope';
import { dashboardKeys, expenseKeys } from '@/lib/queryKeys';
import { track } from '@/lib/umami';
import { tashkentTodayCalendarDate } from '@/lib/tashkentDate';
import type {
  CreateExpensePayload,
  CreateExpensePaymentPayload,
  UpdateExpensePayload,
  Expense,
  ExpenseHistory,
  ExpensePayment,
  ExpenseBranchOption,
  ExpenseMonthCloseCsvFilters,
  ExpenseCategory,
  ExpenseListFilters,
  ExpenseStatus,
  OverdueExpense,
  ExpenseTriageCounts,
  ExpenseTriageCountsFilters,
  CancelExpensePayload,
  DeleteExpensePayload,
} from '@/types/expense';
import type { ListResponse } from '@/types/list';
import type {
  ExpensesQuery,
  ExpenseTriageCountsQuery,
} from '@/shared/api/contract';

export const toExpenseQueryParams = (
  filters: ExpenseListFilters,
): ExpensesQuery => ({
  branch_id: filters.branchId,
  scope: filters.scope,
  category: filters.category,
  status: filters.attention ? undefined : filters.status,
  attention: filters.attention,
  date_from: filters.dateFrom,
  date_to: filters.dateTo,
  page: filters.page,
  limit: filters.limit,
});

const toExpenseTriageCountsQueryParams = (
  filters: ExpenseTriageCountsFilters,
): ExpenseTriageCountsQuery => ({
  branch_id: filters.branchId,
  scope: filters.scope,
});

const expenseIdentity = (branchId?: string) => {
  const user = useAuthStore.getState().user;
  return {
    companyId: user?.company_id,
    branchId,
    jwtBranchId: user?.branch_id,
    viewerRole: user?.role,
  };
};

const expenseHistoryKey = (id: string | undefined) =>
  [...expenseKeys.detail(id), 'history'] as const;

const invalidateExpenseQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
) => {
  queryClient.invalidateQueries({ queryKey: expenseKeys.all });
  queryClient.invalidateQueries({ queryKey: expenseKeys.detail(id) });
  queryClient.invalidateQueries({ queryKey: expenseHistoryKey(id) });
  queryClient.invalidateQueries({
    queryKey: dashboardKeys.financeSummary(),
  });
};

export const fetchExpenseMonthCloseCsv = async (
  filters: ExpenseMonthCloseCsvFilters,
) => {
  const response = await axiosInstance.get<Blob>('/expenses/month-close.csv', {
    params: {
      month: filters.month,
      ...(filters.branchId ? { branch_id: filters.branchId } : {}),
    },
    responseType: 'blob',
  });
  const getHeader = response.headers.get;
  const contentDisposition =
    typeof getHeader === 'function'
      ? getHeader.call(response.headers, 'content-disposition')
      : response.headers['content-disposition'];
  return {
    blob: response.data,
    contentDisposition:
      typeof contentDisposition === 'string' ? contentDisposition : undefined,
  };
};

export const fetchExpensesPage = async (
  filters: ExpenseListFilters,
  signal?: AbortSignal,
): Promise<ListResponse<Expense>> => {
  const { data } = await axiosInstance.get<unknown>('/expenses', {
    params: toExpenseQueryParams(filters),
    signal,
  });
  return parseListEnvelope<Expense>(data, 'expenses');
};

export const expensesPageQueryOptions = (
  filters: ExpenseListFilters,
  enabled = true,
) =>
  queryOptions({
    queryKey: expenseKeys.page({
      ...expenseIdentity(filters.branchId),
      ...toExpenseQueryParams(filters),
    }),
    enabled,
    queryFn: ({ signal }) => fetchExpensesPage(filters, signal),
  });

export const useExpensesPage = (
  filters: ExpenseListFilters = {},
  enabled = true,
) => {
  const canViewExpenses = useCan('viewExpenses');
  const user = useAuthStore((state) => state.user);
  const hasManagerScope = user?.role !== 'manager' || !!user.branch_id;
  return useQuery(
    expensesPageQueryOptions(
      filters,
      enabled && canViewExpenses && hasManagerScope,
    ),
  );
};

const OVERDUE_SWEEP_LIMIT = 100;

const assertOverdueSweepPage = (
  response: ListResponse<Expense>,
  requestedPage: number,
  expected?: { total: number; totalPages: number },
) => {
  const { data, meta } = response;
  const numericMeta = [meta.total, meta.page, meta.limit, meta.totalPages];
  const expectedTotalPages =
    meta.total === 0 ? [0, 1] : [Math.ceil(meta.total / OVERDUE_SWEEP_LIMIT)];
  const expectedRowCount =
    meta.total === 0
      ? 0
      : requestedPage < meta.totalPages
        ? OVERDUE_SWEEP_LIMIT
        : meta.total - OVERDUE_SWEEP_LIMIT * (meta.totalPages - 1);
  const validMetadata =
    numericMeta.every(Number.isSafeInteger) &&
    meta.total >= 0 &&
    meta.page === requestedPage &&
    meta.limit === OVERDUE_SWEEP_LIMIT &&
    expectedTotalPages.includes(meta.totalPages) &&
    typeof meta.hasNextPage === 'boolean' &&
    meta.hasNextPage === requestedPage < meta.totalPages &&
    typeof meta.hasPreviousPage === 'boolean' &&
    meta.hasPreviousPage === requestedPage > 1 &&
    data.length === expectedRowCount;
  const stableMetadata =
    !expected ||
    (meta.total === expected.total && meta.totalPages === expected.totalPages);

  if (!validMetadata || !stableMetadata) {
    throw new ApiContractError(
      'Expense overdue sweep pagination metadata changed or was invalid',
      response,
    );
  }
};

const appendOverdueSweepRows = (
  target: OverdueExpense[],
  seenIds: Set<string>,
  response: ListResponse<Expense>,
) => {
  for (const expense of response.data) {
    if (
      typeof expense !== 'object' ||
      expense === null ||
      !Number.isInteger(expense.overdue_days) ||
      (expense.overdue_days ?? 0) < 1 ||
      seenIds.has(expense.id)
    ) {
      throw new ApiContractError(
        'Expense overdue sweep contained an invalid or duplicate row',
        response,
      );
    }
    seenIds.add(expense.id);
    target.push(expense as OverdueExpense);
  }
};

export const fetchOverdueExpenseSweep = async (
  filters: ExpenseListFilters,
  signal?: AbortSignal,
): Promise<OverdueExpense[]> => {
  const pageFilters: ExpenseListFilters = {
    branchId: filters.branchId,
    scope: filters.scope,
    category: filters.category,
    attention: 'overdue',
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    page: 1,
    limit: OVERDUE_SWEEP_LIMIT,
  };
  const firstPage = await fetchExpensesPage(pageFilters, signal);
  assertOverdueSweepPage(firstPage, 1);

  const expected = {
    total: firstPage.meta.total,
    totalPages: firstPage.meta.totalPages,
  };
  const rows: OverdueExpense[] = [];
  const seenIds = new Set<string>();
  appendOverdueSweepRows(rows, seenIds, firstPage);

  for (let page = 2; page <= expected.totalPages; page += 1) {
    const response = await fetchExpensesPage({ ...pageFilters, page }, signal);
    assertOverdueSweepPage(response, page, expected);
    appendOverdueSweepRows(rows, seenIds, response);
  }

  if (rows.length !== expected.total) {
    throw new ApiContractError(
      'Expense overdue sweep row count did not match pagination total',
      { rows, meta: firstPage.meta },
    );
  }

  return rows;
};

export const overdueExpenseSweepQueryOptions = (
  filters: ExpenseListFilters,
  enabled = true,
  businessDay = tashkentTodayCalendarDate(),
) =>
  queryOptions({
    queryKey: expenseKeys.overdueSweep({
      ...expenseIdentity(filters.branchId),
      scope: filters.scope,
      category: filters.category,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      attention: 'overdue',
      businessDay,
    }),
    enabled,
    queryFn: ({ signal }) => fetchOverdueExpenseSweep(filters, signal),
  });

export const useOverdueExpenseSweep = (
  filters: ExpenseListFilters = {},
  enabled = true,
  businessDay = tashkentTodayCalendarDate(),
) => {
  const canViewExpenses = useCan('viewExpenses');
  const user = useAuthStore((state) => state.user);
  const hasManagerScope = user?.role !== 'manager' || !!user.branch_id;
  return useQuery(
    overdueExpenseSweepQueryOptions(
      filters,
      enabled && canViewExpenses && hasManagerScope,
      businessDay,
    ),
  );
};

export const fetchExpenseTriageCounts = async (
  filters: ExpenseTriageCountsFilters,
  signal?: AbortSignal,
): Promise<ExpenseTriageCounts> => {
  const { data } = await axiosInstance.get<unknown>('/expenses/triage-counts', {
    params: toExpenseTriageCountsQueryParams(filters),
    signal,
  });
  return parseItemEnvelope<ExpenseTriageCounts>(data, 'expense-triage-counts');
};

export const expenseTriageCountsQueryOptions = (
  filters: ExpenseTriageCountsFilters,
  enabled = true,
  businessDay = tashkentTodayCalendarDate(),
) =>
  queryOptions({
    queryKey: expenseKeys.triageCounts({
      ...expenseIdentity(filters.branchId),
      scope: filters.scope,
      businessDay,
    }),
    enabled,
    queryFn: ({ signal }) => fetchExpenseTriageCounts(filters, signal),
  });

export const useExpenseTriageCounts = (
  filters: ExpenseTriageCountsFilters = {},
  enabled = true,
  businessDay = tashkentTodayCalendarDate(),
) => {
  const canViewExpenses = useCan('viewExpenses');
  const user = useAuthStore((state) => state.user);
  const hasManagerScope = user?.role !== 'manager' || !!user.branch_id;
  return useQuery(
    expenseTriageCountsQueryOptions(
      filters,
      enabled && canViewExpenses && hasManagerScope,
      businessDay,
    ),
  );
};

export const expenseDetailQueryOptions = (id?: string, enabled = !!id) =>
  queryOptions({
    queryKey: [...expenseKeys.detail(id), expenseIdentity()] as const,
    enabled,
    queryFn: async ({ signal }) => {
      const { data } = await axiosInstance.get<unknown>(`/expenses/${id}`, {
        signal,
      });
      return parseItemEnvelope<Expense>(data, 'expense');
    },
  });

export const useExpense = (id?: string) => {
  const canViewExpenses = useCan('viewExpenses');
  return useQuery(expenseDetailQueryOptions(id, canViewExpenses && !!id));
};

export const expenseHistoryQueryOptions = (id?: string, enabled = !!id) =>
  queryOptions({
    queryKey: [...expenseHistoryKey(id), expenseIdentity()] as const,
    enabled,
    queryFn: async ({ signal }) => {
      const { data } = await axiosInstance.get<unknown>(
        `/expenses/${id}/history`,
        { signal },
      );
      return parseItemEnvelope<ExpenseHistory>(data, 'expense-history');
    },
  });

export const useExpenseHistory = (id?: string) => {
  const canManageFinance = useCan('manageCompanyFinance');
  return useQuery(expenseHistoryQueryOptions(id, canManageFinance && !!id));
};

export const useCreateExpensePayment = (expenseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateExpensePaymentPayload) => {
      const { data } = await axiosInstance.post<unknown>(
        `/expenses/${expenseId}/payments`,
        payload,
      );
      return parseItemEnvelope<ExpensePayment>(data, 'payment');
    },
    onSuccess: () => {
      invalidateExpenseQueries(queryClient, expenseId);
      track('expense_payment_create');
    },
  });
};

export const branchOptionsQueryOptions = (
  companyId: string | undefined,
  enabled = true,
) =>
  queryOptions({
    queryKey: expenseKeys.branchOptions(companyId),
    enabled: enabled && !!companyId,
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const { data } = await axiosInstance.get<unknown>(
        '/expenses/branch-options',
        { signal },
      );
      return parseListEnvelope<ExpenseBranchOption>(data, 'expense-branches')
        .data;
    },
  });

export const useExpenseBranchOptions = () => {
  const canViewExpenses = useCan('viewExpenses');
  const canManageFinance = useCan('manageCompanyFinance');
  const companyId = useAuthStore((state) => state.user?.company_id);
  return useQuery(
    branchOptionsQueryOptions(companyId, canViewExpenses && canManageFinance),
  );
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateExpensePayload) => {
      const { data } = await axiosInstance.post<unknown>('/expenses', payload);
      return parseItemEnvelope<Expense>(data, 'expense');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.financeSummary(),
      });
      track('expense_create');
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & UpdateExpensePayload) => {
      const { data } = await axiosInstance.patch<unknown>(
        `/expenses/${id}`,
        payload,
      );
      return parseItemEnvelope<Expense>(data, 'expense');
    },
    onSuccess: (_expense, variables) => {
      invalidateExpenseQueries(queryClient, variables.id);
      track('expense_update');
    },
    onError: (_error, variables) => {
      // A concurrent payment/lifecycle mutation leaves the rendered version
      // stale. Refresh the server state while the form keeps its values so
      // the manager can review the conflict before resubmitting.
      invalidateExpenseQueries(queryClient, variables.id);
    },
  });
};

export const useCancelExpense = (expenseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CancelExpensePayload) => {
      const { data } = await axiosInstance.patch<unknown>(
        `/expenses/${expenseId}/cancel`,
        payload,
      );
      return parseItemEnvelope<Expense>(data, 'expense');
    },
    onSuccess: () => {
      invalidateExpenseQueries(queryClient, expenseId);
      track('expense_cancel');
    },
    onError: () => {
      invalidateExpenseQueries(queryClient, expenseId);
    },
  });
};

export const useDeleteExpense = (expenseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DeleteExpensePayload) => {
      await axiosInstance.delete(`/expenses/${expenseId}`, { data: payload });
    },
    onSuccess: () => {
      invalidateExpenseQueries(queryClient, expenseId);
      track('expense_delete');
    },
    onError: () => {
      invalidateExpenseQueries(queryClient, expenseId);
    },
  });
};

export const expenseCategoryValues: ExpenseCategory[] = [
  'rent',
  'utilities',
  'vehicle',
  'marketing',
  'supplies',
  'administrative',
  'other',
];

export const expenseStatusValues: ExpenseStatus[] = [
  'planned',
  'partially_paid',
  'paid',
  'cancelled',
];
