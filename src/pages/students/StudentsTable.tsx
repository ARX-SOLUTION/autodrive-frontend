import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Pencil, Trash2, GraduationCap, AlertTriangle } from 'lucide-react';
import { formatPhone } from '@/lib/phoneFormater';
import { formatMoney } from '@/lib/money';
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
  onOpenStudent: (student: Student, el: HTMLElement) => void;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
}

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
  onOpenStudent,
  onEdit,
  onDelete,
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
      render: (s) => localizedResultLabels[s.result],
    },
  ];

  const avtoMaktabColumns: DataTableColumn<Student>[] = [
    {
      key: 'initial_payment',
      header: t('students.initial_payment'),
      align: 'right',
      cellClassName: 'tabular-nums',
      render: (s) => formatMoney(s.initial_payment || 0),
    },
    {
      key: 'second_payment',
      header: `2-${t('students.payment').toLowerCase()}`,
      align: 'right',
      cellClassName: 'tabular-nums',
      render: (s) => formatMoney(s.second_payment || 0),
    },
    {
      key: 'third_payment',
      header: `3-${t('students.payment').toLowerCase()}`,
      align: 'right',
      cellClassName: 'tabular-nums',
      render: (s) => formatMoney(s.third_payment || 0),
    },
    {
      key: 'debt',
      header: t('students.debt'),
      align: 'right',
      sortable: true,
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
      render: (s) => localizedResultLabels[s.result],
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
              <Pencil className="h-3.5 w-3.5" />
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
              <Trash2 className="h-3.5 w-3.5" />
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
  ];

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
          icon={AlertTriangle}
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
          />
        ) : undefined
      }
      sortField={sortField}
      sortDir={sortDir}
      onToggleSort={toggleSort}
    />
  );
};
