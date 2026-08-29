import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useIsCrossTenant } from '@/hooks/useCan';
import { Payment, PaymentSnapshot, PaymentSummary } from '@/types/payment';
import { track } from '@/lib/umami';
import type { ListResponse } from '@/types/list';
import { parseListResponse } from '@/lib/listResponse';
import { parseItemEnvelope } from '@/lib/apiEnvelope';
import { paymentKeys, studentKeys, dashboardKeys } from '@/lib/queryKeys';

const toLocalDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export interface PaymentListFilters {
  branchId?: string;
  courseType?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  search?: string;
  paymentStatus?: 'paid' | 'unpaid';
  paymentMethod?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  studentId?: string;
}

export const toPaymentQueryParams = ({
  branchId,
  courseType,
  startDate,
  endDate,
  page,
  limit,
  search,
  paymentStatus,
  paymentMethod,
  sortBy,
  sortOrder,
  studentId,
}: PaymentListFilters) => ({
  branch_id: branchId,
  course_type: courseType,
  startDate: startDate ? toLocalDateStr(startDate) : undefined,
  endDate: endDate ? toLocalDateStr(endDate) : undefined,
  page,
  limit,
  search: search?.trim() || undefined,
  payment_status: paymentStatus,
  payment_method: paymentMethod,
  sort_by: sortBy,
  sort_order: sortOrder,
  student_id: studentId,
});

export const fetchPaymentsPage = async (
  filters: PaymentListFilters,
  signal?: AbortSignal,
): Promise<ListResponse<Payment>> => {
  const { data } = await axiosInstance.get('/payments', {
    params: toPaymentQueryParams(filters),
    signal,
  });
  return parseListResponse<Payment>(data, filters.page, filters.limit);
};

export const paymentsPageQueryOptions = (
  filters: PaymentListFilters,
  enabled = true,
) =>
  queryOptions({
    queryKey: paymentKeys.page({ ...filters }),
    enabled,
    queryFn: ({ signal }) => fetchPaymentsPage(filters, signal),
  });

export const fetchAllPayments = async (
  filters: PaymentListFilters,
): Promise<Payment[]> => {
  const limit = 100;
  let page = 1;
  const rows: Payment[] = [];

  for (;;) {
    const result = await fetchPaymentsPage({ ...filters, page, limit });
    rows.push(...result.data);
    if (!result.meta.hasNextPage) break;
    page += 1;
  }

  return rows;
};

export const usePaymentsPage = (
  branchId?: string,
  courseType?: string,
  startDate?: Date,
  endDate?: Date,
  page?: number,
  limit?: number,
  options?: Omit<
    PaymentListFilters,
    'branchId' | 'courseType' | 'startDate' | 'endDate' | 'page' | 'limit'
  >,
) => {
  const isCrossTenant = useIsCrossTenant();
  return useQuery(
    paymentsPageQueryOptions(
      { branchId, courseType, startDate, endDate, page, limit, ...options },
      !!branchId || isCrossTenant,
    ),
  );
};

export const usePayments = (
  branchId?: string,
  courseType?: string,
  startDate?: Date,
  endDate?: Date,
) => {
  const isCrossTenant = useIsCrossTenant();
  return useQuery<ListResponse<Payment>, Error, Payment[]>({
    queryKey: paymentKeys.list({ branchId, courseType, startDate, endDate }),
    enabled: !!branchId || isCrossTenant,
    queryFn: ({ signal }) =>
      fetchPaymentsPage({ branchId, courseType, startDate, endDate }, signal),
    select: (result) => result.data,
  });
};

// Per-student payment ledger for the student detail card "To'lovlar" tab.
// Reuses GET /payments with a student_id filter; the broad paymentKeys.all
// invalidation in useCreatePayment/useDeletePayment refreshes this key for
// free (byStudent nests under the same 'payments' root).
export const useStudentPayments = (studentId?: string, page = 1, limit = 20) =>
  useQuery<ListResponse<Payment>>({
    queryKey: paymentKeys.byStudent(studentId, { page, limit }),
    enabled: !!studentId,
    queryFn: ({ signal }) =>
      fetchPaymentsPage(
        { studentId, page, limit, sortBy: 'date', sortOrder: 'desc' },
        signal,
      ),
  });

export const usePaymentSnapshot = (branchId?: string) => {
  const isCrossTenant = useIsCrossTenant();
  return useQuery<PaymentSnapshot>({
    queryKey: paymentKeys.snapshot(branchId),
    enabled: !!branchId || isCrossTenant,
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get('/payments/snapshot', {
        params: { branch_id: branchId },
        signal,
      });
      return parseItemEnvelope<PaymentSnapshot>(res, 'payment-snapshot');
    },
  });
};

// Mirrors fetchPaymentsPage's filter shape/mapping so the summary always
// reflects the same filters as the payments list (branch, search, status,
// method, course, date range) via the backend's /payments/summary aggregate.
export const usePaymentSummary = (
  filters: PaymentListFilters,
  enabled = true,
) => {
  const isCrossTenant = useIsCrossTenant();
  return useQuery<PaymentSummary>({
    queryKey: paymentKeys.summary({ ...filters }),
    enabled: enabled && (!!filters.branchId || isCrossTenant),
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get('/payments/summary', {
        params: toPaymentQueryParams(filters),
        signal,
      });
      return parseItemEnvelope<PaymentSummary>(res, 'payment-summary');
    },
  });
};

export const useCreatePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payment: {
      student_id: string;
      amount: number;
      payment_method: string;
      idempotency_key: string;
    }) => {
      const { data } = await axiosInstance.post('/payments', payment);
      return parseItemEnvelope<Payment>(data, 'payment');
    },
    onSuccess: () => {
      // paymentKeys.all (root 'payments') now covers summary/snapshot/
      // byStudent too -- they all nest under the same root.
      qc.invalidateQueries({ queryKey: paymentKeys.all });
      qc.invalidateQueries({ queryKey: studentKeys.all });
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
      track('payment_create');
    },
  });
};

export const useUpdatePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payment
    }: {
      id: string;
      amount?: number;
      payment_method?: string;
    }) => {
      const { data } = await axiosInstance.patch(`/payments/${id}`, payment);
      return parseItemEnvelope<Payment>(data, 'payment');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: paymentKeys.all });
      qc.invalidateQueries({ queryKey: studentKeys.all });
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
      track('payment_update');
    },
  });
};

export const useDeletePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/payments/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: paymentKeys.all });
      qc.invalidateQueries({ queryKey: studentKeys.all });
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
      track('payment_delete');
    },
  });
};
