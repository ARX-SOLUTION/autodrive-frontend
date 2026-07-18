import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface BrandProps {
  size?: 'sm' | 'lg';
}

export const Brand = ({ size = 'sm' }: BrandProps) => {
  const { t } = useTranslation();
  return (
    <span
      className={cn('flex items-center', size === 'lg' ? 'gap-3' : 'gap-2')}
    >
      <span aria-hidden className="w-1 self-stretch rounded-full bg-primary" />
      <span
        className={cn(
          'font-heading font-semibold tracking-tight text-foreground',
          size === 'lg' ? 'text-3xl' : 'text-lg',
        )}
      >
        {t('app.title')}
      </span>
    </span>
  );
};
