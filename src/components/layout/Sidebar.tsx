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
  CaretLeft,
  Stack,
  UserGear,
  ShieldCheck,
  Calendar,
  ListChecks,
  BookOpen,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';
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
  { path: '/payments', labelKey: 'nav.payments', icon: CreditCard },
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

interface SidebarContentProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

const SidebarContent = ({ collapsed, onNavigate }: SidebarContentProps) => {
  const location = useLocation();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const goTo = useViewTransitionNavigate();

  // ponytail: real <a href> instead of <Link> so the view transition can be
  // triggered from onClick — keeps native Enter-key activation and
  // ctrl/cmd/shift/middle-click "open in new tab" behavior for free, same as
  // <Link> gave us. Only a plain left-click intercepts for the SPA/transition
  // navigate; anything else falls through to the browser's default anchor
  // behavior.
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    path: string,
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
  };
  const logoutMutation = useLogout();
  const canSee = (item: NavItem) => !item.cap || gate[item.cap] === true;
  const filteredItems = navItems.filter(canSee);

  const roleLabel =
    user?.role === 'owner' ? t('roles.owner') : user?.branch_name;

  const logoutButton = (
    <button
      onClick={() => {
        onNavigate?.();
        logoutMutation.mutate();
      }}
      aria-label={t('actions.logout', 'Chiqish')}
      className={cn(
        'flex items-center rounded-lg text-sm text-muted-foreground transition-colors hover:text-destructive',
        collapsed ? 'h-10 w-10 justify-center' : 'gap-2 px-2 py-2',
      )}
    >
      <SignOut className="h-4 w-4" />
      {!collapsed && <span>{t('actions.logout')}</span>}
    </button>
  );

  return (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        {collapsed ? (
          <span
            aria-hidden
            className="mx-auto h-6 w-1.5 rounded-full bg-primary"
          />
        ) : (
          <Brand size="sm" />
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {filteredItems.map((item) => {
          const active = location.pathname === item.path;
          const link = (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => handleNavClick(e, item.path)}
              aria-label={t(item.labelKey)}
              className={cn(
                'flex items-center rounded-lg text-sm font-medium transition-colors',
                collapsed
                  ? 'mx-auto h-11 w-11 justify-center'
                  : 'gap-3 px-3 py-2.5',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </a>
          );

          if (!collapsed) return link;

          return (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{t(item.labelKey)}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        {!collapsed && (
          <div className="mb-2 px-3">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.name || user?.email}
            </p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        )}
        <div className={cn('flex items-center', collapsed && 'justify-center')}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>{logoutButton}</TooltipTrigger>
              <TooltipContent side="right">
                {t('actions.logout')}
              </TooltipContent>
            </Tooltip>
          ) : (
            logoutButton
          )}
        </div>
      </div>
    </>
  );
};

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export const Sidebar = ({
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileOpenChange,
}: SidebarProps) => {
  const { t } = useTranslation();

  return (
    <>
      <aside
        className={cn(
          'fixed left-3 top-3 bottom-3 z-40 hidden flex-col rounded-2xl border border-border bg-sidebar transition-all duration-300 md:flex',
          collapsed
            ? 'w-[72px] shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.25)]'
            : 'w-60 shadow-[0_2px_4px_rgba(0,0,0,0.35),0_16px_48px_rgba(0,0,0,0.35)]',
        )}
      >
        <SidebarContent collapsed={collapsed} />
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={t('actions.sidebar')}
          className="absolute -right-3 top-20 z-10 rounded-full border border-border bg-background p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        >
          <CaretLeft
            className={cn(
              'h-4 w-4 transition-transform',
              collapsed && 'rotate-180',
            )}
          />
        </button>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-72 bg-sidebar p-0 [&>button]:text-sidebar-foreground"
        >
          <div className="flex h-full flex-col">
            <SidebarContent
              collapsed={false}
              onNavigate={() => onMobileOpenChange(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
