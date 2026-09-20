import { Warning, ArrowsClockwise } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/money';
import {
  useFinanceSummary,
  type FinanceSummaryQuery,
} from '@/services/dashboardService';

const KPI_KEYS = [
  'income',
  'paid_expenses',
  'cash_flow_balance',
  'outstanding_expenses',
  'teacher_payable',
] as const;

type FinanceSummarySectionProps = {
  query?: FinanceSummaryQuery;
  className?: string;
};

/** Owner/manager finance KPI strip — hidden from direct dev/operator. */
export const FinanceSummarySection = ({
  query = {},
  className,
}: FinanceSummarySectionProps) => {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch, isFetching } =
    useFinanceSummary(query);

  if (isLoading) {
    return (
      <section
        data-testid="finance-summary-section"
        data-state="loading"
        className={className}
        aria-busy="true"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {KPI_KEYS.map((key) => (
            <Skeleton key={key} className="h-24 rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section
        data-testid="finance-summary-section"
        data-state="error"
        className={className}
      >
        <Card className="border-destructive/30 bg-destructive/5 p-6 text-center shadow-none">
          <Warning className="mx-auto h-7 w-7 text-destructive" />
          <p className="mt-2 text-sm font-semibold">
            {t(
              'dashboard.finance_summary.error_title',
              "Moliya ko'rsatkichlarini yuklab bo'lmadi",
            )}
          </p>
          <Button
            className="mt-3"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <ArrowsClockwise className="mr-1.5 h-3.5 w-3.5" />
            {t('common.retry', 'Qayta urinish')}
          </Button>
        </Card>
      </section>
    );
  }

  if (!data) return null;

  const values = KPI_KEYS.map((key) => data[key]);
  const allZero = values.every((value) => Number(value) === 0);

  return (
    <section
      data-testid="finance-summary-section"
      data-state="ready"
      className={className}
      aria-label={t(
        'dashboard.finance_summary.title',
        'Moliya ko‘rsatkichlari',
      )}
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            {t('dashboard.finance_summary.title', 'Moliya ko‘rsatkichlari')}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(
              'dashboard.finance_summary.subtitle',
              'Tanlangan davr naqd oqimi va joriy majburiyatlar.',
            )}{' '}
            · {data.from} — {data.to}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {KPI_KEYS.map((key) => (
          <Card
            key={key}
            data-testid={`finance-kpi-${key}`}
            className="border-border bg-card p-4 shadow-none"
          >
            <p className="text-[11px] font-semibold text-muted-foreground">
              {t(`dashboard.finance_summary.${key}`)}
            </p>
            <p className="mt-2 font-heading text-xl font-bold tabular-nums">
              {formatMoney(data[key])}
            </p>
          </Card>
        ))}
      </div>

      {allZero && (
        <p
          data-testid="finance-summary-empty"
          className="mt-3 rounded-lg border border-dashed border-border/80 bg-muted/10 p-4 text-center text-sm text-muted-foreground"
        >
          {t(
            'dashboard.finance_summary.empty',
            'Tanlangan davr uchun moliya harakati yo‘q',
          )}
        </p>
      )}

      <div
        data-testid="finance-summary-breakdown-empty"
        className="mt-3 rounded-lg border border-dashed border-border/80 bg-muted/10 p-4 text-center text-sm text-muted-foreground"
      >
        {t(
          'dashboard.finance_summary.breakdown_empty',
          'Filial va kategoriya taqsimoti hali yo‘q',
        )}
      </div>
    </section>
  );
};

export default FinanceSummarySection;
