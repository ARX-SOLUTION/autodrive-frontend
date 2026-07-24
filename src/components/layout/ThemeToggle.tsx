import { Moon, Sun } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  collapsed?: boolean;
}

export const ThemeToggle = ({ collapsed }: ThemeToggleProps) => {
  const { theme, toggle } = useTheme();
  const { t } = useTranslation();
  const Icon = theme === 'dark' ? Sun : Moon;
  const label =
    theme === 'dark' ? t('actions.theme_light') : t('actions.theme_dark');

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground transition-colors"
    >
      <Icon className="h-4 w-4" />
      {!collapsed && <span className="hidden xl:inline">{label}</span>}
    </button>
  );
};
