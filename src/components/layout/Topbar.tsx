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
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useTheme } from '@/hooks/useTheme';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useAuthStore } from '@/store/authStore';
import { useCan } from '@/hooks/useCan';
import { useBranches } from '@/services/branchService';
import { changeAppLanguage, SUPPORTED_LANGS } from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
  'inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-[0_1px_2px_hsl(var(--foreground)/0.05)] transition-[background-color,color,box-shadow,scale] duration-150 ease-out hover:bg-accent hover:text-foreground active:scale-[0.96]';

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
  const location = useLocation();
  const { searchParams, setParam } = useUrlParams();
  const { theme, toggle } = useTheme();
  const user = useAuthStore((s) => s.user);
  const canAccessOperations = useCan('accessOperations');
  const canRecordPayment = useCan('recordPayment');
  const canViewAllBranches = useCan('viewAllBranches');
  const isDashboard = location.pathname === '/dashboard';
  const { data: branches = [], isLoading: branchesLoading } = useBranches(
    canViewAllBranches && isDashboard,
  );
  const currentLang = (i18n.resolvedLanguage ?? i18n.language ?? 'uz').slice(
    0,
    2,
  );
  const ThemeIcon = theme === 'dark' ? Sun : Moon;
  const themeLabel =
    theme === 'dark' ? t('actions.theme_light') : t('actions.theme_dark');
  const allBranchesLabel = t('nav.branches_all');
  const selectedBranchId = isDashboard
    ? searchParams.get('branch_id') || 'all'
    : 'all';
  const selectedBranch = branches.find(
    (branch) => branch.id === selectedBranchId,
  );
  const branchLabel = canViewAllBranches
    ? selectedBranchId === 'all'
      ? allBranchesLabel
      : selectedBranch?.name || t('dashboard.v2.branch', 'Filial')
    : user?.branch_name;
  const showBranchSwitcher = canViewAllBranches && isDashboard;
  const searchHint = t(
    'actions.search_hint',
    "Talaba, to'lov qidirish",
  ) as string;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-hair bg-background/[88%] px-4 backdrop-blur-[14px] sm:px-6 lg:px-8">
      <button
        type="button"
        aria-label={t('actions.sidebar') as string}
        title={t('actions.sidebar') as string}
        onClick={onMobileMenuClick}
        className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-accent hover:text-foreground active:scale-[0.96] lg:hidden"
      >
        <List className="h-5 w-5" />
      </button>
      <span className="lg:hidden">
        <Brand size="sm" />
      </span>

      {branchLabel &&
        (showBranchSwitcher ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t('dashboard.v2.branch', 'Filial')}
              disabled={branchesLoading}
              className="group hidden h-11 min-w-52 max-w-72 cursor-pointer items-center gap-2.5 rounded-md border border-border bg-card px-3 text-left transition-[background-color,border-color,box-shadow] duration-150 ease-out hover:border-primary/50 hover:bg-accent/70 active:bg-accent data-[state=open]:border-primary/60 data-[state=open]:bg-accent data-[state=open]:shadow-[0_0_0_3px_hsl(var(--ring)/0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60 lg:flex"
            >
              <Buildings className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {t('dashboard.v2.branch', 'Filial')}
                </span>
                <span className="mt-0.5 block truncate text-sm font-semibold text-foreground">
                  {branchLabel}
                </span>
              </span>
              <span
                className="mr-0.5 h-2 w-2 shrink-0 rotate-45 border-b border-r border-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-[225deg]"
                aria-hidden="true"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-56">
              <DropdownMenuRadioGroup
                value={selectedBranchId}
                onValueChange={(value) =>
                  setParam('branch_id', value === 'all' ? undefined : value)
                }
              >
                <DropdownMenuRadioItem value="all">
                  {allBranchesLabel}
                </DropdownMenuRadioItem>
                {branches.map((branch) => (
                  <DropdownMenuRadioItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="hidden h-11 min-w-52 items-center gap-2.5 rounded-md border border-border bg-card px-3 lg:flex">
            <Buildings className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 leading-tight">
              <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {t('dashboard.v2.branch', 'Filial')}
              </span>
              <span className="mt-0.5 block truncate text-sm font-semibold">
                {branchLabel}
              </span>
            </span>
          </div>
        ))}

      <div className="flex-1" />

      {canAccessOperations && (
        <button
          type="button"
          onClick={onCommandPaletteOpen}
          aria-label={searchHint}
          className="hidden h-10 w-[260px] items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-muted-foreground transition-[background-color,color,box-shadow] duration-150 ease-out hover:bg-accent lg:inline-flex"
        >
          <MagnifyingGlass className="h-4 w-4 shrink-0" />
          <span className="truncate">{searchHint}</span>
          <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10.5px] font-medium">
            {commandShortcutLabel}
          </kbd>
        </button>
      )}

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
          title={t('actions.language') as string}
          className={iconButtonClass}
        >
          <Translate className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[8rem]">
          {SUPPORTED_LANGS.map((code) => (
            <DropdownMenuItem
              key={code}
              onSelect={() => void changeAppLanguage(code)}
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

      {canRecordPayment && (
        <button
          type="button"
          onClick={() => navigate({ to: '/payments' })}
          className="hidden h-10 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_2px_6px_hsl(var(--primary)/0.24)] transition-[background-color,box-shadow,scale] duration-150 ease-out hover:bg-primary/90 active:scale-[0.96] lg:inline-flex"
        >
          <Plus className="h-4 w-4" />
          {t('actions.quick_payment', "To'lov")}
        </button>
      )}
    </header>
  );
};
