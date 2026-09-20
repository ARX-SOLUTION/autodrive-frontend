import { useTranslation } from 'react-i18next';
import type { Expense } from '@/types/expense';
import { formatMoney } from '@/lib/money';

type MySettlementsSummaryPanelProps = {
  settlements: Expense[];
  total: number;
  isLoading: boolean;
};

export const MySettlementsSummaryPanel = ({
  settlements,
  total,
  isLoading,
}: MySettlementsSummaryPanelProps) => {
  const { t } = useTranslation();
  const openCount = settlements.filter(
    (row) => row.status === 'planned' || row.status === 'partially_paid',
  ).length;
  const remainingTotal = settlements.reduce(
    (sum, row) => sum + Number(row.remaining_amount),
    0,
  );

  return (
    <section
      aria-labelledby="my-settlements-summary-title"
      aria-busy={isLoading}
      className="grid gap-3 sm:grid-cols-3"
    >
      <div className="glass-card p-4">
        <p
          id="my-settlements-summary-title"
          className="text-xs uppercase tracking-wide text-muted-foreground"
        >
          {t('my_settlements.summary.total')}
        </p>
        <p className="mt-1 font-heading text-xl font-semibold tabular-nums">
          {isLoading ? '—' : total}
        </p>
      </div>
      <div className="glass-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t('my_settlements.summary.open')}
        </p>
        <p className="mt-1 font-heading text-xl font-semibold tabular-nums">
          {isLoading ? '—' : openCount}
        </p>
      </div>
      <div className="glass-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t('my_settlements.summary.remaining')}
        </p>
        <p className="mt-1 font-heading text-xl font-semibold tabular-nums">
          {isLoading ? '—' : formatMoney(remainingTotal)}
        </p>
      </div>
    </section>
  );
};
