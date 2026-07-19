import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Plus, DownloadSimple, CircleNotch } from '@phosphor-icons/react';

interface StudentsPageHeaderProps {
  totalStudents: number;
  isExporting: boolean;
  onExport: () => void;
  canManageStudents: boolean;
  // Export embeds total_price/debt columns — teacher (no recordPayment) must
  // not see the button at all rather than get a payment-amount-bearing file.
  canViewPayments: boolean;
  onCreate: () => void;
}

export const StudentsPageHeader = ({
  totalStudents,
  isExporting,
  onExport,
  canManageStudents,
  canViewPayments,
  onCreate,
}: StudentsPageHeaderProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-balance">
          {t('students.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('students.count', { count: totalStudents })}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canViewPayments && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={onExport}
            disabled={totalStudents === 0 || isExporting}
          >
            {isExporting ? (
              <CircleNotch className="h-4 w-4 animate-spin" />
            ) : (
              <DownloadSimple className="h-4 w-4" />
            )}{' '}
            {t('students.export_excel')}
          </Button>
        )}
        {canManageStudents && (
          <Button className="gap-2" onClick={onCreate}>
            <Plus className="h-4 w-4" /> {t('students.add')}
          </Button>
        )}
      </div>
    </div>
  );
};
