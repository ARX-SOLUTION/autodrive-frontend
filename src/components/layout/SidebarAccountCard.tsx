import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Buildings,
  CaretUp,
  Moon,
  SignOut,
  Sun,
  Translate,
  User,
} from '@phosphor-icons/react';
import { useLogout } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { useCan } from '@/hooks/useCan';
import { useTheme } from '@/hooks/useTheme';
import { changeAppLanguage, SUPPORTED_LANGS, type AppLang } from '@/i18n';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const langLabels: Record<string, string> = {
  uz: "O'zbek",
  ru: 'Русский',
  en: 'English',
};

interface SidebarAccountCardProps {
  expanded: boolean;
  onBeforeLogout?: () => void;
}

export function SidebarAccountCard({
  expanded,
  onBeforeLogout,
}: SidebarAccountCardProps) {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogout();
  const canManageBranches = useCan('manageBranches');
  const { theme, toggle } = useTheme();
  const roleLabel =
    user?.role === 'owner'
      ? t('roles.owner')
      : user?.branch_name || t(`roles.${user?.role ?? 'operator'}`);
  const initials =
    (user?.name || user?.email || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join('') || '?';
  const userLabel = user?.name || user?.email;
  const currentLang = (i18n.resolvedLanguage ?? i18n.language ?? 'uz').slice(
    0,
    2,
  );
  const companyStatusKey =
    user?.company_status === 'pending'
      ? 'profile.status_pending'
      : user?.company_status === 'suspended'
        ? 'profile.status_suspended'
        : user?.company_status === 'active'
          ? 'profile.status_active'
          : null;
  const ThemeIcon = theme === 'dark' ? Sun : Moon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('profile.menu_label')}
        className={cn(
          'flex w-full items-center gap-2 text-left transition-[background-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
          expanded
            ? 'rounded-xl bg-sidebar-accent/80 p-2 shadow-[0_1px_2px_hsl(var(--foreground)/0.05)] hover:bg-sidebar-accent'
            : 'justify-center rounded-[10px] p-1 hover:bg-sidebar-accent',
        )}
      >
        <Avatar className="h-9 w-9 shrink-0 rounded-[10px]">
          <AvatarFallback className="rounded-[10px] bg-background text-xs font-semibold text-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        {expanded && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-sidebar-foreground">
                {userLabel}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {roleLabel}
              </span>
              {user?.company_slug ? (
                <span className="block truncate text-[11px] text-muted-foreground/80">
                  {user.company_slug}
                </span>
              ) : null}
            </span>
            <CaretUp
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={expanded ? 'top' : 'right'}
        align="start"
        className="w-64"
      >
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-semibold">
            {userLabel}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {user?.email}
          </span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">
            {roleLabel}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <User className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('profile.open_profile')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/profile" hash="password">
            {t('profile.change_password')}
          </Link>
        </DropdownMenuItem>
        {canManageBranches ? (
          <DropdownMenuItem asChild>
            <Link to="/branches">
              <Buildings className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('profile.branches_link')}
            </Link>
          </DropdownMenuItem>
        ) : null}
        {(user?.company_slug || companyStatusKey) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
              {t('profile.company')}
            </DropdownMenuLabel>
            {user?.company_slug ? (
              <DropdownMenuItem disabled>
                {t('profile.company_slug')}: {user.company_slug}
              </DropdownMenuItem>
            ) : null}
            {companyStatusKey ? (
              <DropdownMenuItem disabled>
                {t('profile.company_status')}: {t(companyStatusKey)}
              </DropdownMenuItem>
            ) : null}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Translate className="h-3.5 w-3.5" aria-hidden="true" />
          {t('actions.language')}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={currentLang}
          onValueChange={(code) => void changeAppLanguage(code as AppLang)}
        >
          {SUPPORTED_LANGS.map((code) => (
            <DropdownMenuRadioItem key={code} value={code}>
              {langLabels[code] ?? code}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            toggle();
          }}
        >
          <ThemeIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          {theme === 'dark'
            ? t('actions.theme_light')
            : t('actions.theme_dark')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={logoutMutation.isPending}
          className="text-destructive focus:text-destructive"
          onSelect={() => {
            onBeforeLogout?.();
            logoutMutation.mutate();
          }}
        >
          <SignOut className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('actions.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
