import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DataGrid,
  createDataGridColumnHelper,
  type DataGridColumnDef,
} from '@/shared/ui/data-grid';
import {
  PencilSimple,
  Trash,
  ArrowCounterClockwise,
  GraduationCap,
  Warning,
  Plus,
} from '@phosphor-icons/react';
import { formatPhone } from '@/lib/phoneFormater';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { DebtStatusBadge } from '@/components/ui/DebtStatusBadge';
import { DeletedBadge } from '@/components/ui/DeletedBadge';
import type { Student } from '@/types/student';
import type { CourseTypeTab } from '@/components/ui/course-type-tabs';
import {
  capitalize,
  formatDate,
  formatDateTime,
  resultLabels,
} from './studentsFormat';

interface StudentsTableProps {
  students: Student[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  onRetry: () => void;
  totalStudents: number;
  startIndex: number;
  currentPage: number;
  pageSize: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  courseType: CourseTypeTab;
  sortField: string;
  sortDir: 'asc' | 'desc';
  toggleSort: (field: string) => void;
  canManageStudents: boolean;
  isCrossTenant: boolean;
  // Teacher must never see payment amounts (recordPayment cap) — hides the
  // initial/second/third-payment columns entirely (no orphan money-only
  // header left behind) and switches the debt column to a paid/owing badge
  // (autodrive-vh0.5) instead of dropping it.
  canViewPayments: boolean;
  onOpenStudent: (student: Student, el: HTMLElement) => void;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  // autodrive-cg9: owner-only "show deleted" toggle — a deleted row swaps
  // edit/delete for a single restore action.
  canViewDeleted: boolean;
  onRestore: (id: string) => void;
}

const columnHelper = createDataGridColumnHelper<Student>();

export const StudentsTable = ({
  students,
  isLoading,
  isFetching,
  isError,
  onRetry,
  totalStudents,
  startIndex,
  currentPage,
  pageSize,
  pageCount,
  onPageChange,
  courseType,
  sortField,
  sortDir,
  toggleSort,
  canManageStudents,
  isCrossTenant,
  canViewPayments,
  onOpenStudent,
  onEdit,
  onDelete,
  onCreate,
  canViewDeleted,
  onRestore,
}: StudentsTableProps) => {
  const { t } = useTranslation();
  const localizedResultLabels = resultLabels(t);

  // debt is optional now (backend omits it for a teacher) -- canViewPayments
  // is what actually gates whether this renders, but the field itself isn't
  // guaranteed present, so guard it here too rather than let a stray
  // undefined reach formatMoney's silent "0 so'm".
  const debtCell = (debt: number | undefined) => {
    if (debt === undefined) return <span>{t('common.na')}</span>;
    return (
      <span
        className={debt > 0 ? 'text-destructive' : 'text-success'}
        aria-label={
          debt > 0
            ? t('students.debt_status_owed')
            : debt < 0
              ? t('students.debt_status_credit')
              : t('students.debt_status_paid')
        }
      >
        {debt > 0
          ? formatMoney(debt)
          : debt < 0
            ? `${t('students.credit_label')}: ${formatMoney(Math.abs(debt))}`
            : t('students.debt_status_paid')}
      </span>
    );
  };

  // ponytail: Record<string,string> (not Record<ResultStatus,string>) per
  // spec, so the fallback branch below is reachable if an unexpected value
  // ever shows up.
  const statusTone: Record<string, string> = {
    oqimoqda: 'border-info/40 text-info',
    topshirdi: 'border-success/40 text-success',
    yiqildi: 'border-destructive/40 text-destructive',
  };

  const resultCell = (result: Student['result']) => (
    <span
      className={cn(
        'inline-flex items-center rounded border bg-transparent px-2 py-0.5 font-mono text-xs',
        statusTone[result] || 'border-border text-muted-foreground',
      )}
    >
      {localizedResultLabels[result]}
    </span>
  );

  const indexColumn = columnHelper.display({
    id: 'index',
    header: '#',
    meta: {
      align: 'center',
      cellClassName: 'text-muted-foreground',
    },
    cell: ({ row }) => startIndex + row.index + 1,
  });

  const nameColumns = columnHelper.columns([
    columnHelper.accessor('last_name', {
      header: t('students.last_name'),
      enableSorting: true,
      meta: { cellClassName: 'font-medium' },
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5">
          {capitalize(row.original.last_name)}
          {row.original.deleted_at && <DeletedBadge />}
        </span>
      ),
    }),
    columnHelper.accessor('first_name', {
      header: t('students.first_name'),
      enableSorting: true,
      cell: ({ getValue }) => capitalize(getValue()),
    }),
    columnHelper.accessor('phone', {
      header: t('students.phone'),
      meta: { cellClassName: 'text-muted-foreground' },
      cell: ({ getValue }) => formatPhone(getValue()),
    }),
  ]);

