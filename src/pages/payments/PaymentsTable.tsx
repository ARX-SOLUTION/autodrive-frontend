import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CreditCard, Pencil, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import PaymentModal from '@/components/ui/PaymentModal';
import { useViewTransitionNavigate } from '@/hooks/useViewTransitionNavigate';
import { useCan } from '@/hooks/useCan';
import { useDeletePayment, useUpdatePayment } from '@/services/paymentService';
import { extractErrorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import type { Payment } from '@/types/payment';
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
  // Matches the backend's PATCH/DELETE /payments/:id @Roles(owner, dev,
  // manager, operator) guard exactly (bd 9e4.4).
  const canManagePayments = useCan('recordPayment');
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [editTarget, setEditTarget] = useState<Payment | null>(null);
  const deletePayment = useDeletePayment();
  const updatePayment = useUpdatePayment();

  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePayment.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t('payments.deleted'));
        setDeleteTarget(null);
      },
      onError: (err) =>
        toast.error(extractErrorMessage(err, t('common.error'))),
    });
  };

  const handleEditSubmit = (data: {
    amount: number;
    payment_method: string;
  }) => {
    if (!editTarget) return;
    updatePayment.mutate(
      {
        id: editTarget.id,
        amount: data.amount,
        payment_method: data.payment_method,
      },
      {
        onSuccess: () => {
          toast.success(t('payments.updated'));
          setEditTarget(null);
        },
        onError: (err) =>
          toast.error(extractErrorMessage(err, t('common.error'))),
      },
    );
  };

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
      cellClassName: 'whitespace-nowrap tabular-nums font-mono',
      render: (p) => new Intl.NumberFormat('uz-UZ').format(p.total_price),
    },
    {
      key: 'amount_paid',
      header: t('payments.amount_paid'),
      align: 'right',
      sortable: true,
      cellClassName:
        'text-success font-medium whitespace-nowrap tabular-nums font-mono',
      render: (p) => `+${new Intl.NumberFormat('uz-UZ').format(p.amount_paid)}`,
    },
    {
      key: 'remaining_debt',
      header: t('payments.remaining_debt'),
      align: 'right',
      sortable: true,
      cellClassName: 'whitespace-nowrap tabular-nums font-mono',
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
    ...(canManagePayments
      ? [
          {
            key: 'actions',
            header: t('common.actions'),
            align: 'center' as const,
            render: (p: Payment) => (
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditTarget(p);
                  }}
                  aria-label={t('common.edit')}
                  title={t('common.edit')}
                  className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(p);
                  }}
                  aria-label={t('common.delete')}
                  title={t('common.delete')}
                  className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
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

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deletePayment.isPending}
        title={t('payments.delete_confirm_title')}
        description={
          deleteTarget
            ? t('payments.delete_confirm_desc', {
                amount: formatMoney(deleteTarget.amount_paid),
              })
            : undefined
        }
      />

      <PaymentModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEditSubmit}
        loading={updatePayment.isPending}
        payment={editTarget}
        submitError={updatePayment.isError}
      />
    </>
  );
};
