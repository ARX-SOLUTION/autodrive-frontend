import { useTranslation } from 'react-i18next';
import {
  FunnelSimple,
  CheckCircle,
  XCircle,
  ChartLineUp,
  Clock,
  WarningCircle,
} from '@phosphor-icons/react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useLeadMetricsQuery } from '../queries/leadsQueries';

export interface LeadMetricsViewProps {
  branchId?: string;
  period?: '7d' | '30d' | '60d' | 'all';
}

export const LeadMetricsView = ({ branchId, period }: LeadMetricsViewProps) => {
  const { t } = useTranslation();
  const {
    data: metrics,
    isLoading,
    isError,
    refetch,
  } = useLeadMetricsQuery({
    branchId,
    period,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !metrics) {
    return (
      <EmptyState
        title={t('common.error', 'Xatolik yuz berdi')}
        description={t(
          'leads.metrics_error',
          'Metrikalarni yuklashda xatolik yuz berdi',
        )}
        action={{
          label: t('common.retry', 'Qayta urinish'),
          onClick: () => void refetch(),
        }}
      />
    );
  }

  const statCards = [
    {
      title: t('leads.total_leads', 'Jami lidlar'),
      value: metrics.totalLeads,
      icon: FunnelSimple,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400',
    },
    {
      title: t('leads.won_leads', 'Yutilgan lidlar'),
      value: metrics.wonLeads,
      icon: CheckCircle,
      color:
        'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400',
    },
    {
      title: t('leads.lost_leads', 'Yo‘qotilgan lidlar'),
      value: metrics.lostLeads,
      icon: XCircle,
      color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400',
    },
    {
      title: t('leads.conversion_rate', 'Konversiya darajasi'),
      value: `${metrics.conversionRate}%`,
      icon: ChartLineUp,
      color:
        'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400',
    },
    {
      title: t('leads.avg_won_time', 'O‘rtacha yutish muddati'),
      value:
        metrics.avgTimeToWonDays !== null
          ? `${metrics.avgTimeToWonDays} ${t('common.days', 'kun')}`
          : '—',
      icon: Clock,
      color:
        'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="flex flex-col justify-between rounded-2xl border bg-card p-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {stat.title}
                </span>
                <div className={`rounded-xl p-2 ${stat.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 font-bold text-2xl tracking-tight text-foreground">
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid of Breakdowns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Stages Breakdown */}
        <div className="flex flex-col rounded-2xl border bg-card p-5 shadow-xs">
          <h3 className="font-semibold text-sm text-foreground">
            {t('leads.stages', 'Bosqichlar bo‘yicha')}
          </h3>
          <div className="mt-4 flex-1 space-y-3">
            {Object.keys(metrics.byStage).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t('leads.no_data', 'Ma’lumotlar yo‘q')}
              </p>
            ) : (
              Object.entries(metrics.byStage).map(([stageName, count]) => {
                const pct =
                  metrics.totalLeads > 0
                    ? Math.round((count / metrics.totalLeads) * 100)
                    : 0;
                return (
                  <div key={stageName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">
                        {stageName}
                      </span>
                      <span className="text-muted-foreground">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sources Breakdown */}
        <div className="flex flex-col rounded-2xl border bg-card p-5 shadow-xs">
          <h3 className="font-semibold text-sm text-foreground">
            {t('leads.sources_breakdown', 'Manbalar bo‘yicha')}
          </h3>
          <div className="mt-4 flex-1 space-y-3">
            {Object.keys(metrics.bySource).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t('leads.no_data', 'Ma’lumotlar yo‘q')}
              </p>
            ) : (
              Object.entries(metrics.bySource).map(([sourceKey, stat]) => {
                const label = t(`leads.sources.${sourceKey}`, sourceKey);
                return (
                  <div
                    key={sourceKey}
                    className="flex items-center justify-between rounded-lg border bg-muted/40 p-2.5 text-xs"
                  >
                    <div>
                      <span className="font-medium capitalize text-foreground">
                        {label}
                      </span>
                      <div className="text-[11px] text-muted-foreground">
                        {stat.won} {t('leads.won', 'yutildi')} (
                        {stat.conversionRate}%)
                      </div>
                    </div>
                    <span className="rounded-md bg-background px-2 py-0.5 font-semibold text-foreground shadow-2xs">
                      {stat.count}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Lost Reasons Breakdown */}
        <div className="flex flex-col rounded-2xl border bg-card p-5 shadow-xs">
          <h3 className="font-semibold text-sm text-foreground">
            {t('leads.lost_reasons_breakdown', 'Yo‘qotish sabablari')}
          </h3>
          <div className="mt-4 flex-1 space-y-3">
            {Object.keys(metrics.byLostReason).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t('leads.no_data', 'Ma’lumotlar yo‘q')}
              </p>
            ) : (
              Object.entries(metrics.byLostReason).map(([reasonKey, count]) => {
                const label = t(`leads.lost_reasons.${reasonKey}`, reasonKey);
                const pct =
                  metrics.lostLeads > 0
                    ? Math.round((count / metrics.lostLeads) * 100)
                    : 0;
                return (
                  <div key={reasonKey} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <WarningCircle className="h-3.5 w-3.5 text-destructive" />
                        <span>{label}</span>
                      </span>
                      <span className="text-muted-foreground">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-destructive/80"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
