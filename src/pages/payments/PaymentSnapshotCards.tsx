import { useTranslation } from 'react-i18next';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { formatMoney } from '@/lib/money';
import type { PaymentSnapshot } from '@/types/payment';
import { AlertTriangle, Sun, TrendingUp, Users } from 'lucide-react';

interface PaymentSnapshotCardsProps {
  snapshot: PaymentSnapshot | undefined;
  isLoading: boolean;
}

/** SECTION 1: current status snapshot — not affected by the filters. */
export const PaymentSnapshotCards = ({
  snapshot,
  isLoading,
}: PaymentSnapshotCardsProps) => {
  const { t } = useTranslation();

  return (
    <section>
      <div className="flex items-center justify-between mb-3 tabular-nums">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-balance">
          {t('payments.current_status')}
        </h2>
        <span className="text-xs text-muted-foreground">
          {t('payments.not_filter_dependent')}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title={t('payments.stats.today_income')}
          value={formatMoney(snapshot?.today_income || 0)}
          icon={<Sun className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <SummaryCard
          title={t('payments.stats.month_income')}
          value={formatMoney(snapshot?.this_month_income || 0)}
          icon={<TrendingUp className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <SummaryCard
          title={t('payments.stats.total_debt')}
          value={formatMoney(snapshot?.current_total_debt || 0)}
          icon={<AlertTriangle className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <SummaryCard
          title={t('payments.stats.debtor_students')}
          value={`${snapshot?.students_with_debt || 0}${
            t('common.count_unit') ? ` ${t('common.count_unit')}` : ''
          }`}
          icon={<Users className="h-5 w-5" />}
          isLoading={isLoading}
        />
      </div>
    </section>
  );
};
