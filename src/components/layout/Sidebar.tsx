import { useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useCan } from '@/hooks/useCan';
import type { Capability } from '@/lib/permissions';
import { PushPin, PushPinSlash, SidebarSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, NAV_SECTIONS, type NavItem } from '@/lib/navigation';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { SidebarAccountCard } from './SidebarAccountCard';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Brand } from './Brand';
import { isNavActive } from '@/lib/navActive';

interface SidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  desktopExpanded: boolean;
  onDesktopExpandedChange: (expanded: boolean) => void;
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

interface DesktopSidebarProps {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  sidebarLabel: string;
  branchLabel: string;
  navigation: ReactNode;
}

const DesktopSidebar = ({
  expanded,
  onExpandedChange,
  sidebarLabel,
  branchLabel,
  navigation,
}: DesktopSidebarProps) => (
  <aside
    data-state={expanded ? 'expanded' : 'collapsed'}
    className={cn(
      'fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-sidebar-border bg-sidebar lg:flex',
      expanded ? 'w-64' : 'w-[72px]',
    )}
  >
    <div
      className={cn(
        'flex h-[85px] shrink-0 border-b border-sidebar-border',
        expanded
          ? 'items-start justify-between gap-2 px-3 py-3'
          : 'items-center justify-center px-3',
      )}
    >
      {expanded && (
        <div className="min-w-0 pt-1">
          <Brand size="sm" />
          <p className="mt-2 truncate pl-3 text-xs font-medium text-muted-foreground">
            {branchLabel}
          </p>
        </div>
      )}
      <button
        type="button"
        aria-label={sidebarLabel}
        aria-controls="desktop-sidebar-navigation"
        aria-expanded={expanded}
        title={sidebarLabel}
        onClick={() => onExpandedChange(!expanded)}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar active:scale-[0.96]"
      >
        <SidebarSimple className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>

    <nav
      id="desktop-sidebar-navigation"
      aria-label={sidebarLabel}
      className="app-sidebar-scroll flex-1 overflow-y-auto overscroll-contain px-3 py-4"
    >
      {navigation}
    </nav>

    <div className="border-t border-sidebar-border p-3">
      <SidebarAccountCard expanded={expanded} />
    </div>
  </aside>
);

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sidebarLabel: string;
  branchLabel: string;
  navigation: ReactNode;
}

const MobileSidebar = ({
  open,
  onOpenChange,
  sidebarLabel,
  branchLabel,
  navigation,
}: MobileSidebarProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent
      side="left"
      className="w-80 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground"
    >
      <SheetTitle className="sr-only">{sidebarLabel}</SheetTitle>
      <div className="flex h-full flex-col">
        <div className="border-b border-sidebar-border px-5 py-4">
          <Brand size="sm" />
          <p className="mt-2 truncate pl-3 text-xs font-medium text-muted-foreground">
            {branchLabel}
          </p>
        </div>

        <nav
          aria-label={sidebarLabel}
          className="app-sidebar-scroll flex-1 overflow-y-auto overscroll-contain px-3 py-4"
        >
          {navigation}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <SidebarAccountCard
            expanded
            onBeforeLogout={() => onOpenChange(false)}
          />
        </div>
      </div>
    </SheetContent>
  </Sheet>
);

export const Sidebar = ({
  mobileOpen,
  onMobileOpenChange,
  desktopExpanded,
  onDesktopExpandedChange,
}: SidebarProps) => {
  const location = useLocation();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
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
    accessOperations: useCan('accessOperations'),
    viewDashboard: useCan('viewDashboard'),
    manageBranches: useCan('manageBranches'),
    manageStaff: useCan('manageStaff'),
    manageUsers: useCan('manageUsers'),
    viewAudit: useCan('viewAudit'),
    recordPayment: useCan('recordPayment'),
    viewExpenses: useCan('viewExpenses'),
    viewOwnSettlements: useCan('viewOwnSettlements'),
    viewVehicles: useCan('viewVehicles'),
    viewFleetMap: useCan('viewFleetMap'),
    viewTrainingPrograms: useCan('viewTrainingPrograms'),
    viewTrainingEnrollments: useCan('viewTrainingEnrollments'),
    viewDrivingSessions: useCan('viewDrivingSessions'),
  };
  const canSee = (item: NavItem) => !item.cap || gate[item.cap] === true;
  const visibleItems = NAV_ITEMS.filter(canSee);
  const itemByPath = useMemo(
    () =>
      new Map<string, NavItem>(visibleItems.map((item) => [item.path, item])),
    [visibleItems],
  );
  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: visibleItems.filter((item) => item.section === section.id),
  })).filter((section) => section.items.length > 0);
  const pinnedItems = pinnedPaths
    .map((path) => itemByPath.get(path))
    .filter((item): item is NavItem => Boolean(item));

  const sidebarLabel = t('actions.sidebar');
  const branchLabel = user?.branch_name || t('nav.branches_all');

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

    const navLink = (
      <Link
        to={item.path}
        preload={false}
        onClick={onNavigate}
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
          isDesktop &&
            !desktopExpanded &&
            'justify-center gap-0 px-0 before:left-0.5',
          isDesktop && desktopExpanded && item.pinnable !== false && 'pr-12',
          !isDesktop && 'h-11 text-[0.95rem]',
        )}
      >
        <item.icon className="h-[18px] w-[18px] shrink-0" />
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            isDesktop && !desktopExpanded && 'sr-only',
          )}
        >
          {label}
        </span>
      </Link>
    );

    return (
      <div className="group relative" key={`${variant}-${item.path}`}>
        {isDesktop && !desktopExpanded ? (
          <Tooltip>
            <TooltipTrigger asChild>{navLink}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {label}
            </TooltipContent>
          </Tooltip>
        ) : (
          navLink
        )}
        {isDesktop && desktopExpanded && item.pinnable !== false && (
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
  ) => {
    const collapsedDesktop = variant === 'desktop' && !desktopExpanded;

    return (
      <>
        {pinnedItems.length > 0 && (
          <section
            className={cn('mb-5', collapsedDesktop && 'mb-3')}
            aria-label={t('nav_sections.pinned')}
          >
            {collapsedDesktop ? (
              <div
                aria-hidden="true"
                className="mx-2 mb-2 border-t border-sidebar-border"
              />
            ) : (
              <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                {t('nav_sections.pinned')}
              </p>
            )}
            <div className="space-y-1">
              {pinnedItems.map((item) =>
                renderNavItem(item, variant, onNavigate),
              )}
            </div>
          </section>
        )}

        {visibleSections.map((section) => (
          <section
            className={cn('mb-5 last:mb-0', collapsedDesktop && 'mb-3')}
            key={section.id}
            aria-label={t(section.labelKey)}
          >
            {collapsedDesktop ? (
              <div
                aria-hidden="true"
                className="mx-2 mb-2 border-t border-sidebar-border"
              />
            ) : (
              <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                {t(section.labelKey)}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) =>
                renderNavItem(item, variant, onNavigate),
              )}
            </div>
          </section>
        ))}
      </>
    );
  };

  return (
    <>
      <DesktopSidebar
        expanded={desktopExpanded}
        onExpandedChange={onDesktopExpandedChange}
        sidebarLabel={sidebarLabel}
        branchLabel={branchLabel}
        navigation={renderNavGroups('desktop')}
      />
      <MobileSidebar
        open={mobileOpen}
        onOpenChange={onMobileOpenChange}
        sidebarLabel={sidebarLabel}
        branchLabel={branchLabel}
        navigation={renderNavGroups('mobile', () => onMobileOpenChange(false))}
      />
    </>
  );
};
