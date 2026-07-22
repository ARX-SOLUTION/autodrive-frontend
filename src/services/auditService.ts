import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { AuditLog, AuditLogsResponse } from '@/types/audit';
import { parseListEnvelope, parseItemEnvelope } from '@/lib/apiEnvelope';
import { auditLogKeys } from '@/lib/queryKeys';

const toLocalDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const useAuditLogs = ({
  enabled: enabledOpt,
  ...params
}: {
  entity?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  enabled?: boolean;
}) => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const role = useAuthStore((s) => s.user?.role);
  // Backend gates /audit-logs to owner/manager/dev — don't fire for others (operator/teacher → 403).
  const canViewAudit = role === 'owner' || role === 'manager' || role === 'dev';
  return useQuery<AuditLogsResponse>({
    queryKey: auditLogKeys.page({ ...params, branchId }),
    // autodrive-bpf: callers can gate firing beyond the role check — the
    // dashboard only wants this for OWNERS (viewAudit), narrower than manager.
    enabled: canViewAudit && (enabledOpt ?? true),
    queryFn: async ({ signal }) => {
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
        signal,
      });
      return parseListEnvelope<AuditLog>(res, 'audit-logs');
    },
  });
};

export const useAuditLogById = (id: string | undefined) => {
  const role = useAuthStore((s) => s.user?.role);
  const canViewAudit = role === 'owner' || role === 'manager' || role === 'dev';
  return useQuery<AuditLog>({
    queryKey: auditLogKeys.detail(id),
    enabled: canViewAudit && !!id,
    queryFn: async ({ signal }) => {
      const { data: res } = await axiosInstance.get(`/audit-logs/${id}`, {
        signal,
      });
      return parseItemEnvelope<AuditLog>(res, 'audit-log');
    },
  });
};
