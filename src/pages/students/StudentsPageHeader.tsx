import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Plus,
  DownloadSimple,
  CircleNotch,
  GraduationCap,
} from '@phosphor-icons/react';

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
  const title = t('students.title');

  return (
    <PageHeader
      eyebrow={title}
      title={title}
      description={t('students.count', { count: totalStudents })}
      icon={<GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />}
      actions={
        <>
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
        </>
      }
    />
  );
};
