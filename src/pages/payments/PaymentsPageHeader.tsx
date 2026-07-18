import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DownloadSimple, CircleNotch, Plus } from '@phosphor-icons/react';

interface PaymentsPageHeaderProps {
  isCrossTenant: boolean;
  canRecordPayment: boolean;
  isExporting: boolean;
  exportDisabled: boolean;
  onExport: () => void;
  onAddPayment: () => void;
}

export const PaymentsPageHeader = ({
  isCrossTenant,
  canRecordPayment,
  isExporting,
  exportDisabled,
  onExport,
  onAddPayment,
}: PaymentsPageHeaderProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-balance">
          {t('payments.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('payments.subtitle')}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {isCrossTenant && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950 font-semibold"
                onClick={onExport}
                disabled={exportDisabled}
              >
                {isExporting ? (
                  <CircleNotch className="h-4 w-4 animate-spin" />
                ) : (
                  <DownloadSimple className="h-4 w-4" />
                )}{' '}
                {t('payments.export_excel')}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{t('payments.export_info')}</p>
              <p className="text-xs text-muted-foreground">
                {t('payments.export_desc')}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
        {canRecordPayment && (
          <Button className="gap-2" onClick={onAddPayment}>
            <Plus className="h-4 w-4" /> {t('payments.add_payment')}
          </Button>
        )}
      </div>
    </div>
  );
};
