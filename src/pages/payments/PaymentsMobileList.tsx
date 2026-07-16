import { useTranslation } from 'react-i18next';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useViewTransitionNavigate } from '@/hooks/useViewTransitionNavigate';
import { formatMoney } from '@/lib/money';
import type { Payment } from '@/types/payment';
import { CreditCard } from 'lucide-react';
import { courseTypeLabelKey, formatDate } from './paymentFormatters';

interface PaymentsMobileListProps {
  payments: Payment[];
  isLoading: boolean;
}

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
          <DataCard
            key={p.id}
            title={p.student_name}
            subtitle={p.branch_name}
            onClick={(e) =>
              goToStudent(
                `/students/${p.student_id}?tab=payments`,
                e.currentTarget,
                `student-${p.student_id}`,
              )
            }
            fields={[
              { label: t('common.date'), value: formatDate(p.date) },
              {
                label: t('payments.amount'),
                value: formatMoney(p.amount_paid),
              },
              {
                label: t('common.course_type'),
                value: t(courseTypeLabelKey(p.course_type)),
              },
            ]}
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
