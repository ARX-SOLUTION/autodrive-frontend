import { useTranslation } from 'react-i18next';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useViewTransitionNavigate } from '@/hooks/useViewTransitionNavigate';
import { formatMoney } from '@/lib/money';
import type { Payment } from '@/types/payment';
import { CreditCard } from '@phosphor-icons/react';
import { courseTypeLabelKey, formatDate } from './paymentFormatters';

interface PaymentsMobileListProps {
  payments: Payment[];
  isLoading: boolean;
}

interface PaymentMobileCardProps {
  payment: Payment;
  onActivate: (element: HTMLElement) => void;
}

export const PaymentMobileCard = ({
  payment,
  onActivate,
}: PaymentMobileCardProps) => {
  const { t } = useTranslation();

  return (
    <DataCard
      title={payment.student_name}
      subtitle={payment.branch_name}
      onClick={(event) => onActivate(event.currentTarget)}
      fields={[
        { label: t('common.date'), value: formatDate(payment.date) },
        {
          label: t('payments.amount'),
          value: formatMoney(payment.amount_paid),
        },
        {
          label: t('common.course_type'),
          value: t(courseTypeLabelKey(payment.course_type)),
        },
      ]}
    />
  );
};

/** SECTION 4 (mobile): card list; cards navigate to the student. */
export const PaymentsMobileList = ({
  payments,
  isLoading,
}: PaymentsMobileListProps) => {
  const { t } = useTranslation();
  const goToStudent = useViewTransitionNavigate();

  return (
    <div className="grid gap-3 md:hidden p-3">
      {isLoading ? (
        [...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))
      ) : payments.length > 0 ? (
        payments.map((p) => (
          <PaymentMobileCard
            key={p.id}
            payment={p}
            onActivate={(element) =>
              goToStudent(
                {
                  to: '/students/$id',
                  params: { id: p.student_id },
                  search: { tab: 'payments' },
                },
                element,
                `student-${p.student_id}`,
              )
            }
          />
        ))
      ) : (
        <EmptyState
          icon={CreditCard}
          title={t('payments.not_found')}
          description={t('payments.not_found_desc')}
        />
      )}
    </div>
  );
};
