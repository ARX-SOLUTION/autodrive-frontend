import { useTranslation } from 'react-i18next';
import { SummaryCard } from '@/components/ui/SummaryCard';
import { formatMoney } from '@/lib/money';
import type { PaymentSummary } from '@/types/payment';
import { Warning, Receipt, Wallet } from '@phosphor-icons/react';

interface PaymentPeriodSummaryProps {
  summary: PaymentSummary;
  totalPayments: number;
}

/** SECTION 3: totals for the currently filtered period. */
export const PaymentPeriodSummary = ({
  summary,
  totalPayments,
}: PaymentPeriodSummaryProps) => {
  const { t } = useTranslation();

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-primary text-balance">
          {t('payments.selected_results')}
        </h2>
        <span className="text-xs text-muted-foreground">
          {t('payments.by_count', { count: totalPayments })}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 tabular-nums">
        <SummaryCard
          title={t('payments.total_collected')}
          value={formatMoney(summary.period_collected)}
          icon={<Wallet className="h-5 w-5" />}
        />
        <SummaryCard
          title={t('payments.payment_count')}
          value={`${summary.period_payments_count}${
            t('common.count_unit') ? ` ${t('common.count_unit')}` : ''
          }`}
          icon={<Receipt className="h-5 w-5" />}
        />
        <SummaryCard
          title={t('payments.stats.debt')}
          value={formatMoney(summary.period_debt)}
          icon={<Warning className="h-5 w-5" />}
        />
      </div>
    </section>
  );
};
