import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuditLog } from '@/types/audit';
import {
  formatAuditDate,
  formatAuditAction,
  formatAuditEntity,
} from '@/lib/auditFormat';
import { Skeleton } from '@/components/ui/skeleton';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShieldCheck } from 'lucide-react';

interface AuditMobileListProps {
  logs: AuditLog[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export const AuditMobileList = ({
  logs,
  isLoading,
  isError,
  onRetry,
}: AuditMobileListProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="md:hidden grid gap-3">
      {isLoading ? (
        [...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))
      ) : isError ? (
        <EmptyState
          title={t('common.error')}
          action={{ label: t('common.retry'), onClick: onRetry }}
        />
      ) : logs.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={t('audit.not_found')} />
      ) : (
        logs.map((log) => (
          <DataCard
            key={log.id}
            onClick={() => navigate(`/audit/${log.id}`, { state: { log } })}
            title={`${formatAuditAction(log.action, t)} · ${formatAuditEntity(log.entity, t)}`}
            subtitle={log.user_name || t('common.na')}
            fields={[
              {
                label: t('audit.detail_date'),
                value: formatAuditDate(log.created_at),
              },
              {
                label: t('audit.detail_details'),
                value: t('audit.changes'),
              },
            ]}
          />
        ))
      )}
    </div>
  );
};
