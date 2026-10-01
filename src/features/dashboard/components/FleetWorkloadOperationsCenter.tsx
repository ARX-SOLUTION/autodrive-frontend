import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';

export function FleetWorkloadOperationsCenter() {
  const { t } = useTranslation();
  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-foreground">
        {t('operations.title')}
      </h3>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        {t('operations.unavailable_description')}
      </p>
    </Card>
  );
}

export default FleetWorkloadOperationsCenter;
