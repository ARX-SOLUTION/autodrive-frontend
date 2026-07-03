import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/api/axiosInstance";
import { useAuthStore } from "@/store/authStore";
import { Payment, PaymentSnapshot, PaymentSummary } from "@/types/payment";
import { track } from '@/lib/umami';

const toLocalDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const usePayments = (courseType?: string, startDate?: Date, endDate?: Date, branchId?: string) => {
  const role = useAuthStore((s) => s.user?.role);
  const isOwnerOrDev = role === 'owner' || role === 'dev';
  return useQuery<Payment[]>({
    queryKey: ["payments", branchId, courseType, startDate, endDate],
    enabled: !!branchId || isOwnerOrDev,
    queryFn: async () => {
      try {
        const { data: res } = await axiosInstance.get("/payments", {
          params: {
            branch_id: branchId,
            course_type: courseType,
            startDate: startDate ? toLocalDateStr(startDate) : undefined,
            endDate: endDate ? toLocalDateStr(endDate) : undefined,
          },
        });
        const arr = res?.data?.data || res?.data;
        if (Array.isArray(arr)) return arr;
        if (Array.isArray(res)) return res;
        return [];
      } catch {
        return [];
      }
    },
  });
};

export const usePaymentSnapshot = (branchId?: string) => {
  const role = useAuthStore((s) => s.user?.role);
  const isOwnerOrDev = role === 'owner' || role === 'dev';
  return useQuery<PaymentSnapshot>({
    queryKey: ["payment-snapshot", branchId],
    enabled: !!branchId || isOwnerOrDev,
    queryFn: async () => {
      try {
        const { data: res } = await axiosInstance.get("/payments/snapshot", {
          params: { branch_id: branchId },
        });
        return res?.data || res;
      } catch {
        return {
          today_income: 0,
          this_month_income: 0,
          current_total_debt: 0,
          students_with_debt: 0,
        };
      }
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
  const role = useAuthStore((s) => s.user?.role);
  const isOwnerOrDev = role === 'owner' || role === 'dev';
  return useQuery<PaymentSummary>({
    queryKey: [
      "payment-summary",
      branchId,
      startDate,
      endDate,
      payment_status,
      payment_type,
      course_type,
    ],
    enabled: enabled && (!!branchId || isOwnerOrDev),
    queryFn: async () => {
      try {
        const { data: res } = await axiosInstance.get("/payments/summary", {
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
      } catch {
        return {
          period_collected: 0,
          period_payments_count: 0,
          period_debt: 0,
        };
      }
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
    }) => {
      const { data } = await axiosInstance.post("/payments", payment);
      return data?.data || data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['payment-summary'] });
      qc.invalidateQueries({ queryKey: ['payment-snapshot'] });
      qc.invalidateQueries({ queryKey: ['students'] });
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
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      track('payment_delete');
    },
  });
};
