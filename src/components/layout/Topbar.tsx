import {
  List,
  MagnifyingGlass,
  Sun,
  Moon,
  Translate,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { SUPPORTED_LANGS } from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Brand } from './Brand';

interface TopbarProps {
  onMobileMenuClick: () => void;
  onCommandPaletteOpen: () => void;
}

const langLabels: Record<string, string> = {
  uz: "O'zbek",
  ru: 'Русский',
  en: 'English',
};

const iconButtonClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground';

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform);
const commandShortcutLabel = isMac ? '⌘K' : 'Ctrl+K';

export const Topbar = ({
  onMobileMenuClick,
  onCommandPaletteOpen,
}: TopbarProps) => {
  const { t, i18n } = useTranslation();
  const { theme, toggle } = useTheme();
  const currentLang = (i18n.resolvedLanguage ?? i18n.language ?? 'uz').slice(
    0,
    2,
  );
  const ThemeIcon = theme === 'dark' ? Sun : Moon;
  const themeLabel =
    theme === 'dark' ? t('actions.theme_light') : t('actions.theme_dark');
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-0 bg-transparent backdrop-blur-0 px-3 sm:px-4 md:px-6">
      <button
        type="button"
        aria-label={t('actions.sidebar') as string}
        onClick={onMobileMenuClick}
        className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
      >
        <List className="h-5 w-5" />
      </button>
      <span className="md:hidden">
        <Brand size="sm" />
      </span>
      <div className="flex flex-1 items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCommandPaletteOpen}
          aria-label={t('actions.search', 'Qidirish') as string}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground sm:px-3"
        >
          <MagnifyingGlass className="h-4 w-4" />
          <span className="hidden sm:inline">
            {t('actions.search', 'Qidirish') as string}
          </span>
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium sm:inline">
            {commandShortcutLabel}
          </kbd>
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={themeLabel as string}
          title={themeLabel as string}
          className={iconButtonClass}
        >
          <ThemeIcon className="h-4 w-4" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t('actions.language') as string}
            className={iconButtonClass}
          >
            <Translate className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[8rem]">
            {SUPPORTED_LANGS.map((code) => (
              <DropdownMenuItem
                key={code}
                onSelect={() => i18n.changeLanguage(code)}
                className={currentLang === code ? 'bg-accent' : ''}
              >
                <span className="mr-2 inline-block w-6 uppercase text-muted-foreground">
                  {code}
                </span>
                <span>{langLabels[code]}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
