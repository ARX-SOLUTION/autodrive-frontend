import { format } from 'date-fns';
import {
  fetchAllPayments,
  type PaymentListFilters,
} from '@/services/paymentService';
import {
  courseTypeLabelKey,
  formatDate,
  paymentMethodLabelKey,
} from './paymentFormatters';

/**
 * Fetch every payment matching the current filters and write an .xlsx file.
 * Throws on failure — the caller owns the loading state and error toast.
 */
export const exportPaymentsToExcel = async (
  filters: PaymentListFilters,
  t: (key: string) => string,
) => {
  const XLSX = await import('xlsx');
  const exportRows = await fetchAllPayments(filters);
  const rows = exportRows.map((p, idx) => ({
    '#': idx + 1,
    [t('payments.student_name')]: p.student_name,
    [t('common.branch')]: p.branch_name,
    [t('payments.course_fast')]: t(courseTypeLabelKey(p.course_type)),
    [t('payments.total_price')]: p.total_price,
    [t('payments.amount_paid')]: p.amount_paid,
    [t('payments.remaining_debt')]: p.remaining_debt,
    [t('payments.payment_method')]: t(paymentMethodLabelKey(p.payment_method)),
    [t('payments.operator')]: p.recorded_by || t('common.na'),
    [t('common.date')]: formatDate(p.date),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t('payments.title'));
  XLSX.writeFile(wb, `tolovlar_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
};
