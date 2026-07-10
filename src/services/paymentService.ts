import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useIsCrossTenant } from '@/hooks/useCan';
import { Payment, PaymentSnapshot, PaymentSummary } from '@/types/payment';
import { track } from '@/lib/umami';
import type { ListResponse } from '@/types/list';
import { parseListResponse } from '@/lib/listResponse';

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
): Promise<ListResponse<Payment>> => {
  const { data } = await axiosInstance.get('/payments', {
    params: toPaymentQueryParams(filters),
  });
  return parseListResponse<Payment>(data, filters.page, filters.limit);
};

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
  return useQuery<ListResponse<Payment>>({
    queryKey: [
      'payments',
      branchId,
      courseType,
      startDate,
      endDate,
      page,
      limit,
      options?.search,
      options?.paymentStatus,
      options?.paymentMethod,
      options?.sortBy,
      options?.sortOrder,
    ],
    enabled: !!branchId || isCrossTenant,
    queryFn: () =>
      fetchPaymentsPage({
        branchId,
        courseType,
        startDate,
        endDate,
        page,
        limit,
        ...options,
      }),
  });
};

export const usePayments = (
  branchId?: string,
  courseType?: string,
  startDate?: Date,
  endDate?: Date,
) => {
  const isCrossTenant = useIsCrossTenant();
  return useQuery<ListResponse<Payment>, Error, Payment[]>({
    queryKey: ['payments', branchId, courseType, startDate, endDate],
    enabled: !!branchId || isCrossTenant,
    queryFn: () =>
      fetchPaymentsPage({
        branchId,
        courseType,
        startDate,
        endDate,
      }),
    select: (result) => result.data,
  });
};

// Per-student payment ledger for the student detail card "To'lovlar" tab.
// Reuses GET /payments with a student_id filter; the broad ['payments']
// invalidation in useCreatePayment/useDeletePayment refreshes this key for free.
export const useStudentPayments = (studentId?: string, page = 1, limit = 20) =>
  useQuery<ListResponse<Payment>>({
    queryKey: ['payments', 'student', studentId, page, limit],
    enabled: !!studentId,
    queryFn: () =>
      fetchPaymentsPage({
        studentId,
        page,
        limit,
        sortBy: 'date',
        sortOrder: 'desc',
      }),
  });

export const usePaymentSnapshot = (branchId?: string) => {
  const isCrossTenant = useIsCrossTenant();
  return useQuery<PaymentSnapshot>({
    queryKey: ['payment-snapshot', branchId],
    enabled: !!branchId || isCrossTenant,
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/payments/snapshot', {
        params: { branch_id: branchId },
      });
      return res?.data || res;
    },
  });
};

export const usePaymentSummary = (
  branchId?: string,
  startDate?: Date,
  endDate?: Date,
  payment_status?: boolean | undefined,
  payment_type?: string,
  course_type?: string,
  enabled = true,
) => {
  const isCrossTenant = useIsCrossTenant();
  return useQuery<PaymentSummary>({
    queryKey: [
      'payment-summary',
      branchId,
      startDate,
      endDate,
      payment_status,
      payment_type,
      course_type,
    ],
    enabled: enabled && (!!branchId || isCrossTenant),
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/payments/summary', {
        params: {
          branchId,
          startDate: startDate ? toLocalDateStr(startDate) : undefined,
          endDate: endDate ? toLocalDateStr(endDate) : undefined,
          paymentStatus: payment_status,
          payment_type,
          course_type,
        },
      });
      return res?.data || res;
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
      return data?.data || data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['payment-summary'] });
      qc.invalidateQueries({ queryKey: ['payment-snapshot'] });
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['student'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      track('payment_create');
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
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['payment-summary'] });
      qc.invalidateQueries({ queryKey: ['payment-snapshot'] });
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['student'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      track('payment_delete');
    },
  });
};
