import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/layout/BrandMark';

interface BrandProps {
  size?: 'sm' | 'lg';
}

export const Brand = ({ size = 'sm' }: BrandProps) => {
  const { t } = useTranslation();
  return <BrandMark size={size} title={t('app.title')} />;
};
