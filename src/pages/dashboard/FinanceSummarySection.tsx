import { Link } from '@tanstack/react-router';
import { Warning, ArrowsClockwise, CaretRight } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/money';
import {
  useExpenseBreakdown,
  useFinanceSummary,
  type ExpenseBreakdown,
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

type ExpenseBreakdownPanelProps = {
  breakdown: ExpenseBreakdown;
  query: FinanceSummaryQuery;
};

const ExpenseBreakdownPanel = ({
  breakdown,
  query,
}: ExpenseBreakdownPanelProps) => {
  const { t } = useTranslation();
  const expenseDateSearch = {
    date_from: breakdown.from,
    date_to: breakdown.to,
  };
  const selectedBranchSearch = query.branchId
    ? { branch_id: query.branchId }
    : {};
  const hasBreakdownRows =
    breakdown.by_branch.length > 0 || breakdown.by_category.length > 0;

  return (
    <section
      data-testid="finance-expense-breakdown"
      className="mt-5 border-t border-border pt-5"
      aria-label={t('dashboard.finance_summary.expense_breakdown.title')}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-bold tracking-tight">
            {t('dashboard.finance_summary.expense_breakdown.title')}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('dashboard.finance_summary.expense_breakdown.subtitle')}
          </p>
        </div>
        <p className="text-sm font-semibold tabular-nums">
          <span className="mr-2 text-xs font-medium text-muted-foreground">
            {t('dashboard.finance_summary.expense_breakdown.ledger_total')}
          </span>
          {formatMoney(breakdown.total)}
        </p>
      </div>

      {hasBreakdownRows ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="border-border bg-card p-4 shadow-none">
            <h4 className="text-sm font-semibold">
              {t('dashboard.finance_summary.expense_breakdown.by_branch')}
            </h4>
            <div className="mt-2 divide-y divide-border">
              {breakdown.by_branch.map((branch) => (
                <Link
                  key={branch.branch_id}
                  to="/expenses"
                  search={{ ...expenseDateSearch, branch_id: branch.branch_id }}
                  data-testid={`finance-expense-branch-${branch.branch_id}`}
                  aria-label={t(
                    'dashboard.finance_summary.expense_breakdown.drill_down',
                    { label: branch.branch_name },
                  )}
                  className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm hover:text-primary"
                >
                  <span className="font-medium">{branch.branch_name}</span>
                  <span className="flex items-center gap-1 whitespace-nowrap font-semibold tabular-nums">
                    {formatMoney(branch.total)}
                    <CaretRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </Link>
              ))}
              {!query.branchId && (
                <Link
                  to="/expenses"
                  search={{ ...expenseDateSearch, scope: 'company' }}
                  data-testid="finance-expense-company-wide"
                  aria-label={t(
                    'dashboard.finance_summary.expense_breakdown.drill_down',
                    {
                      label: t(
                        'dashboard.finance_summary.expense_breakdown.company_wide',
                      ),
                    },
                  )}
                  className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm hover:text-primary"
                >
                  <span className="font-medium">
                    {t(
                      'dashboard.finance_summary.expense_breakdown.company_wide',
                    )}
                  </span>
                  <span className="flex items-center gap-1 whitespace-nowrap font-semibold tabular-nums">
                    {formatMoney(breakdown.company_wide.total)}
                    <CaretRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </Link>
              )}
            </div>
          </Card>

          <Card className="border-border bg-card p-4 shadow-none">
            <h4 className="text-sm font-semibold">
              {t('dashboard.finance_summary.expense_breakdown.by_category')}
            </h4>
            <div className="mt-2 divide-y divide-border">
              {breakdown.by_category.map((category) => (
                <Link
                  key={category.category}
                  to="/expenses"
                  search={{
                    ...expenseDateSearch,
                    ...selectedBranchSearch,
                    category: category.category,
                  }}
                  data-testid={`finance-expense-category-${category.category}`}
                  aria-label={t(
                    'dashboard.finance_summary.expense_breakdown.drill_down',
                    { label: t(`expenses.category.${category.category}`) },
                  )}
                  className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm hover:text-primary"
                >
                  <span className="font-medium">
                    {t(`expenses.category.${category.category}`)}
                  </span>
                  <span className="flex items-center gap-1 whitespace-nowrap font-semibold tabular-nums">
                    {formatMoney(category.total)}
                    <CaretRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border/80 bg-muted/10 p-4 text-center text-sm text-muted-foreground">
          {t('dashboard.finance_summary.expense_breakdown.empty')}
        </p>
      )}
    </section>
  );
};

/** Owner/manager finance KPI strip — hidden from direct dev/operator. */
export const FinanceSummarySection = ({
  query = {},
  className,
}: FinanceSummarySectionProps) => {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch, isFetching } =
    useFinanceSummary(query);
  const {
    data: expenseBreakdown,
    isLoading: isExpenseBreakdownLoading,
    isError: isExpenseBreakdownError,
    refetch: refetchExpenseBreakdown,
    isFetching: isExpenseBreakdownFetching,
  } = useExpenseBreakdown(query);

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

      {isExpenseBreakdownLoading ? (
        <div
          data-testid="finance-expense-breakdown"
          className="mt-5 border-t border-border pt-5"
          aria-busy="true"
        >
          <Skeleton className="h-36 rounded-lg" />
        </div>
      ) : isExpenseBreakdownError ? (
        <Card
          data-testid="finance-expense-breakdown"
          className="mt-5 border-destructive/30 bg-destructive/5 p-4 shadow-none"
        >
          <p className="text-sm font-semibold">
            {t('dashboard.finance_summary.expense_breakdown.error_title')}
          </p>
          <Button
            className="mt-3"
            size="sm"
            onClick={() => void refetchExpenseBreakdown()}
            disabled={isExpenseBreakdownFetching}
          >
            <ArrowsClockwise className="mr-1.5 h-3.5 w-3.5" />
            {t('common.retry', 'Qayta urinish')}
          </Button>
        </Card>
      ) : expenseBreakdown ? (
        <ExpenseBreakdownPanel breakdown={expenseBreakdown} query={query} />
      ) : null}
    </section>
  );
};

export default FinanceSummarySection;
