import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useFilterBarState } from '@/hooks/useFilterBarState';
import { parsePage } from '@/lib/listQuery';
import { ActiveFilterChips } from '@/components/filter/ActiveFilterChips';
import {
  GasPump,
  Plus,
  Car,
  Speedometer,
  Buildings,
  CheckCircle,
  Clock,
  XCircle,
  Receipt,
  CurrencyCircleDollar,
  Drop,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { PageHeader } from '@/components/layout/PageHeader';
import PaginationControls from '@/components/ui/PaginationControls';
import { useFuelList } from './service';
import FuelCreateDialog from './FuelCreateDialog';

const STATUS_BADGE: Record<
  string,
  { icon: typeof CheckCircle; className: string }
> = {
  approved: {
    icon: CheckCircle,
    className: 'gap-1 border-success/30 bg-success/10 text-success',
  },
  submitted: {
    icon: Clock,
    className: 'gap-1 border-warning/30 bg-warning/10 text-warning',
  },
  rejected: {
    icon: XCircle,
    className: 'gap-1 border-destructive/30 bg-destructive/10 text-destructive',
  },
};

export default function FuelPage() {
  const { t, i18n } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const { searchParams, setParams } = useUrlParams();
  const status = searchParams.get('status') ?? '';
  const page = parsePage(searchParams.get('page'));

  const setStatus = (nextStatus: string) => {
    setParams({
      status: nextStatus || undefined,
      page: undefined,
    });
  };

  const setPage = (nextPage: number) => {
    setParams({
      page: nextPage > 1 ? String(nextPage) : undefined,
    });
  };

  const clearFilters = () => {
    setParams({
      status: undefined,
      page: undefined,
    });
  };

  const { chips, clearAll } = useFilterBarState({
    filters: [
      Boolean(status) && {
        id: 'status',
        label: t('common.status'),
        value: t(`fuel.${status}`, { defaultValue: status }),
        onRemove: () => setStatus(''),
      },
    ],
    onClearAll: clearFilters,
  });

  const query = useFuelList({ page, limit: 20, status: status || undefined });

  const stats = useMemo(() => {
    const items = query.data?.data ?? [];
    const totalLitres = items.reduce(
      (acc, row) =>
        acc +
        row.lines.reduce(
          (sum, line) =>
            sum + (line.unit === 'litre' ? Number(line.quantity) || 0 : 0),
          0,
        ),
      0,
    );
    const totalCubicMeters = items.reduce(
      (acc, row) =>
        acc +
        row.lines.reduce(
          (sum, line) =>
            sum + (line.unit === 'm3' ? Number(line.quantity) || 0 : 0),
          0,
        ),
      0,
    );
    const totalMoney = items.reduce(
      (acc, row) =>
        acc + row.lines.reduce((s, l) => s + (Number(l.line_total) || 0), 0),
      0,
    );
    return {
      count: query.data?.meta.total ?? 0,
      litres: totalLitres,
      cubicMeters: totalCubicMeters,
      money: totalMoney,
    };
  }, [query.data]);

  const getStatusBadge = (s: string) => {
    const config = STATUS_BADGE[s];
    if (config) {
      const Icon = config.icon;
      return (
        <Badge variant="outline" className={config.className}>
          <Icon className="h-3 w-3" weight="fill" />
          {t(`fuel.${s}`)}
        </Badge>
      );
    }
    if (s === 'cancelled') {
      return (
        <Badge variant="secondary" className="gap-1">
          {t(`fuel.${s}`)}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        {t(`fuel.${s}`)}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={t('fuel.title')}
        title={t('fuel.title')}
        icon={<GasPump className="h-3.5 w-3.5" aria-hidden="true" />}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/fuel-stations"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md border bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Buildings className="h-4 w-4 text-primary" />
              {t('fuel.stations')}
            </Link>

            <Button
              onClick={() => setCreateOpen(true)}
              className="min-h-11 gap-2 bg-primary text-primary-foreground shadow-sm"
            >
              <Plus className="h-4 w-4" weight="bold" />
              {t('fuel.create')}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          title={t('fuel.total_records')}
          value={stats.count}
          icon={<Receipt className="h-5 w-5" aria-hidden="true" />}
          isLoading={query.isLoading}
        />
        <SummaryCard
          title={t('fuel.page_volume')}
          value={
            [
              stats.litres > 0
                ? `${new Intl.NumberFormat(i18n.language, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  }).format(stats.litres)} ${t('fuel.litre')}`
                : null,
              stats.cubicMeters > 0
                ? `${new Intl.NumberFormat(i18n.language, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  }).format(stats.cubicMeters)} ${t('fuel.m3')}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ') || `0 ${t('fuel.litre')}`
          }
          icon={<Drop className="h-5 w-5" aria-hidden="true" />}
          isLoading={query.isLoading}
        />
        <SummaryCard
          title={t('fuel.page_amount')}
          value={`${new Intl.NumberFormat(i18n.language).format(stats.money)} ${t('common.currency')}`}
          icon={<CurrencyCircleDollar className="h-5 w-5" aria-hidden="true" />}
          isLoading={query.isLoading}
        />
      </div>

      <div className="space-y-2 border-b pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t('common.status')}:
            </span>
            <select
              className="h-11 md:h-10 w-44 rounded-md border border-border bg-secondary px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={t('common.status')}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">{t('common.all')}</option>
              {['draft', 'submitted', 'approved', 'rejected', 'cancelled'].map(
                (s) => (
                  <option key={s} value={s}>
                    {t(`fuel.${s}`)}
                  </option>
                ),
              )}
            </select>
            {status && (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 md:min-h-10"
                onClick={clearFilters}
              >
                {t('common.clear')}
              </Button>
            )}
          </div>

          {query.data?.meta && (
            <span className="text-xs text-muted-foreground">
              {t('common.total')}: <strong>{query.data.meta.total}</strong>{' '}
              {t('common.records')}
            </span>
          )}
        </div>
        <ActiveFilterChips chips={chips} onClearAll={clearAll} />
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
      ) : query.isError ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
          <p className="text-sm text-destructive">{t('common.error')}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
          >
            {t('common.retry')}
          </Button>
        </div>
      ) : query.data?.data.length ? (
        <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
          {query.data.data.map((row) => {
            const volumeByUnit = row.lines.reduce(
              (totals, line) => {
                totals[line.unit] += Number(line.quantity) || 0;
                return totals;
              },
              { litre: 0, m3: 0 },
            );
            const totalMoney = row.lines.reduce(
              (acc, l) => acc + (Number(l.line_total) || 0),
              0,
            );

            return (
              <Link
                className="group relative block rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm [contain-intrinsic-size:auto_140px] [content-visibility:auto]"
                key={row.id}
                to="/vehicle-fuel/$id"
                params={{ id: row.id }}
              >
                <div className="flex items-start justify-between gap-2 border-b pb-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary tracking-wide">
                        <Car className="h-3.5 w-3.5" />
                        {row.vehicle_plate}
                      </span>
                      {row.source_status === 'source_verified' && (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-0.5 text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40"
                        >
                          <Receipt className="h-2.5 w-2.5" />
                          {t('fuel.tax_verified')}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                      <Buildings className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{row.station_name}</span>
                    </div>
                  </div>

                  <div>{getStatusBadge(row.status)}</div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs sm:text-sm">
                  <div className="space-y-0.5 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Speedometer className="h-3.5 w-3.5" />
                      <span>
                        {row.odometer_km?.toLocaleString(i18n.language)} km
                      </span>
                    </div>
                    <div>
                      {new Intl.DateTimeFormat(i18n.language, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                        timeZone: 'Asia/Tashkent',
                      }).format(new Date(row.occurred_at))}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-base text-foreground tabular-nums">
                      {new Intl.NumberFormat(i18n.language).format(totalMoney)}{' '}
                      {t('common.currency')}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                      {[
                        volumeByUnit.litre > 0
                          ? `${new Intl.NumberFormat(i18n.language, {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            }).format(volumeByUnit.litre)} ${t('fuel.litre')}`
                          : null,
                        volumeByUnit.m3 > 0
                          ? `${new Intl.NumberFormat(i18n.language, {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            }).format(volumeByUnit.m3)} ${t('fuel.m3')}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}{' '}
                      · {t(`fuel.${row.funding_source}`)}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={GasPump}
          title={t(status ? 'fuel.no_status_records' : 'fuel.empty')}
          description={t(
            status ? 'fuel.no_status_records_desc' : 'fuel.empty_description',
          )}
          action={
            status
              ? {
                  label: t('common.clear'),
                  onClick: () => {
                    setStatus('');
                    setPage(1);
                  },
                }
              : {
                  label: t('fuel.create'),
                  onClick: () => setCreateOpen(true),
                }
          }
        />
      )}

      <PaginationControls
        currentPage={page}
        totalPages={query.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
      />

      <FuelCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
