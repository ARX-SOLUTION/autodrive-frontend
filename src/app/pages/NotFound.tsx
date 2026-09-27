import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Brand } from '@/components/layout/Brand';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="ambient-surface relative flex min-h-dvh flex-col items-center justify-center gap-6 overflow-hidden bg-background p-6">
      <div
        aria-hidden
        className="bg-grain pointer-events-none absolute inset-0 opacity-[0.4] mix-blend-soft-light"
      />
      <span className="relative">
        <Brand size="sm" />
      </span>
      <p className="relative font-mono text-7xl font-semibold tracking-tight text-primary">
        404
      </p>
      <p className="relative text-lg text-muted-foreground">
        {t('notfound.title')}
      </p>
      <div className="relative">
        <Button asChild variant="outline">
          <Link to="/dashboard">{t('nav.dashboard')}</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
