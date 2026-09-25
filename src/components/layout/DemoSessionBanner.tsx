import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { isDemoCompanyUser } from '@/lib/demoSession';

export const DemoSessionBanner = () => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  if (!isDemoCompanyUser(user)) return null;

  return (
    <p
      role="status"
      className="border-b border-warning/30 bg-warning px-4 py-2 text-center text-xs font-medium leading-snug text-warning-foreground sm:text-sm"
    >
      {t('common.demo_banner')}
    </p>
  );
};