  // Shared by both course types (was duplicated identically in each) --
  // switches from the amount to a paid/owing badge for a teacher instead of
  // being dropped, unlike the pure-money columns below (autodrive-vh0.5).
  // Sort disabled in the badge form: sorting the full list by the hidden
  // amount would leak relative debt ranking a teacher shouldn't have.
  const debtColumn = columnHelper.accessor('debt', {
    header: t('students.debt'),
    enableSorting: canViewPayments,
    meta: {
      align: canViewPayments ? 'right' : 'center',
      cellClassName: canViewPayments
        ? 'whitespace-nowrap tabular-nums font-mono'
        : undefined,
    },
    cell: ({ row }) =>
      canViewPayments ? (
        debtCell(row.original.debt)
      ) : (
        <DebtStatusBadge hasDebt={row.original.has_debt} />
      ),
  });

  const tezkorColumns = columnHelper.columns([
    debtColumn,
    columnHelper.display({
      id: 'group',
      header: t('students.group'),
      meta: { cellClassName: 'text-muted-foreground' },
      cell: ({ row }) => row.original.group_name || t('common.na'),
    }),
    columnHelper.accessor('result', {
      header: t('students.result'),
      meta: { align: 'center' },
      cell: ({ getValue }) => resultCell(getValue()),
    }),
  ]);

  const paymentColumns = columnHelper.columns([
    columnHelper.accessor('initial_payment', {
      header: t('students.initial_payment'),
      meta: {
        align: 'right',
        cellClassName: 'whitespace-nowrap tabular-nums font-mono',
      },
      cell: ({ getValue }) => formatMoney(getValue() || 0),
    }),
    columnHelper.accessor('second_payment', {
      header: `2-${t('students.payment').toLowerCase()}`,
      meta: {
        align: 'right',
        cellClassName: 'whitespace-nowrap tabular-nums font-mono',
      },
      cell: ({ getValue }) => formatMoney(getValue() || 0),
    }),
    columnHelper.accessor('third_payment', {
      header: `3-${t('students.payment').toLowerCase()}`,
      meta: {
        align: 'right',
        cellClassName: 'whitespace-nowrap tabular-nums font-mono',
      },
      cell: ({ getValue }) => formatMoney(getValue() || 0),
    }),
  ]);

  const avtoMaktabColumns = columnHelper.columns([
    ...(canViewPayments ? paymentColumns : []),
    debtColumn,
    columnHelper.display({
      id: 'group',
      header: t('students.group'),
      cell: ({ row }) => row.original.group_name,
    }),
    columnHelper.accessor('completion_date', {
      header: t('students.completion_date'),
      meta: { cellClassName: 'text-muted-foreground tabular-nums' },
      cell: ({ getValue }) => formatDate(getValue()),
    }),
    columnHelper.accessor('o83', {
      header: t('students.o83'),
      meta: { align: 'center' },
      cell: ({ getValue }) => (
        <span className={getValue() ? 'text-success' : 'text-destructive'}>
          {getValue() ? t('students.o83_yes') : t('students.o83_no')}
        </span>
      ),
    }),
    columnHelper.accessor('contract_number', {
      header: t('students.contract_number'),
      meta: { cellClassName: 'text-muted-foreground' },
      cell: ({ getValue }) => getValue(),
    }),
    columnHelper.accessor('result', {
      header: t('students.result'),
      meta: { align: 'center' },
      cell: ({ getValue }) => resultCell(getValue()),
    }),
  ]);

