import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/services/authService';
import { useCan } from '@/hooks/useCan';
import type { Capability } from '@/lib/permissions';
import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  CreditCard,
  Headphones,
  Users,
  User,
  LogOut,
  ChevronLeft,
  Layers,
  UserCog,
  ShieldCheck,
  Calendar,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';

type NavItem = {
  path: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  // Capability required to see this item; absent = visible to everyone.
  // Must match the route guard in App.tsx for the same path.
  cap?: Capability;
};

const navItems: NavItem[] = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  {
    path: '/branches',
    labelKey: 'nav.branches',
    icon: Building2,
    cap: 'manageBranches',
  },
  { path: '/schedule', labelKey: 'nav.schedule', icon: Calendar },
  { path: '/attendance', labelKey: 'nav.attendance', icon: ClipboardCheck },
  { path: '/groups', labelKey: 'nav.groups', icon: Layers },
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
    icon: Users,
    cap: 'manageStaff',
  },
  {
    path: '/users',
    labelKey: 'nav.users',
    icon: UserCog,
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

  return (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center">
          <img src="/favicon.png" alt="Logo" className="h-full w-full" />
        </div>
        {!collapsed && (
          <span className="font-heading text-lg font-bold text-foreground">
            {t('app.title')}
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              aria-label={t(item.labelKey)}
              className={cn(
                'flex items-center text-sm font-medium transition-colors rounded-lg',
                collapsed
                  ? 'justify-center mx-auto w-10 h-10'
                  : 'gap-3 px-3 py-2.5',
                active
                  ? 'bg-primary/10 text-primary neon-glow-sm'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </Link>
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
          <button
            onClick={() => {
              onNavigate?.();
              logoutMutation.mutate();
            }}
            aria-label={t('actions.logout', 'Chiqish')}
            className={cn(
              'flex items-center rounded-lg text-sm text-muted-foreground hover:text-destructive transition-colors',
              collapsed ? 'justify-center w-10 h-10' : 'gap-2 px-2 py-2',
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>{t('actions.logout')}</span>}
          </button>
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
          'fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-glass-border-light backdrop-blur-2xl transition-all duration-300 md:flex',
          collapsed ? 'w-[68px]' : 'w-60',
        )}
        style={{ background: 'hsl(var(--sidebar-background))' }}
      >
        <SidebarContent collapsed={collapsed} />
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={t('actions.sidebar')}
          className="absolute -right-3 top-20 z-10 rounded-full border border-border bg-background p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        >
          <ChevronLeft
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
