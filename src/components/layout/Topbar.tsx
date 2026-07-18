import {
  List,
  MagnifyingGlass,
  Sun,
  Moon,
  Translate,
  Buildings,
  Plus,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
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
  'inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground';

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform);
const commandShortcutLabel = isMac ? '⌘K' : 'Ctrl+K';

export const Topbar = ({
  onMobileMenuClick,
  onCommandPaletteOpen,
}: TopbarProps) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const user = useAuthStore((s) => s.user);
  const currentLang = (i18n.resolvedLanguage ?? i18n.language ?? 'uz').slice(
    0,
    2,
  );
  const ThemeIcon = theme === 'dark' ? Sun : Moon;
  const themeLabel =
    theme === 'dark' ? t('actions.theme_light') : t('actions.theme_dark');
  // Display-only branch context — no branch-switch feature exists, so this
  // is deliberately inert (not a dropdown).
  const branchLabel =
    user?.role === 'owner' ? t('nav.branches_all') : user?.branch_name;
  const searchHint = t(
    'actions.search_hint',
    "Talaba, to'lov qidirish",
  ) as string;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3.5 border-b border-hair bg-background/[78%] px-[30px] backdrop-blur-[14px]">
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

      {branchLabel && (
        <div className="hidden h-10 items-center gap-2 rounded-[11px] border border-border bg-card px-3 text-sm font-semibold md:flex">
          <Buildings className="h-4 w-4 text-muted-foreground" />
          <span>{branchLabel}</span>
        </div>
      )}

      <div className="flex-1" />

      <button
        type="button"
        onClick={onCommandPaletteOpen}
        aria-label={searchHint}
        className="hidden h-10 w-[260px] items-center gap-2 rounded-[11px] border border-border bg-card px-3 text-sm text-muted-foreground md:inline-flex"
      >
        <MagnifyingGlass className="h-4 w-4 shrink-0" />
        <span className="truncate">{searchHint}</span>
        <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10.5px] font-medium">
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

      <button
        type="button"
        onClick={() => navigate('/payments')}
        className="hidden h-10 items-center gap-1.5 rounded-[11px] bg-primary px-4 text-sm font-bold text-primary-foreground md:inline-flex"
      >
        <Plus className="h-4 w-4" />
        {t('actions.quick_payment', "To'lov")}
      </button>
    </header>
  );
};
