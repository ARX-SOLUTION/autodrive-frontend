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
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';
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

  const SortTh = ({
    field,
    label,
    align = 'left',
  }: {
    field: string;
    label: string;
    align?: string;
  }) => (
    <th className={`px-4 py-3 text-${align} font-medium text-muted-foreground`}>
      <button
        onClick={() => onToggleSort(field)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        {sortField === field ? (
          sortDir === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
        )}
      </button>
    </th>
  );

  return (
    <div className="hidden md:block glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                #
              </th>
              <SortTh field="userName" label={t('audit.table_user')} />
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                {t('users.detail.role')}
              </th>
              <SortTh field="action" label={t('audit.table_action')} />
              <SortTh field="entity" label={t('audit.table_entity')} />
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                {t('audit.detail_details')}
              </th>
              <SortTh field="createdAt" label={t('audit.table_time')} />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td colSpan={7} className="p-4">
                    <Skeleton className="h-5" />
                  </td>
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td colSpan={7} className="p-0">
                  <EmptyState
                    title={t('common.error')}
                    action={{
                      label: t('common.retry'),
                      onClick: onRetry,
                    }}
                  />
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-0">
                  <EmptyState icon={ShieldCheck} title={t('audit.not_found')} />
                </td>
              </tr>
            ) : (
              logs.map((log, idx) => (
                <tr
                  key={log.id}
                  className="table-row-striped border-b border-border/50 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => {
                    if (window.getSelection()?.toString()) return;
                    navigate(`/audit/${log.id}`, { state: { log } });
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')
                      navigate(`/audit/${log.id}`, { state: { log } });
                    if (e.key === ' ') {
                      e.preventDefault();
                      navigate(`/audit/${log.id}`, { state: { log } });
                    }
                  }}
                >
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {startIndex + idx + 1}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {log.user_name || t('common.na')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {formatAuditRole(log.user_role, t)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'font-medium text-xs',
                        auditActionColor(log.action),
                      )}
                    >
                      {formatAuditAction(log.action, t)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {formatAuditEntity(log.entity, t)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-[240px] truncate">
                    {log.changes ? t('audit.changes') : log.entity_id}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap tabular-nums">
                    {formatAuditDate(log.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
