import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import {
  PencilSimple,
  Trash,
  GraduationCap,
  Warning,
  Plus,
} from '@phosphor-icons/react';
import { formatPhone } from '@/lib/phoneFormater';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { CourseType, Student } from '@/types/student';
import {
  capitalize,
  formatDate,
  formatDateTime,
  resultLabels,
} from './studentsFormat';

interface StudentsTableProps {
  students: Student[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  totalStudents: number;
  startIndex: number;
  courseType: CourseType;
  sortField: string;
  sortDir: 'asc' | 'desc';
  toggleSort: (field: string) => void;
  canManageStudents: boolean;
  isCrossTenant: boolean;
  // Teacher must never see payment amounts (recordPayment cap) — hides the
  // debt/initial/second/third-payment columns rather than blanking them, so
  // no orphan money-only column header is left behind.
  canViewPayments: boolean;
  onOpenStudent: (student: Student, el: HTMLElement) => void;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}

// Money columns hidden from any role without recordPayment (teacher).
const MONEY_COLUMN_KEYS = new Set([
  'debt',
  'initial_payment',
  'second_payment',
  'third_payment',
]);

export const StudentsTable = ({
  students,
  isLoading,
  isError,
  onRetry,
  totalStudents,
  startIndex,
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
}: StudentsTableProps) => {
  const { t } = useTranslation();
  const localizedResultLabels = resultLabels(t);

  const debtCell = (debt: number) => (
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
          : t('common.na')}
    </span>
  );

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

  const indexColumn: DataTableColumn<Student> = {
    key: 'index',
    header: '#',
    align: 'center',
    cellClassName: 'text-muted-foreground',
    render: (_s, idx) => startIndex + idx + 1,
  };

  const nameColumns: DataTableColumn<Student>[] = [
    {
      key: 'last_name',
      header: t('students.last_name'),
      sortable: true,
      cellClassName: 'font-medium',
      render: (s) => capitalize(s.last_name),
    },
    {
      key: 'first_name',
      header: t('students.first_name'),
      sortable: true,
      render: (s) => capitalize(s.first_name),
    },
    {
      key: 'phone',
      header: t('students.phone'),
      cellClassName: 'text-muted-foreground',
      render: (s) => formatPhone(s.phone),
    },
  ];

  const tezkorColumns: DataTableColumn<Student>[] = [
    {
      key: 'debt',
      header: t('students.debt'),
      align: 'right',
      sortable: true,
      cellClassName: 'whitespace-nowrap tabular-nums font-mono',
      render: (s) => debtCell(s.debt),
    },
    {
      key: 'group',
      header: t('students.group'),
      cellClassName: 'text-muted-foreground',
      render: (s) => s.group_name || t('common.na'),
    },
    {
      key: 'result',
      header: t('students.result'),
      align: 'center',
      render: (s) => resultCell(s.result),
    },
  ];

  const avtoMaktabColumns: DataTableColumn<Student>[] = [
    {
      key: 'initial_payment',
      header: t('students.initial_payment'),
      align: 'right',
      cellClassName: 'whitespace-nowrap tabular-nums font-mono',
      render: (s) => formatMoney(s.initial_payment || 0),
    },
    {
      key: 'second_payment',
      header: `2-${t('students.payment').toLowerCase()}`,
      align: 'right',
      cellClassName: 'whitespace-nowrap tabular-nums font-mono',
      render: (s) => formatMoney(s.second_payment || 0),
    },
    {
      key: 'third_payment',
      header: `3-${t('students.payment').toLowerCase()}`,
      align: 'right',
      cellClassName: 'whitespace-nowrap tabular-nums font-mono',
      render: (s) => formatMoney(s.third_payment || 0),
    },
    {
      key: 'debt',
      header: t('students.debt'),
      align: 'right',
      sortable: true,
      cellClassName: 'whitespace-nowrap tabular-nums font-mono',
      render: (s) => debtCell(s.debt),
    },
    {
      key: 'group',
      header: t('students.group'),
      render: (s) => s.group_name,
    },
    {
      key: 'completion_date',
      header: t('students.completion_date'),
      cellClassName: 'text-muted-foreground tabular-nums',
      render: (s) => formatDate(s.completion_date),
    },
    {
      key: 'o83',
      header: t('students.o83'),
      align: 'center',
      render: (s) => (
        <span className={s.o83 ? 'text-success' : 'text-destructive'}>
          {s.o83 ? t('students.o83_yes') : t('students.o83_no')}
        </span>
      ),
    },
    {
      key: 'contract_number',
      header: t('students.contract_number'),
      cellClassName: 'text-muted-foreground',
      render: (s) => s.contract_number,
    },
    {
      key: 'result',
      header: t('students.result'),
      align: 'center',
      render: (s) => resultCell(s.result),
    },
  ];

  const tailColumns: DataTableColumn<Student>[] = [
    {
      key: 'created_at',
      header: t('common.date'),
      sortable: true,
      cellClassName: 'text-muted-foreground whitespace-nowrap tabular-nums',
      render: (s) => formatDateTime(s.created_at),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      align: 'center',
      render: (s) => (
        <div className="flex items-center justify-center gap-1">
          {canManageStudents && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(s);
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
                onDelete(s.id);
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
    },
  ];

  const columns: DataTableColumn<Student>[] = [
    indexColumn,
    ...nameColumns,
    ...(courseType === 'tezkor' ? tezkorColumns : avtoMaktabColumns),
    ...tailColumns,
  ].filter((c) => canViewPayments || !MONEY_COLUMN_KEYS.has(c.key));

  return (
    <DataTable
      columns={columns}
      rows={students}
      keyExtractor={(s) => s.id}
      onRowClick={onOpenStudent}
      isLoading={isLoading}
      skeletonRowCount={5}
      isError={isError}
      errorState={
        <EmptyState
          icon={Warning}
          title={t('common.error')}
          action={{ label: t('common.retry'), onClick: onRetry }}
        />
      }
      emptyState={
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
        ) : undefined
      }
      sortField={sortField}
      sortDir={sortDir}
      onToggleSort={toggleSort}
    />
  );
};
