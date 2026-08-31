import { useTranslation } from 'react-i18next';
import { createDataGridColumnHelper, DataGrid } from '@/shared/ui/data-grid';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { DataCard } from '@/components/ui/DataCard';
import { Badge } from '@/components/ui/badge';
import { useViewTransitionNavigate } from '@/hooks/useViewTransitionNavigate';
import { formatMoney } from '@/lib/money';
import type { Expense, ExpenseStatus } from '@/types/expense';
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
}

const columnHelper = createDataGridColumnHelper<Expense>();

const statusVariant = (status: ExpenseStatus) => {
  if (status === 'cancelled') return 'destructive' as const;
  if (status === 'paid') return 'default' as const;
  return 'secondary' as const;
};

const statusLabelKey = (status: ExpenseStatus) =>
  `expenses.status.${status}` as const;

const ExpenseMobileCard = ({
  expense,
  onActivate,
}: {
  expense: Expense;
  onActivate: (element: HTMLElement) => void;
}) => {
  const { t } = useTranslation();
  return (
    <DataCard
      title={expense.title}
      subtitle={expense.branch_name ?? t('expenses.form.company_wide')}
      onClick={(event) => onActivate(event.currentTarget)}
      fields={[
        { label: t('expenses.table.date'), value: expense.expense_date },
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
}: ExpensesTableProps) => {
  const { t } = useTranslation();
  const navigate = useViewTransitionNavigate();

  const columns = columnHelper.columns([
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
    columnHelper.accessor('category', {
      header: t('expenses.table.category'),
      cell: ({ getValue }) => t(`expenses.category.${getValue()}`),
      meta: { cellClassName: 'text-xs' },
    }),
    columnHelper.accessor('expense_date', {
      header: t('expenses.table.date'),
      cell: ({ getValue }) => getValue(),
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
  ]);

  const openExpense = (expense: Expense, element: HTMLElement | null) =>
    navigate(
      {
        to: '/expenses/$id',
        params: { id: expense.id },
      },
      element,
      `expense-${expense.id}`,
    );

  const emptyState = (
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
        />
      )}
      onRowActivate={(expense, element) => openExpense(expense, element)}
      getRowAriaLabel={(expense) => expense.title}
      rowClassName={() => 'table-row-interactive'}
      className="p-3 md:p-0"
    />
  );
};
