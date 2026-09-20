import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Wallet, CaretRight } from '@phosphor-icons/react';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useAuthStore } from '@/store/authStore';
import { FinanceSummarySection } from './FinanceSummarySection';
import type { FinanceSummaryQuery } from '@/services/dashboardService';

const UZ_TIMEZONE = 'Asia/Tashkent';
const uzDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: UZ_TIMEZONE,
});

const todayInUz = () => uzDateFormatter.format(new Date());
const startOfMonthInUz = () => `${todayInUz().slice(0, 8)}01`;

/** Accountant-only finance dashboard (lazy route chunk). */
const FinanceDashboard = () => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { searchParams: params } = useUrlParams();

  const query = useMemo<FinanceSummaryQuery>(
    () => ({
      from: params.get('from') || startOfMonthInUz(),
      to: params.get('to') || todayInUz(),
      branchId: user?.branch_id ?? undefined,
    }),
    [params, user?.branch_id],
  );

  return (
    <div data-testid="finance-dashboard" className="space-y-5 pb-8">
      <header className="border-b border-hair pb-5">
        <h1 className="font-heading text-3xl font-extrabold tracking-[-0.02em]">
          {t('dashboard.finance_dashboard.title', 'Moliya paneli')}
        </h1>
        <p className="mt-1.5 max-w-2xl text-[15px] text-muted-foreground">
          {t(
            'dashboard.finance_dashboard.subtitle',
            'Naqd oqimi, majburiyatlar va o‘qituvchi to‘lovlari.',
          )}
        </p>
        <Link
          to="/expenses"
          className="mt-3 inline-flex h-10 items-center gap-1 rounded-md border border-border bg-card px-3 text-[13px] font-semibold hover:bg-muted"
        >
          <Wallet className="h-4 w-4" aria-hidden="true" />
          {t('nav.expenses', 'Xarajatlar')}
          <CaretRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </header>

      <FinanceSummarySection query={query} />
    </div>
  );
};

export default FinanceDashboard;
