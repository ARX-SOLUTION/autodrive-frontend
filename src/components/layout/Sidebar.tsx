import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/services/authService';
import { useCan } from '@/hooks/useCan';
import { useViewTransitionNavigate } from '@/hooks/useViewTransitionNavigate';
import type { Capability } from '@/lib/permissions';
import { SignOut, PushPin, PushPinSlash } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { prefetchRoute } from '@/lib/routePrefetch';
import { NAV_ITEMS, NAV_SECTIONS, type NavItem } from '@/lib/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Brand } from './Brand';
import { isNavActive } from '@/lib/navActive';

interface SidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

const readPinnedPaths = (storageKey: string | null): string[] => {
  if (!storageKey || typeof window === 'undefined') return [];

  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(stored)
      ? stored.filter((path): path is string => typeof path === 'string')
      : [];
  } catch {
    return [];
  }
};

export const Sidebar = ({ mobileOpen, onMobileOpenChange }: SidebarProps) => {
  const location = useLocation();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const goTo = useViewTransitionNavigate();
  const logoutMutation = useLogout();
  const pinStorageKey = user?.id
    ? `autodrive-sidebar-pins:${user.company_id ?? 'default'}:${user.id}`
    : null;
  const [pinnedState, setPinnedState] = useState(() => ({
    storageKey: pinStorageKey,
    paths: readPinnedPaths(pinStorageKey),
  }));
  if (pinnedState.storageKey !== pinStorageKey) {
    setPinnedState({
      storageKey: pinStorageKey,
      paths: readPinnedPaths(pinStorageKey),
    });
  }
  const pinnedPaths = pinnedState.paths;

  const gate: Partial<Record<Capability, boolean>> = {
    manageBranches: useCan('manageBranches'),
    manageStaff: useCan('manageStaff'),
    manageUsers: useCan('manageUsers'),
    viewAudit: useCan('viewAudit'),
    recordPayment: useCan('recordPayment'),
  };
  const canSee = (item: NavItem) => !item.cap || gate[item.cap] === true;
  const visibleItems = NAV_ITEMS.filter(canSee);
  const itemByPath = useMemo(
    () => new Map(visibleItems.map((item) => [item.path, item])),
    [visibleItems],
  );
  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: visibleItems.filter((item) => item.section === section.id),
  })).filter((section) => section.items.length > 0);
  const pinnedItems = pinnedPaths
    .map((path) => itemByPath.get(path))
    .filter((item): item is NavItem => Boolean(item));

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
    // Sidebar links deliberately have no source/destination pair. The hook
    // therefore takes the plain navigation path instead of animating a whole
    // document transition and making the menu appear to jump.
    goTo(path, null, '');
  };

  const togglePin = (path: string) => {
    const next = pinnedPaths.includes(path)
      ? pinnedPaths.filter((itemPath) => itemPath !== path)
      : [...pinnedPaths, path].slice(0, 5);

    setPinnedState({ storageKey: pinStorageKey, paths: next });
    if (pinStorageKey) {
      window.localStorage.setItem(pinStorageKey, JSON.stringify(next));
    }
  };

  const renderNavItem = (
    item: NavItem,
    variant: 'desktop' | 'mobile',
    onNavigate?: () => void,
  ) => {
    const active = isNavActive(location.pathname, item.path);
    const label = t(item.labelKey);
    const pinned = pinnedPaths.includes(item.path);
    const isDesktop = variant === 'desktop';

    return (
      <div className="group relative" key={`${variant}-${item.path}`}>
        <a
          href={item.path}
          onClick={(e) => handleNavClick(e, item.path, onNavigate)}
          onMouseEnter={() => prefetchRoute(item.path)}
          onFocus={() => prefetchRoute(item.path)}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          data-sidebar-item="true"
          data-active={String(active)}
          className={cn(
            'before:absolute before:left-1.5 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-primary before:transition-[opacity,scale] before:duration-150 before:ease-out',
            'relative flex h-10 w-full items-center gap-3 rounded-[10px] py-0 pl-4 pr-3 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ease-out',
            active
              ? 'before:scale-100 before:opacity-100 bg-sidebar-accent text-sidebar-foreground shadow-[0_1px_2px_hsl(var(--foreground)/0.05)]'
              : 'before:scale-75 before:opacity-0 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
            !isDesktop && 'h-11 text-[0.95rem]',
          )}
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" />
          <span className="min-w-0 flex-1 truncate">{label}</span>
        </a>
        {isDesktop && item.pinnable !== false && (
          <button
            type="button"
            aria-label={t(pinned ? 'actions.unpin' : 'actions.pin', {
              item: label,
            })}
            title={t(pinned ? 'actions.unpin' : 'actions.pin', { item: label })}
            onClick={() => togglePin(item.path)}
            className={cn(
              'absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,opacity,scale] duration-150 ease-out active:scale-[0.96]',
              pinned
                ? 'opacity-100 hover:bg-sidebar hover:text-sidebar-foreground'
                : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-sidebar hover:text-sidebar-foreground',
            )}
          >
            {pinned ? (
              <PushPinSlash className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PushPin className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
    );
  };

  const renderNavGroups = (
    variant: 'desktop' | 'mobile',
    onNavigate?: () => void,
  ) => (
    <>
      {pinnedItems.length > 0 && (
        <section className="mb-5" aria-label={t('nav_sections.pinned')}>
          <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {t('nav_sections.pinned')}
          </p>
          <div className="space-y-1">
            {pinnedItems.map((item) =>
              renderNavItem(item, variant, onNavigate),
            )}
          </div>
        </section>
      )}

      {visibleSections.map((section) => (
        <section
          className="mb-5 last:mb-0"
          key={section.id}
          aria-label={t(section.labelKey)}
        >
          <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {t(section.labelKey)}
          </p>
          <div className="space-y-1">
            {section.items.map((item) =>
              renderNavItem(item, variant, onNavigate),
            )}
          </div>
        </section>
      ))}
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="border-b border-sidebar-border px-4 py-4">
          <Brand size="sm" />
          <p className="mt-2 truncate pl-3 text-xs font-medium text-muted-foreground">
            {user?.branch_name || t('nav.branches_all')}
          </p>
        </div>

        <nav
          aria-label={t('actions.sidebar')}
          className="app-sidebar-scroll flex-1 overflow-y-auto overscroll-contain px-3 py-4"
        >
          {renderNavGroups('desktop')}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2 rounded-xl bg-sidebar-accent/80 p-2 shadow-[0_1px_2px_hsl(var(--foreground)/0.05)]">
            <Avatar className="h-9 w-9 shrink-0 rounded-[10px]">
              <AvatarFallback className="rounded-[10px] bg-background text-xs font-semibold text-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                {user?.name || user?.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {roleLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              aria-label={t('actions.logout', 'Chiqish')}
              title={t('actions.logout', 'Chiqish')}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-background hover:text-destructive active:scale-[0.96]"
            >
              <SignOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-80 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">{t('actions.sidebar')}</SheetTitle>
          <div className="flex h-full flex-col">
            <div className="border-b border-sidebar-border px-5 py-4">
              <Brand size="sm" />
              <p className="mt-2 truncate pl-3 text-xs font-medium text-muted-foreground">
                {user?.branch_name || t('nav.branches_all')}
              </p>
            </div>

            <nav
              aria-label={t('actions.sidebar')}
              className="app-sidebar-scroll flex-1 overflow-y-auto overscroll-contain px-3 py-4"
            >
              {renderNavGroups('mobile', () => onMobileOpenChange(false))}
            </nav>

            <div className="border-t border-sidebar-border p-3">
              <div className="flex items-center justify-between gap-2 rounded-xl bg-sidebar-accent/80 p-2 shadow-[0_1px_2px_hsl(var(--foreground)/0.05)]">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar className="h-9 w-9 shrink-0 rounded-[10px]">
                    <AvatarFallback className="rounded-[10px] bg-background text-xs font-semibold text-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-sidebar-foreground">
                      {user?.name || user?.email}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {roleLabel}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onMobileOpenChange(false);
                    logoutMutation.mutate();
                  }}
                  aria-label={t('actions.logout', 'Chiqish')}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-background hover:text-destructive active:scale-[0.96]"
                >
                  <SignOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
