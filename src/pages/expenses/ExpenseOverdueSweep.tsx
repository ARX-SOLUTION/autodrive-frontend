import { useEffect, useId, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { Warning, Wallet } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useCan } from '@/hooks/useCan';
import { formatMoney } from '@/lib/money';
import type { OverdueExpense } from '@/types/expense';

interface ExpenseOverdueReturnContext {
  return_attention: 'overdue';
  return_branch_id?: string;
  return_scope?: 'company';
}

interface ExpenseOverdueSweepProps {
  expenses: OverdueExpense[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  onRetry: () => void;
  returnContext: ExpenseOverdueReturnContext;
}

const overdueLinkSelector = '[data-overdue-shortcut]';
const interactiveSelector =
  'a[href], button, details, summary, input, select, textarea, option, audio[controls], video[controls], iframe, embed, object, [contenteditable]:not([contenteditable="false"]), [role]:not([role="none"]):not([role="presentation"]), [tabindex]:not([tabindex="-1"])';

const buckets = [
  {
    key: 'bucket_1_7',
    includes: (overdueDays: number) => overdueDays <= 7,
  },
  {
    key: 'bucket_8_30',
    includes: (overdueDays: number) => overdueDays >= 8 && overdueDays <= 30,
  },
  {
    key: 'bucket_31_plus',
    includes: (overdueDays: number) => overdueDays >= 31,
  },
] as const;

export const ExpenseOverdueSweep = ({
  expenses,
  isLoading,
  isFetching,
  isError,
  onRetry,
  returnContext,
}: ExpenseOverdueSweepProps) => {
  const { t } = useTranslation();
  const canNavigateSweep = useCan('navigateExpenseOverdueSweep');
  const regionRef = useRef<HTMLElement>(null);
  const focusAfterRetry = useRef(false);
  const shortcutId = useId();
  const shortcutHelpId = `expense-overdue-shortcut-${shortcutId.replace(/:/g, '')}`;
  const shortcutActive =
    canNavigateSweep && !isLoading && !isError && expenses.length > 0;

  useEffect(() => {
    if (!focusAfterRetry.current || isLoading || isFetching) return;
    focusAfterRetry.current = false;
    if (!isError) regionRef.current?.focus();
  }, [isError, isFetching, isLoading]);

  useEffect(() => {
    if (!shortcutActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.key !== 'p' ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.repeat ||
        event.isComposing
      ) {
        return;
      }

      const target = event.target;
      if (target instanceof Element) {
        const overdueTarget = target.closest(overdueLinkSelector);
        const isFocusedOverdueLink =
          overdueTarget !== null && overdueTarget === document.activeElement;
        if (!isFocusedOverdueLink && target.closest(interactiveSelector))
          return;
      }

      const links = Array.from(
        regionRef.current?.querySelectorAll<HTMLAnchorElement>(
          overdueLinkSelector,
        ) ?? [],
      );
      if (links.length === 0) return;

      const currentIndex = links.indexOf(
        document.activeElement as HTMLAnchorElement,
      );
      event.preventDefault();
      links[(currentIndex + 1) % links.length].focus();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcutActive]);

  const handleRetry = () => {
    focusAfterRetry.current = true;
    onRetry();
  };

  return (
    <section
      ref={regionRef}
      tabIndex={-1}
      aria-label={t('expenses.overdue_sweep.title')}
      aria-describedby={shortcutActive ? shortcutHelpId : undefined}
      aria-keyshortcuts={shortcutActive ? 'P' : undefined}
      aria-busy={isLoading || isFetching}
      className="space-y-6 p-3 md:p-5"
    >
      <p role="status" aria-live="polite" className="sr-only">
        {isLoading
          ? t('common.loading')
          : isError && !isFetching
            ? t('expenses.overdue_sweep.load_error')
            : ''}
      </p>
      {shortcutActive && (
        <p id={shortcutHelpId} className="text-sm text-muted-foreground">
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground">
            P
          </kbd>{' '}
          {t('expenses.overdue_sweep.shortcut_help')}
        </p>
      )}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={Warning}
          title={t('expenses.overdue_sweep.load_error')}
          action={{ label: t('common.retry'), onClick: handleRetry }}
        />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={t('expenses.overdue_sweep.empty')}
          description={t('expenses.overdue_sweep.empty_desc')}
        />
      ) : (
        buckets.map((bucket) => {
          const bucketExpenses = expenses.filter((expense) =>
            bucket.includes(expense.overdue_days),
          );
          if (bucketExpenses.length === 0) return null;
          const headingId = `expense-overdue-${bucket.key}`;

          return (
            <div key={bucket.key} className="space-y-3">
              <h3
                id={headingId}
                className="font-heading text-base font-semibold text-foreground"
              >
                {t(`expenses.overdue_sweep.${bucket.key}`)}
              </h3>
              <ul role="list" aria-labelledby={headingId} className="space-y-3">
                {bucketExpenses.map((expense) => (
                  <li key={expense.id}>
                    <Link
                      to="/expenses/$id"
                      params={{ id: expense.id }}
                      search={returnContext}
                      data-overdue-shortcut
                      className="block min-h-10 rounded-xl border border-border bg-card p-4 text-card-foreground transition-colors hover:border-primary/40 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="font-heading font-semibold">
                          {expense.title}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {expense.branch_name ??
                            t('expenses.form.company_wide')}
                        </span>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            {t('expenses.table.category')}
                          </dt>
                          <dd className="mt-0.5 font-medium">
                            {t(`expenses.category.${expense.category}`)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            {t('expenses.form.due_date')}
                          </dt>
                          <dd className="mt-0.5 font-medium tabular-nums">
                            {expense.due_date ?? t('common.na')}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            {t('expenses.overdue_sweep.overdue_days')}
                          </dt>
                          <dd className="mt-0.5 font-medium tabular-nums text-destructive">
                            {expense.overdue_days}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            {t('expenses.table.remaining')}
                          </dt>
                          <dd className="mt-0.5 font-mono font-medium tabular-nums">
                            {formatMoney(expense.remaining_amount)}
                          </dd>
                        </div>
                      </dl>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
};