  const tailColumns = columnHelper.columns([
    columnHelper.accessor('created_at', {
      header: t('common.date'),
      enableSorting: true,
      meta: {
        cellClassName: 'text-muted-foreground whitespace-nowrap tabular-nums',
      },
      cell: ({ getValue }) => formatDateTime(getValue()),
    }),
    columnHelper.display({
      id: 'actions',
      header: t('common.actions'),
      meta: { align: 'center' },
      cell: ({ row }) =>
        row.original.deleted_at ? (
          <div className="flex items-center justify-center gap-1">
            {canViewDeleted && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore(row.original.id);
                }}
                aria-label={t('common.restore')}
                title={t('common.restore')}
                className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <ArrowCounterClockwise className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1">
            {canManageStudents && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(row.original);
                }}
                aria-label={t('common.edit')}
                title={t('common.edit')}
                className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <PencilSimple className="h-3.5 w-3.5" />
              </button>
            )}
            {isCrossTenant && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(row.original.id);
                }}
                aria-label={t('common.delete')}
                title={t('common.delete')}
                className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <Trash className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ),
    }),
  ]);

  const courseTypeColumn = columnHelper.accessor('course_type', {
    header: t('students.course_type'),
    meta: { cellClassName: 'text-muted-foreground' },
    cell: ({ getValue }) =>
      getValue() === 'tezkor'
        ? t('students.course_fast')
        : t('students.course_school'),
  });

  const midColumns =
    courseType === 'tezkor'
      ? tezkorColumns
      : courseType === 'avto_maktab'
        ? avtoMaktabColumns
        : [courseTypeColumn, ...tezkorColumns];

  // TanStack columns intentionally carry different cell-value types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: DataGridColumnDef<Student, any>[] = [
    indexColumn,
    ...nameColumns,
    ...midColumns,
    ...tailColumns,
  ];

  const emptyState =
    totalStudents === 0 ? (
      <EmptyState
        icon={GraduationCap}
        title={t('students.not_found')}
        description={t('students.not_found_desc')}
        action={
          canManageStudents ? (
            <Button size="sm" className="gap-2" onClick={onCreate}>
              <Plus className="h-4 w-4" /> {t('students.add')}
            </Button>
          ) : undefined
        }
      />
    ) : null;

  return (
    <DataGrid
      columns={columns}
      data={students}
      getRowId={(student) => student.id}
      pagination={{
        pageIndex: currentPage - 1,
        pageSize,
        rowCount: totalStudents,
        pageCount,
      }}
      onPaginationChange={({ pageIndex }) => onPageChange(pageIndex + 1)}
      sorting={[{ id: sortField, desc: sortDir === 'desc' }]}
      onSortingChange={(sorting) => {
        const nextSort = sorting[0];
        if (nextSort) toggleSort(nextSort.id);
      }}
      columnFilters={[]}
      onColumnFiltersChange={() => undefined}
      manualPagination
      manualSorting
      manualFiltering
      isInitialLoading={isLoading}
      isFetching={isFetching}
      labels={{
        table: t('students.title'),
        loading: t('common.loading'),
        fetching: t('common.loading'),
        previousPage: t('common.previous'),
        nextPage: t('common.next'),
      }}
      loadingState={
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, index) => (
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
      onRowActivate={onOpenStudent}
      getRowAriaLabel={(student) =>
        `${capitalize(student.first_name)} ${capitalize(student.last_name)}`
      }
      showPagination={false}
      className="hidden md:block"
      tableClassName="[&_thead>tr]:bg-muted/30"
      rowClassName={(student) =>
        cn('table-row-interactive', student.deleted_at && 'opacity-60')
      }
    />
  );
};
