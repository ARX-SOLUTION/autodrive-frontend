import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui/EmptyState';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { formatMoney } from '@/lib/money';
import type { PaymentSummary } from '@/types/payment';
import { Warning, Receipt, Wallet } from '@phosphor-icons/react';

interface PaymentPeriodSummaryProps {
  summary: PaymentSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

/** SECTION 3: totals for the currently filtered period. */
export const PaymentPeriodSummary = ({
  summary,
  isLoading,
  isError,
  onRetry,
}: PaymentPeriodSummaryProps) => {
  const { t } = useTranslation();
  const showLoading = isLoading || !summary;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-primary text-balance">
          {t('payments.selected_results')}
        </h2>
        {summary && !isError && (
          <span className="text-xs text-muted-foreground">
            {t('payments.by_count', {
              count: summary.period_payments_count,
            })}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 tabular-nums">
        {isError ? (
          <div className="glass-card md:col-span-3">
            <EmptyState
              title={t('common.error')}
              action={{ label: t('common.retry'), onClick: onRetry }}
            />
          </div>
        ) : (
          <>
            <SummaryCard
              title={t('payments.total_collected')}
              value={formatMoney(summary?.period_collected ?? 0)}
              icon={<Wallet className="h-5 w-5" />}
              isLoading={showLoading}
            />
            <SummaryCard
              title={t('payments.payment_count')}
              value={`${summary?.period_payments_count ?? 0}${
                t('common.count_unit') ? ` ${t('common.count_unit')}` : ''
              }`}
              icon={<Receipt className="h-5 w-5" />}
              isLoading={showLoading}
            />
            <SummaryCard
              title={t('payments.stats.debt')}
              value={formatMoney(summary?.period_debt ?? 0)}
              icon={<Warning className="h-5 w-5" />}
              isLoading={showLoading}
            />
          </>
        )}
      </div>
    </section>
  );
};
