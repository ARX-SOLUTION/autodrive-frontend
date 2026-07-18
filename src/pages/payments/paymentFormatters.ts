import { format } from 'date-fns';
import type { CourseType, PaymentMethod } from '@/types/student';

export const formatDate = (d: string) => {
  try {
    if (!d) return '—';
    return format(new Date(d), 'dd.MM.yyyy HH:mm');
  } catch {
    return d;
  }
};

/** i18n key for a course type — same ternary the page inlined pre-extraction. */
export const courseTypeLabelKey = (courseType: CourseType) =>
  courseType === 'tezkor' ? 'payments.course_fast' : 'payments.course_school';

/** i18n key for a payment method (used by the Excel export). */
export const paymentMethodLabelKey = (method: PaymentMethod) =>
  method === 'naqd'
    ? 'payments.payment_cash'
    : method === 'karta'
      ? 'payments.payment_card'
      : 'payments.payment_transfer';
