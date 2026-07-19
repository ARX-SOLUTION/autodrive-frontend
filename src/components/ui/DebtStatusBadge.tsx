import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

interface DebtStatusBadgeProps {
  hasDebt: boolean | undefined;
}

/**
 * Binary paid/owing signal for a teacher, who must never see a payment
 * amount (autodrive-vh0.5). `hasDebt === undefined` (payload didn't include
 * it, e.g. stale cache or a non-teacher-scoped read) renders nothing rather
 * than a misleading "paid" -- callers must not fall back to `!hasDebt`.
 */
export const DebtStatusBadge = ({ hasDebt }: DebtStatusBadgeProps) => {
  const { t } = useTranslation();
  if (hasDebt === undefined) return null;
  return hasDebt ? (
    <Badge variant="destructive">{t('students.debt_status_owed')}</Badge>
  ) : (
    <Badge variant="secondary" className="text-success">
      {t('students.debt_status_paid')}
    </Badge>
  );
};
