import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui/EmptyState';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { formatMoney } from '@/lib/money';
import type { PaymentSnapshot } from '@/types/payment';
import { Warning, Sun, TrendUp, UsersThree } from '@phosphor-icons/react';

interface PaymentSnapshotCardsProps {
  snapshot: PaymentSnapshot | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

/** SECTION 1: current status snapshot — not affected by the filters. */
export const PaymentSnapshotCards = ({
  snapshot,
  isLoading,
  isError,
  onRetry,
}: PaymentSnapshotCardsProps) => {
  const { t } = useTranslation();
  const showLoading = isLoading || !snapshot;

  return (
    <section>
      <div className="flex items-center justify-between mb-3 tabular-nums">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground text-balance">
          {t('payments.current_status')}
        </h2>
        <span className="text-xs text-muted-foreground">
          {t('payments.not_filter_dependent')}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isError ? (
          <div className="glass-card md:col-span-2 lg:col-span-4">
            <EmptyState
              title={t('common.error')}
              action={{ label: t('common.retry'), onClick: onRetry }}
            />
          </div>
        ) : (
          <>
            <SummaryCard
              title={t('payments.stats.today_income')}
              value={formatMoney(snapshot?.today_income ?? 0)}
              icon={<Sun className="h-5 w-5" />}
              isLoading={showLoading}
            />
            <SummaryCard
              title={t('payments.stats.month_income')}
              value={formatMoney(snapshot?.this_month_income ?? 0)}
              icon={<TrendUp className="h-5 w-5" />}
              isLoading={showLoading}
            />
            <SummaryCard
              title={t('payments.stats.total_debt')}
              value={formatMoney(snapshot?.current_total_debt ?? 0)}
              icon={<Warning className="h-5 w-5" />}
              isLoading={showLoading}
            />
            <SummaryCard
              title={t('payments.stats.debtor_students')}
              value={`${snapshot?.students_with_debt ?? 0}${
                t('common.count_unit') ? ` ${t('common.count_unit')}` : ''
              }`}
              icon={<UsersThree className="h-5 w-5" />}
              isLoading={showLoading}
            />
          </>
        )}
      </div>
    </section>
  );
};
