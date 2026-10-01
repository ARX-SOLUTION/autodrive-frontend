import { useTranslation } from 'react-i18next';
import {
  FunnelSimple,
  CheckCircle,
  XCircle,
  ChartLineUp,
  Clock,
  WarningCircle,
  ClockCountdown,
  HandWaving,
} from '@phosphor-icons/react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { useLeadMetricsQuery } from '../queries/leadsQueries';

export interface LeadMetricsViewProps {
  branchId?: string;
  period?: '7d' | '30d' | '60d' | 'all';
  onPeriodChange?: (period: '7d' | '30d' | '60d' | 'all') => void;
}

const PERIOD_OPTIONS: Array<{
  id: '7d' | '30d' | '60d' | 'all';
  labelKey: string;
  fallback: string;
}> = [
  { id: '7d', labelKey: 'leads.periods.7d', fallback: '7 kun' },
  { id: '30d', labelKey: 'leads.periods.30d', fallback: '30 kun' },
  { id: '60d', labelKey: 'leads.periods.60d', fallback: '60 kun' },
  { id: 'all', labelKey: 'leads.periods.all', fallback: 'Barchasi' },
];

export const LeadMetricsView = ({
  branchId,
  period = '30d',
  onPeriodChange,
}: LeadMetricsViewProps) => {
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
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-9 w-64 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Skeleton className="h-[280px] rounded-2xl" />
          <Skeleton className="h-[280px] rounded-2xl" />
          <Skeleton className="h-[280px] rounded-2xl" />
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
      value: metrics.totalLeads ?? 0,
      icon: FunnelSimple,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400',
    },
    {
      title: t('leads.cohort_converted', 'Davrda yaratilganlardan aylangan'),
      value: metrics.wonLeads ?? 0,
      icon: CheckCircle,
      color:
        'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400',
    },
    {
      title: t('leads.updated_lost', 'Davrda yangilangan yo‘qotilgan lidlar'),
      value: metrics.lostLeads ?? 0,
      icon: XCircle,
      color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400',
    },
    {
      title: t(
        'leads.cohort_conversion',
        'Davrda yaratilganlarning konversiyasi',
      ),
      value: `${metrics.conversionRate ?? 0}%`,
      icon: ChartLineUp,
      color:
        'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400',
    },
    {
      title: t('leads.avg_won_time', 'O‘rtacha yutish muddati'),
      value:
        metrics.avgTimeToWonDays !== null &&
        metrics.avgTimeToWonDays !== undefined
          ? `${metrics.avgTimeToWonDays} ${t('common.days', 'kun')}`
          : '-',
      icon: Clock,
      color:
        'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400',
    },
  ];

  const byStageEntries = Object.entries(metrics.byStage ?? {});
  const bySourceEntries = Object.entries(metrics.bySource ?? {});
  const byLostReasonEntries = Object.entries(metrics.byLostReason ?? {});

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold text-base text-foreground tracking-tight">
          {t('leads.analytics_overview', 'Lidlar tahlili va ko‘rsatkichlari')}
        </h2>
        {onPeriodChange && (
          <div
            role="group"
            aria-label={t('leads.period_selector', 'Tahlil davri')}
            className="inline-flex items-center gap-1 rounded-xl border bg-muted/40 p-1"
          >
            {PERIOD_OPTIONS.map((opt) => {
              const isActive = period === opt.id;
              return (
                <Button
                  key={opt.id}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  aria-pressed={isActive}
                  className="h-8 min-w-[56px] px-2.5 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onPeriodChange(opt.id)}
                >
                  {t(opt.labelKey, opt.fallback)}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Operational Highlights (if available from backend) */}
      {((metrics.overdueCount ?? 0) > 0 ||
        (metrics.untouchedCount ?? 0) > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(metrics.overdueCount ?? 0) > 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3.5 shadow-2xs">
              <div className="rounded-xl bg-destructive/10 p-2 text-destructive">
                <ClockCountdown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-destructive">
                  {t('leads.overdue_tasks_alert', 'Kechikkan vazifalar')}
                </p>
                <p className="font-bold text-lg text-foreground">
                  {metrics.overdueCount} {t('leads.leads_count', 'ta lid')}
                </p>
              </div>
            </div>
          )}
          {(metrics.untouchedCount ?? 0) > 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5 shadow-2xs">
              <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                <HandWaving className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  {t('leads.untouched_alert', '3+ kundan beri tegilmagan')}
                </p>
                <p className="font-bold text-lg text-foreground">
                  {metrics.untouchedCount} {t('leads.leads_count', 'ta lid')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="flex min-h-[104px] flex-col justify-between rounded-2xl border bg-card p-4 shadow-xs"
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
        <section
          aria-labelledby="metrics-stages-heading"
          className="flex min-h-[280px] flex-col rounded-2xl border bg-card p-5 shadow-xs"
        >
          <h3
            id="metrics-stages-heading"
            className="font-semibold text-sm text-foreground"
          >
            {t(
              'leads.open_stage_shares',
              'Hozirgi ochiq lidlarning bosqichlari',
            )}
          </h3>
          <div className="mt-4 flex-1 space-y-3">
            {byStageEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t('leads.no_data', 'Ma’lumotlar yo‘q')}
              </p>
            ) : (
              byStageEntries.map(([stageName, count]) => {
                const total = byStageEntries.reduce(
                  (sum, [, stageCount]) => sum + stageCount,
                  0,
                );
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
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
                    <div
                      role="progressbar"
                      aria-label={`${stageName}: ${count} (${pct}%)`}
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    >
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
        </section>

        {/* Sources Breakdown */}
        <section
          aria-labelledby="metrics-sources-heading"
          className="flex min-h-[280px] flex-col rounded-2xl border bg-card p-5 shadow-xs"
        >
          <h3
            id="metrics-sources-heading"
            className="font-semibold text-sm text-foreground"
          >
            {t('leads.sources_breakdown', 'Manbalar bo‘yicha')}
          </h3>
          <div className="mt-4 flex-1 space-y-3">
            {bySourceEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t('leads.no_data', 'Ma’lumotlar yo‘q')}
              </p>
            ) : (
              bySourceEntries.map(([sourceKey, stat]) => {
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
        </section>

        {/* Lost Reasons Breakdown */}
        <section
          aria-labelledby="metrics-lost-heading"
          className="flex min-h-[280px] flex-col rounded-2xl border bg-card p-5 shadow-xs"
        >
          <h3
            id="metrics-lost-heading"
            className="font-semibold text-sm text-foreground"
          >
            {t(
              'leads.updated_lost_reasons',
              'Davrda yangilangan yo‘qotilgan lidlar sabablari',
            )}
          </h3>
          <div className="mt-4 flex-1 space-y-3">
            {byLostReasonEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t('leads.no_data', 'Ma’lumotlar yo‘q')}
              </p>
            ) : (
              byLostReasonEntries.map(([reasonKey, count]) => {
                const label = t(`leads.lost_reasons.${reasonKey}`, reasonKey);
                const lostCount = metrics.lostLeads ?? 0;
                const pct =
                  lostCount > 0 ? Math.round((count / lostCount) * 100) : 0;
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
                    <div
                      role="progressbar"
                      aria-label={`${label}: ${count} (${pct}%)`}
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    >
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
        </section>
      </div>
    </div>
  );
};
