import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/api/axiosInstance";
import { useAuthStore } from "@/store/authStore";
import { AuditLogsResponse } from "@/types/audit";

const toLocalDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const useAuditLogs = (params: {
  entity?: string;
  action?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const role = useAuthStore((s) => s.user?.role);
  const isOwnerOrDev = role === 'owner' || role === 'dev';
  return useQuery<AuditLogsResponse>({
    queryKey: ["audit-logs", { ...params, branchId }],
    enabled: !!branchId || isOwnerOrDev,
    queryFn: async () => {
      try {
        const { data: res } = await axiosInstance.get("/audit-logs", {
          params: {
            entity: params.entity,
            action: params.action,
            userId: params.userId,
            startDate: params.startDate ? toLocalDateStr(params.startDate) : undefined,
            endDate: params.endDate ? toLocalDateStr(params.endDate) : undefined,
            page: params.page,
            limit: params.limit,
            branch_id: branchId,
          },
        });
        return res?.data || res;
      } catch {
        return { data: [], total: 0, page: 1, limit: 50 };
      }
    },
  });
};
