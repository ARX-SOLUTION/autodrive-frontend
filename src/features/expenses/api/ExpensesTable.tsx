import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { createDataGridColumnHelper, DataGrid } from '@/shared/ui/data-grid';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { DataCard } from '@/components/ui/DataCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/useCan';
import { useViewTransitionNavigate } from '@/hooks/useViewTransitionNavigate';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/shared/lib/studentsFormat';
import type { Expense, ExpenseStatus } from '@/features/expenses/types';
import { cn } from '@/lib/utils';
import { Wallet, Warning } from '@phosphor-icons/react';

interface ExpensesTableProps {
  expenses: Expense[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  onRetry: () => void;
  currentPage: number;
  pageSize: number;
  totalExpenses: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  /** Any active filter or search term — swaps the empty copy and copy. */
  isFiltered?: boolean;
}

const columnHelper = createDataGridColumnHelper<Expense>();

const statusVariant = (status: ExpenseStatus) => {
  if (status === 'cancelled') return 'destructive' as const;
  if (status === 'paid') return 'default' as const;
  return 'secondary' as const;
};

const statusLabelKey = (status: ExpenseStatus) =>
  `expenses.status.${status}` as const;

const PayRemainingLink = ({
  expense,
  fullWidth = false,
}: {
  expense: Expense;
  fullWidth?: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className={fullWidth ? 'w-full' : undefined}
    >
      <Link
        to="/expenses/$id"
        params={{ id: expense.id }}
        search={{ tab: 'payments', action: 'pay_remaining' }}
        aria-label={`${t('expenses.payments.submit')}: ${expense.title}`}
      >
        {t('expenses.payments.submit')}
      </Link>
    </Button>
  );
};

const ExpenseMobileCard = ({
  expense,
  onActivate,
  showPayRemaining,
}: {
  expense: Expense;
  onActivate: (element: HTMLElement) => void;
  showPayRemaining: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <DataCard
        title={expense.title}
        subtitle={expense.branch_name ?? t('expenses.form.company_wide')}
        onClick={(event) => onActivate(event.currentTarget)}
        fields={[
          {
            label: t('expenses.table.date'),
            value: formatDate(expense.expense_date),
          },
          ...(expense.vehicle_plate_number
            ? [
                {
                  label: t('expenses.table.vehicle'),
                  value: expense.vehicle_plate_number,
                },
              ]
            : []),
          {
            label: t('expenses.table.category'),
            value: t(`expenses.category.${expense.category}`),
          },
          {
            label: t('expenses.table.amount'),
            value: formatMoney(expense.amount),
          },
          {
            label: t('expenses.table.paid'),
            value: formatMoney(expense.paid_amount),
          },
          {
            label: t('expenses.table.remaining'),
            value: formatMoney(expense.remaining_amount),
          },
          {
            label: t('expenses.table.status'),
            value: (
              <Badge variant={statusVariant(expense.status)}>
                {t(statusLabelKey(expense.status))}
              </Badge>
            ),
          },
        ]}
      />
      {showPayRemaining && <PayRemainingLink expense={expense} fullWidth />}
    </div>
  );
};

export const ExpensesTable = ({
  expenses,
  isLoading,
  isFetching,
  isError,
  onRetry,
  currentPage,
  pageSize,
  totalExpenses,
  totalPages,
  onPageChange,
  onPageSizeChange,
  isFiltered = false,
}: ExpensesTableProps) => {
  const { t } = useTranslation();
  const canManageFinance = useCan('expenses.pay');
  const navigate = useViewTransitionNavigate();

  // ponytail: memoised because a fresh array identity invalidates TanStack
  // Table's column tree, which re-instantiates every Cell object on each
  // render — 11 columns x pageSize cells. t and canManageFinance are the real
  // dependencies; the row-index cell reads currentPage/pageSize off the row.
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: 'index',
          header: '#',
          cell: ({ row }) => (currentPage - 1) * pageSize + row.index + 1,
          meta: {
            align: 'center',
            cellClassName: 'text-muted-foreground',
          },
        }),
        columnHelper.accessor('title', {
          header: t('expenses.table.title'),
          cell: ({ getValue }) => getValue(),
          meta: { cellClassName: 'font-medium' },
        }),
        columnHelper.accessor('branch_name', {
          header: t('expenses.table.branch'),
          cell: ({ getValue }) => getValue() ?? t('expenses.form.company_wide'),
          meta: { cellClassName: 'text-muted-foreground' },
        }),
        columnHelper.accessor('vehicle_plate_number', {
          header: t('expenses.table.vehicle'),
          cell: ({ getValue }) => getValue() ?? t('common.na'),
          meta: { cellClassName: 'text-muted-foreground' },
        }),
        columnHelper.accessor('category', {
          header: t('expenses.table.category'),
          cell: ({ getValue }) => t(`expenses.category.${getValue()}`),
          meta: { cellClassName: 'text-xs' },
        }),
        columnHelper.accessor('expense_date', {
          header: t('expenses.table.date'),
          cell: ({ getValue }) => formatDate(getValue()),
          meta: { cellClassName: 'text-muted-foreground tabular-nums' },
        }),
        columnHelper.accessor('amount', {
          header: t('expenses.table.amount'),
          cell: ({ getValue }) => formatMoney(getValue()),
          meta: {
            align: 'right',
            cellClassName: 'whitespace-nowrap tabular-nums font-mono',
          },
        }),
        columnHelper.accessor('paid_amount', {
          header: t('expenses.table.paid'),
          cell: ({ getValue }) => formatMoney(getValue()),
          meta: {
            align: 'right',
            cellClassName: 'whitespace-nowrap tabular-nums font-mono',
          },
        }),
        columnHelper.accessor('remaining_amount', {
          header: t('expenses.table.remaining'),
          cell: ({ getValue }) => formatMoney(getValue()),
          meta: {
            align: 'right',
            cellClassName: 'whitespace-nowrap tabular-nums font-mono',
          },
        }),
        columnHelper.accessor('status', {
          header: t('expenses.table.status'),
          cell: ({ getValue }) => (
            <Badge variant={statusVariant(getValue())}>
              {t(statusLabelKey(getValue()))}
            </Badge>
          ),
          meta: { align: 'center' },
        }),
        ...(canManageFinance
          ? [
              columnHelper.display({
                id: 'payment-action',
                header: t('expenses.payments.title'),
                cell: ({ row }) =>
                  row.original.status === 'partially_paid' ? (
                    <PayRemainingLink expense={row.original} />
                  ) : null,
                meta: { align: 'center' },
              }),
            ]
          : []),
      ]),
    [t, canManageFinance, currentPage, pageSize],
  );

  const openExpense = (expense: Expense, element: HTMLElement | null) =>
    navigate(
      {
        to: '/expenses/$id',
        params: { id: expense.id },
      },
      element,
      `expense-${expense.id}`,
    );

  // A filtered-to-nothing list must not tell the user to create their first
  // expense while the footer still reads "1–10 / 400".
  const emptyState = isFiltered ? (
    <EmptyState
      icon={Wallet}
      title={t('expenses.empty_filtered')}
      description={t('expenses.empty_filtered_desc')}
    />
  ) : (
    <EmptyState
      icon={Wallet}
      title={t('expenses.empty')}
      description={t('expenses.empty_desc')}
    />
  );

  return (
    <DataGrid
      data={expenses}
      columns={columns}
      getRowId={(expense) => expense.id}
      pagination={{
        pageIndex: Math.max(0, currentPage - 1),
        pageSize,
        rowCount: totalExpenses,
        pageCount: totalPages,
      }}
      onPaginationChange={(pagination) =>
        onPageChange(pagination.pageIndex + 1)
      }
      onPageSizeChange={onPageSizeChange}
      sorting={[]}
      onSortingChange={() => undefined}
      columnFilters={[]}
      onColumnFiltersChange={() => undefined}
      manualPagination
      manualSorting
      manualFiltering
      isInitialLoading={isLoading}
      isFetching={isFetching}
      labels={{
        table: t('expenses.title'),
        loading: t('common.loading'),
        fetching: t('common.loading'),
        previousPage: t('common.previous'),
        nextPage: t('common.next'),
      }}
      loadingState={
        <div className="grid gap-3 p-3 md:p-0">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-5 w-full" />
          ))}
        </div>
      }
      errorState={
        isError ? (
          <EmptyState
            icon={Warning}
            title={t('common.error')}
            action={{ label: t('common.retry'), onClick: onRetry }}
          />
        ) : undefined
      }
      emptyState={emptyState}
      renderMobileRow={({ row }) => (
        <ExpenseMobileCard
          expense={row}
          onActivate={(element) => openExpense(row, element)}
          showPayRemaining={canManageFinance && row.status === 'partially_paid'}
        />
      )}
      onRowActivate={(expense, element) => openExpense(expense, element)}
      getRowAriaLabel={(expense) => expense.title}
      rowClassName={() => 'table-row-interactive'}
      className={cn(
        'glass-card overflow-hidden p-3 transition-opacity duration-200 md:p-0',
        isFetching && !isLoading && 'opacity-50',
      )}
    />
  );
};
