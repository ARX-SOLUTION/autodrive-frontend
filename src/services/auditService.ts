import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { AuditLog, AuditLogsResponse } from '@/types/audit';

const toLocalDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const useAuditLogs = (params: {
  entity?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const role = useAuthStore((s) => s.user?.role);
  // Backend gates /audit-logs to owner/manager/dev — don't fire for others (operator/teacher → 403).
  const canViewAudit = role === 'owner' || role === 'manager' || role === 'dev';
  return useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs', { ...params, branchId }],
    enabled: canViewAudit,
    queryFn: async () => {
      const { data: res } = await axiosInstance.get('/audit-logs', {
        params: {
          entity: params.entity,
          entity_id: params.entityId,
          action: params.action,
          userId: params.userId,
          startDate: params.startDate
            ? toLocalDateStr(params.startDate)
            : undefined,
          endDate: params.endDate ? toLocalDateStr(params.endDate) : undefined,
          page: params.page,
          limit: params.limit,
          branch_id: branchId,
        },
      });
      return res?.data || res;
    },
  });
};

export const useAuditLogById = (id: string | undefined) => {
  const role = useAuthStore((s) => s.user?.role);
  const canViewAudit = role === 'owner' || role === 'manager' || role === 'dev';
  return useQuery<AuditLog>({
    queryKey: ['audit-logs', 'detail', id],
    enabled: canViewAudit && !!id,
    queryFn: async () => {
      const { data: res } = await axiosInstance.get(`/audit-logs/${id}`);
      return res?.data || res;
    },
  });
};
