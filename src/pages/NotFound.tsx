import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Brand } from '@/components/layout/Brand';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background p-6">
      <Brand size="sm" />
      <p className="font-mono text-7xl font-semibold tracking-tight text-primary">
        404
      </p>
      <p className="text-lg text-muted-foreground">{t('notfound.title')}</p>
      <Button asChild variant="outline">
        <Link to="/dashboard">{t('nav.dashboard')}</Link>
      </Button>
    </div>
  );
};

export default NotFound;
