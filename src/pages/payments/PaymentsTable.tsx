import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { useViewTransitionNavigate } from '@/hooks/useViewTransitionNavigate';
import type { Payment } from '@/types/payment';
import { CreditCard } from 'lucide-react';
import { courseTypeLabelKey, formatDate } from './paymentFormatters';

interface PaymentsTableProps {
  payments: Payment[];
  isLoading: boolean;
  startIndex: number;
  sortField: string;
  sortDir: 'asc' | 'desc';
  onToggleSort: (field: string) => void;
}

/** SECTION 4 (desktop): sortable payments table; rows navigate to the student. */
export const PaymentsTable = ({
  payments,
  isLoading,
  startIndex,
  sortField,
  sortDir,
  onToggleSort,
}: PaymentsTableProps) => {
  const { t } = useTranslation();
  const goToStudent = useViewTransitionNavigate();

  const columns: DataTableColumn<Payment>[] = [
    {
      key: 'index',
      header: '#',
      align: 'center',
      cellClassName: 'text-muted-foreground',
      render: (_p, idx) => startIndex + idx + 1,
    },
    {
      key: 'student_name',
      header: t('payments.student_name'),
      sortable: true,
      cellClassName: 'font-medium',
      render: (p) => p.student_name,
    },
    {
      key: 'branch',
      header: t('common.branch'),
      cellClassName: 'text-muted-foreground',
      render: (p) => p.branch_name,
    },
    {
      key: 'course_type',
      header: t('common.course_type'),
      cellClassName: 'text-xs',
      render: (p) => t(courseTypeLabelKey(p.course_type)),
    },
    {
      key: 'total_price',
      header: t('payments.total_price'),
      align: 'right',
      render: (p) => new Intl.NumberFormat('uz-UZ').format(p.total_price),
    },
    {
      key: 'amount_paid',
      header: t('payments.amount_paid'),
      align: 'right',
      sortable: true,
      cellClassName: 'text-success font-medium',
      render: (p) => `+${new Intl.NumberFormat('uz-UZ').format(p.amount_paid)}`,
    },
    {
      key: 'remaining_debt',
      header: t('payments.remaining_debt'),
      align: 'right',
      sortable: true,
      render: (p) => (
        <span
          className={p.remaining_debt > 0 ? 'text-destructive' : 'text-success'}
        >
          {p.remaining_debt > 0
            ? new Intl.NumberFormat('uz-UZ').format(p.remaining_debt)
            : p.remaining_debt < 0
              ? `${t('students.credit_label')}: ${new Intl.NumberFormat('uz-UZ').format(Math.abs(p.remaining_debt))}`
              : t('payments.fully_paid')}
        </span>
      ),
    },
    {
      key: 'date',
      header: t('common.date'),
      sortable: true,
      cellClassName: 'text-muted-foreground tabular-nums',
      render: (p) => formatDate(p.date),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={payments}
      keyExtractor={(p) => p.id}
      onRowClick={(p, el) =>
        goToStudent(
          `/students/${p.student_id}?tab=payments`,
          el,
          `student-${p.student_id}`,
        )
      }
      isLoading={isLoading}
      skeletonRowCount={4}
      emptyState={
        <EmptyState
          icon={CreditCard}
          title={t('payments.not_found')}
          description={t('payments.not_found_desc')}
        />
      }
      sortField={sortField}
      sortDir={sortDir}
      onToggleSort={onToggleSort}
    />
  );
};
