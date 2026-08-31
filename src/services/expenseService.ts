import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useCan } from '@/hooks/useCan';
import { useAuthStore } from '@/store/authStore';
import { parseItemEnvelope, parseListEnvelope } from '@/lib/apiEnvelope';
import { dashboardKeys, expenseKeys } from '@/lib/queryKeys';
import { track } from '@/lib/umami';
import type {
  CreateExpensePayload,
  CreateExpensePaymentPayload,
  UpdateExpensePayload,
  Expense,
  ExpenseHistory,
  ExpensePayment,
  ExpenseBranchOption,
  ExpenseCategory,
  ExpenseListFilters,
  ExpenseStatus,
  CancelExpensePayload,
  DeleteExpensePayload,
} from '@/types/expense';
import type { ListResponse } from '@/types/list';

export const toExpenseQueryParams = (filters: ExpenseListFilters) => ({
  branch_id: filters.branchId,
  scope: filters.scope,
  category: filters.category,
  status: filters.status,
  date_from: filters.dateFrom,
  date_to: filters.dateTo,
  page: filters.page,
  limit: filters.limit,
});

const expenseIdentity = (branchId?: string) => ({
  companyId: useAuthStore.getState().user?.company_id,
  branchId,
  jwtBranchId: useAuthStore.getState().user?.branch_id,
});

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

export const useExpensesPage = (filters: ExpenseListFilters = {}) => {
  const canViewExpenses = useCan('viewExpenses');
  return useQuery(expensesPageQueryOptions(filters, canViewExpenses));
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
