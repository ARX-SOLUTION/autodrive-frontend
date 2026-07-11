import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';

// ponytail: navigator.onLine + online/offline events — no polling, no new dep.
export const OfflineBanner = () => {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-destructive py-1.5 text-xs font-medium text-destructive-foreground">
      <WifiOff className="h-3.5 w-3.5" />
      {t('common.offline_banner')}
    </div>
  );
};
