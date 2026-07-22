import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/services/authService';
import { useCan } from '@/hooks/useCan';
import { useViewTransitionNavigate } from '@/hooks/useViewTransitionNavigate';
import type { Capability } from '@/lib/permissions';
import {
  SquaresFour,
  Buildings,
  GraduationCap,
  CreditCard,
  Headphones,
  UsersThree,
  User,
  SignOut,
  ArrowRight,
  Stack,
  UserGear,
  ShieldCheck,
  Calendar,
  ListChecks,
  BookOpen,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Brand } from './Brand';

type NavItem = {
  path: string;
  labelKey: string;
  icon: typeof SquaresFour;
  // Capability required to see this item; absent = visible to everyone.
  // Must match the route guard in App.tsx for the same path.
  cap?: Capability;
};

const navItems: NavItem[] = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: SquaresFour },
  {
    path: '/branches',
    labelKey: 'nav.branches',
    icon: Buildings,
    cap: 'manageBranches',
  },
  { path: '/schedule', labelKey: 'nav.schedule', icon: Calendar },
  { path: '/attendance', labelKey: 'nav.attendance', icon: ListChecks },
  { path: '/groups', labelKey: 'nav.groups', icon: Stack },
  {
    path: '/courses',
    labelKey: 'nav.courses',
    icon: BookOpen,
    cap: 'manageStaff',
  },
  { path: '/students', labelKey: 'nav.students', icon: GraduationCap },
  {
    path: '/payments',
    labelKey: 'nav.payments',
    icon: CreditCard,
    cap: 'recordPayment',
  },
  {
    path: '/operators',
    labelKey: 'nav.operators',
    icon: Headphones,
    cap: 'manageStaff',
  },
  {
    path: '/teachers',
    labelKey: 'nav.teachers',
    icon: UsersThree,
    cap: 'manageStaff',
  },
  {
    path: '/users',
    labelKey: 'nav.users',
    icon: UserGear,
    cap: 'manageUsers',
  },
  {
    path: '/audit',
    labelKey: 'nav.audit',
    icon: ShieldCheck,
    cap: 'viewAudit',
  },
  { path: '/profile', labelKey: 'nav.profile', icon: User },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export const Sidebar = ({ mobileOpen, onMobileOpenChange }: SidebarProps) => {
  const location = useLocation();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const goTo = useViewTransitionNavigate();
  const logoutMutation = useLogout();

  // ponytail: real <a href> instead of <Link> so the view transition can be
  // triggered from onClick — keeps native Enter-key activation and
  // ctrl/cmd/shift/middle-click "open in new tab" behavior for free, same as
  // <Link> gave us. Only a plain left-click intercepts for the SPA/transition
  // navigate; anything else falls through to the browser's default anchor
  // behavior. `onNavigate` is only passed by the mobile sheet, to close
  // itself before navigating.
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    path: string,
    onNavigate?: () => void,
  ) => {
    onNavigate?.();
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }
    e.preventDefault();
    goTo(path, null, '');
  };

  // Precompute every gate (hooks can't run in a loop). Keyed by capability so
  // canSee is a plain lookup that mirrors CommandPalette and the App.tsx guards.
  const gate: Partial<Record<Capability, boolean>> = {
    manageBranches: useCan('manageBranches'),
    manageStaff: useCan('manageStaff'),
    manageUsers: useCan('manageUsers'),
    viewAudit: useCan('viewAudit'),
    recordPayment: useCan('recordPayment'),
  };
  const canSee = (item: NavItem) => !item.cap || gate[item.cap] === true;
  const filteredItems = navItems.filter(canSee);

  const roleLabel =
    user?.role === 'owner' ? t('roles.owner') : user?.branch_name;
  const initials =
    (user?.name || user?.email || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join('') || '?';

  return (
    <>
      {/* Desktop rail — icon-only: the label is a hover tooltip (side=right)
          and stays on aria-label for screen readers / discoverability. */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[72px] flex-col border-r border-hair bg-surface md:flex">
        <div className="flex flex-col items-center pt-5">
          <div className="mb-[22px] flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-[0_4px_14px] shadow-primary/45">
            <ArrowRight
              weight="bold"
              className="h-5 w-5 text-primary-foreground"
            />
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-2.5">
          {filteredItems.map((item) => {
            const active = location.pathname === item.path;
            const label = t(item.labelKey);
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <a
                    href={item.path}
                    onClick={(e) => handleNavClick(e, item.path)}
                    aria-label={label}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-11 w-full items-center justify-center rounded-xl transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
                    )}
                  >
                    <item.icon className="h-[21px] w-[21px] shrink-0" />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="flex flex-col items-center gap-2 pb-4 pt-2">
          <Avatar className="h-10 w-10 rounded-xl border border-border bg-muted">
            <AvatarFallback className="rounded-xl bg-muted font-mono text-xs font-semibold text-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => logoutMutation.mutate()}
                aria-label={t('actions.logout', 'Chiqish')}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-destructive"
              >
                <SignOut className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{t('actions.logout')}</TooltipContent>
          </Tooltip>
        </div>
      </aside>

      {/* Mobile — unchanged full-label sheet (labels + icons, no rail). */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-72 bg-sidebar p-0 [&>button]:text-sidebar-foreground"
        >
          {/* Radix Dialog requires a title for screen readers; visually hidden. */}
          <SheetTitle className="sr-only">{t('actions.sidebar')}</SheetTitle>
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center gap-3 border-b border-border px-4">
              <Brand size="sm" />
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-2">
              {filteredItems.map((item) => {
                const active = location.pathname === item.path;
                const label = t(item.labelKey);
                return (
                  <a
                    key={item.path}
                    href={item.path}
                    onClick={(e) =>
                      handleNavClick(e, item.path, () =>
                        onMobileOpenChange(false),
                      )
                    }
                    aria-label={label}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <span>{label}</span>
                  </a>
                );
              })}
            </nav>

            <div className="border-t border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar className="h-9 w-9 shrink-0 rounded-xl">
                    <AvatarFallback className="rounded-xl bg-muted text-xs font-semibold text-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {user?.name || user?.email}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {roleLabel}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onMobileOpenChange(false);
                    logoutMutation.mutate();
                  }}
                  aria-label={t('actions.logout', 'Chiqish')}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:text-destructive"
                >
                  <SignOut className="h-4 w-4" />
                  <span>{t('actions.logout')}</span>
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
