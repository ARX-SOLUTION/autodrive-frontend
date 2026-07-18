import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from '@phosphor-icons/react';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export const BlogHeader = () => {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          {t('blog.nav_back')}
        </Link>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
