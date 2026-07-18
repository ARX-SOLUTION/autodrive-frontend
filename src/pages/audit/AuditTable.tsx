import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuditLog } from '@/types/audit';
import {
  formatAuditDate,
  formatAuditAction,
  auditActionColor,
  formatAuditEntity,
  formatAuditRole,
} from '@/lib/auditFormat';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { ShieldCheck } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface AuditTableProps {
  logs: AuditLog[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  startIndex: number;
  sortField: string;
  sortDir: 'asc' | 'desc';
  onToggleSort: (field: string) => void;
}

export const AuditTable = ({
  logs,
  isLoading,
  isError,
  onRetry,
  startIndex,
  sortField,
  sortDir,
  onToggleSort,
}: AuditTableProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const columns: DataTableColumn<AuditLog>[] = [
    {
      key: 'index',
      header: '#',
      align: 'center',
      cellClassName: 'text-muted-foreground',
      render: (_log, idx) => startIndex + idx + 1,
    },
    {
      key: 'userName',
      header: t('audit.table_user'),
      sortable: true,
      cellClassName: 'font-medium',
      render: (log) => log.user_name || t('common.na'),
    },
    {
      key: 'role',
      header: t('users.detail.role'),
      cellClassName: 'text-muted-foreground text-xs',
      render: (log) => formatAuditRole(log.user_role, t),
    },
    {
      key: 'action',
      header: t('audit.table_action'),
      sortable: true,
      render: (log) => (
        <span
          className={cn('font-medium text-xs', auditActionColor(log.action))}
        >
          {formatAuditAction(log.action, t)}
        </span>
      ),
    },
    {
      key: 'entity',
      header: t('audit.table_entity'),
      sortable: true,
      cellClassName: 'text-xs',
      render: (log) => formatAuditEntity(log.entity, t),
    },
    {
      key: 'details',
      header: t('audit.detail_details'),
      cellClassName: 'text-muted-foreground text-xs max-w-[240px] truncate',
      render: (log) => (log.changes ? t('audit.changes') : log.entity_id),
    },
    {
      key: 'createdAt',
      header: t('audit.table_time'),
      sortable: true,
      cellClassName: 'text-muted-foreground whitespace-nowrap tabular-nums',
      render: (log) => formatAuditDate(log.created_at),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={logs}
      keyExtractor={(log) => log.id}
      onRowClick={(log) => navigate(`/audit/${log.id}`, { state: { log } })}
      isLoading={isLoading}
      skeletonRowCount={5}
      isError={isError}
      errorState={
        <EmptyState
          title={t('common.error')}
          action={{ label: t('common.retry'), onClick: onRetry }}
        />
      }
      emptyState={
        <EmptyState icon={ShieldCheck} title={t('audit.not_found')} />
      }
      sortField={sortField}
      sortDir={sortDir}
      onToggleSort={onToggleSort}
      className="glass-card overflow-hidden"
    />
  );
};
