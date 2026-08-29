import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { toast } from 'sonner';
import { CreditCard, PencilSimple, Trash } from '@phosphor-icons/react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import PaymentModal from '@/components/ui/PaymentModal';
import { Skeleton } from '@/components/ui/skeleton';
import { createDataGridColumnHelper, DataGrid } from '@/shared/ui/data-grid';
import { useViewTransitionNavigate } from '@/hooks/useViewTransitionNavigate';
import { useCan } from '@/hooks/useCan';
import type { PaymentMethod } from '@/types/student';
import { useDeletePayment, useUpdatePayment } from '@/services/paymentService';
import { mutationErrorToast } from '@/lib/mutationErrorToast';
import { formatMoney } from '@/lib/money';
import type { Payment } from '@/types/payment';
import { PaymentMobileCard } from './PaymentsMobileList';
import { courseTypeLabelKey, formatDate } from './paymentFormatters';

interface PaymentsTableProps {
  payments: Payment[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  onRetry: () => void;
  currentPage: number;
  pageSize: number;
  totalPayments: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sortField: string;
  sortDir: 'asc' | 'desc';
  onSortChange: (field: string, dir: 'asc' | 'desc') => void;
}

const columnHelper = createDataGridColumnHelper<Payment>();
const uzNumberFormatter = new Intl.NumberFormat('uz-UZ');

/** SECTION 4: server-controlled payments grid with a mobile card renderer. */
export const PaymentsTable = ({
  payments,
  isLoading,
  isFetching,
  isError,
  onRetry,
  currentPage,
  pageSize,
  totalPayments,
  totalPages,
  onPageChange,
  sortField,
  sortDir,
  onSortChange,
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
        mutationErrorToast(err, t, () => deletePayment.mutate(deleteTarget.id)),
    });
  };

  const handleEditSubmit = (data: {
    amount: number;
    payment_method: PaymentMethod;
  }) => {
    if (!editTarget) return;
    const payload = {
      id: editTarget.id,
      amount: data.amount,
      payment_method: data.payment_method,
    };
    updatePayment.mutate(payload, {
      onSuccess: () => {
        toast.success(t('payments.updated'));
        setEditTarget(null);
      },
      onError: (err) =>
        mutationErrorToast(err, t, () => updatePayment.mutate(payload)),
    });
  };

  const startIndex = (currentPage - 1) * pageSize;
  const columns = columnHelper.columns([
    columnHelper.display({
      id: 'index',
      header: '#',
      cell: ({ row }) => startIndex + row.index + 1,
      meta: {
        align: 'center',
        cellClassName: 'text-muted-foreground',
      },
    }),
    columnHelper.accessor('student_name', {
      header: t('payments.student_name'),
      cell: ({ getValue }) => getValue(),
      enableSorting: true,
      meta: { cellClassName: 'font-medium' },
    }),
    columnHelper.accessor('branch_name', {
      header: t('common.branch'),
      cell: ({ getValue }) => getValue(),
      meta: { cellClassName: 'text-muted-foreground' },
    }),
    columnHelper.accessor('course_type', {
      header: t('common.course_type'),
      cell: ({ getValue }) => t(courseTypeLabelKey(getValue())),
      meta: { cellClassName: 'text-xs' },
    }),
    columnHelper.accessor('total_price', {
      header: t('payments.total_price'),
      cell: ({ getValue }) => uzNumberFormatter.format(getValue()),
      meta: {
        align: 'right',
        cellClassName: 'whitespace-nowrap tabular-nums font-mono',
      },
    }),
    columnHelper.accessor('amount_paid', {
      header: t('payments.amount_paid'),
      cell: ({ getValue }) => `+${uzNumberFormatter.format(getValue())}`,
      enableSorting: true,
      meta: {
        align: 'right',
        cellClassName:
          'text-success font-medium whitespace-nowrap tabular-nums font-mono',
      },
    }),
    columnHelper.accessor('remaining_debt', {
      header: t('payments.remaining_debt'),
      cell: ({ getValue }) => {
        const debt = getValue();
        return (
          <span className={debt > 0 ? 'text-destructive' : 'text-success'}>
            {debt > 0
              ? uzNumberFormatter.format(debt)
              : debt < 0
                ? `${t('students.credit_label')}: ${uzNumberFormatter.format(Math.abs(debt))}`
                : t('payments.fully_paid')}
          </span>
        );
      },
      enableSorting: true,
      meta: {
        align: 'right',
        cellClassName: 'whitespace-nowrap tabular-nums font-mono',
      },
    }),
    columnHelper.accessor('date', {
      header: t('common.date'),
      cell: ({ getValue }) => formatDate(getValue()),
      enableSorting: true,
      meta: {
        cellClassName: 'text-muted-foreground tabular-nums',
      },
    }),
    ...(canManagePayments
      ? [
          columnHelper.display({
            id: 'actions',
            header: t('common.actions'),
            cell: ({ row }) => {
              const payment = row.original;
              return (
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditTarget(payment);
                    }}
                    aria-label={t('common.edit')}
                    title={t('common.edit')}
                    className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <PencilSimple className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleteTarget(payment);
                    }}
                    aria-label={t('common.delete')}
                    title={t('common.delete')}
                    className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            },
            meta: { align: 'center' },
          }),
        ]
      : []),
  ]);

  const handlePaginationChange = (pagination: PaginationState) => {
    onPageChange(pagination.pageIndex + 1);
  };

  const handleSortingChange = (sorting: SortingState) => {
    const nextSort = sorting[0];
    if (!nextSort) return;
    onSortChange(nextSort.id, nextSort.desc ? 'desc' : 'asc');
  };

  const openStudent = (payment: Payment, element: HTMLElement | null) =>
    goToStudent(
      {
        to: '/students/$id',
        params: { id: payment.student_id },
        search: { tab: 'payments' },
      },
      element,
      `student-${payment.student_id}`,
    );

  const emptyState = (
    <EmptyState
      icon={CreditCard}
      title={t('payments.not_found')}
      description={t('payments.not_found_desc')}
    />
  );

  return (
    <>
      <DataGrid
        data={payments}
        columns={columns}
        getRowId={(payment) => payment.id}
        pagination={{
          pageIndex: Math.max(0, currentPage - 1),
          pageSize,
          rowCount: totalPayments,
          pageCount: totalPages,
        }}
        onPaginationChange={handlePaginationChange}
        sorting={[{ id: sortField, desc: sortDir === 'desc' }]}
        onSortingChange={handleSortingChange}
        columnFilters={[]}
        onColumnFiltersChange={() => undefined}
        manualPagination
        manualSorting
        manualFiltering
        isInitialLoading={isLoading}
        isFetching={isFetching}
        labels={{
          table: t('payments.payment_list'),
          loading: t('common.loading'),
          fetching: t('common.loading'),
          previousPage: t('common.previous'),
          nextPage: t('common.next'),
        }}
        loadingState={
          <div className="grid gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-5 w-full" />
            ))}
          </div>
        }
        errorState={
          isError ? (
            <EmptyState
              title={t('common.error')}
              action={{ label: t('common.retry'), onClick: onRetry }}
            />
          ) : undefined
        }
        emptyState={emptyState}
        renderMobileRow={({ row }) => (
          <PaymentMobileCard
            payment={row}
            onActivate={(element) => openStudent(row, element)}
          />
        )}
        onRowActivate={(payment, element) => openStudent(payment, element)}
        getRowAriaLabel={(payment) => payment.student_name}
        rowClassName={() => 'table-row-interactive'}
        className="p-3 md:p-0"
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
