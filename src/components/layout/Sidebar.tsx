import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useCan } from '@/hooks/useCan';
import type { Capability } from '@/lib/permissions';
import {
  CaretDown,
  PushPin,
  PushPinSlash,
  SidebarSimple,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  NAV_ITEMS,
  NAV_SECTIONS,
  type NavItem,
  type NavSection,
  type NavSectionId,
} from '@/lib/navigation';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SidebarAccountCard } from './SidebarAccountCard';
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

const readOpenSections = (storageKey: string | null): NavSectionId[] => {
  if (!storageKey || typeof window === 'undefined') return [];

  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(stored)
      ? stored.filter((id): id is NavSectionId =>
          NAV_SECTIONS.some((section) => section.id === id),
        )
      : [];
  } catch {
    return [];
  }
};

const withSection = (
  ids: NavSectionId[],
  id: NavSectionId | null,
): NavSectionId[] => (id && !ids.includes(id) ? [...ids, id] : ids);

type VisibleSection = NavSection & { items: NavItem[] };

const FLYOUT_OPEN_DELAY_MS = 200;
const FLYOUT_CLOSE_DELAY_MS = 300;

const isMousePointer = (event: ReactPointerEvent) =>
  event.pointerType === 'mouse';

const useDelayedAction = () => {
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return useMemo(
    () => ({
      cancel: () => window.clearTimeout(timer.current),
      schedule: (action: () => void, delayMs: number) => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(action, delayMs);
      },
    }),
    [],
  );
};

const railItemClass = (highlighted: boolean) =>
  cn(
    'group/rail relative flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1 transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
    highlighted
      ? 'text-sidebar-foreground'
      : 'text-muted-foreground hover:text-sidebar-foreground',
  );

const renderRailContent = (
  Icon: NavSection['icon'],
  label: string,
  highlighted: boolean,
) => (
  <>
    <span
      className={cn(
        'flex h-8 w-14 items-center justify-center rounded-full transition-[background-color,scale] duration-150 ease-out group-active/rail:scale-[0.94]',
        highlighted
          ? 'bg-sidebar-accent'
          : 'group-hover/rail:bg-sidebar-accent/70',
      )}
    >
      <Icon
        className="h-5 w-5 shrink-0"
        weight={highlighted ? 'fill' : 'regular'}
        aria-hidden="true"
      />
    </span>
    <span
      className={cn(
        'line-clamp-2 w-full break-normal text-center text-[11px] leading-[1.25]',
        highlighted ? 'font-semibold' : 'font-medium',
      )}
    >
      {label}
    </span>
  </>
);
const ACTIVE_MARKER_CLASS =
  'before:absolute before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-primary before:transition-[opacity,scale] before:duration-150 before:ease-out';

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
      expanded ? 'w-64' : 'w-[86px]',
    )}
  >
    <div
      className={cn(
        'flex h-16 shrink-0 items-center border-b border-sidebar-border px-3',
        expanded ? 'justify-between gap-2' : 'justify-center',
      )}
    >
      {expanded && (
        <div className="min-w-0">
          <Brand size="sm" />
          <p className="truncate pl-3 text-xs font-medium leading-4 text-muted-foreground">
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
      data-tour="crm-sidebar-desktop"
      aria-label={sidebarLabel}
      className={cn(
        'flex-1 overflow-y-auto overscroll-contain py-4',
        expanded
          ? 'app-sidebar-scroll px-3'
          : 'px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
      )}
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
          data-tour="crm-sidebar-mobile"
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
    viewPayments: useCan('viewPayments'),
    viewExpenses: useCan('viewExpenses'),
    viewOwnSettlements: useCan('viewOwnSettlements'),
    viewFuel: useCan('viewFuel'),
    viewInspections: useCan('viewInspections'),
    viewVehicles: useCan('viewVehicles'),
    viewFleetMap: useCan('viewFleetMap'),
    viewTrainingPrograms: useCan('viewTrainingPrograms'),
    viewTrainingEnrollments: useCan('viewTrainingEnrollments'),
    viewDrivingSessions: useCan('viewDrivingSessions'),
    viewSchoolLearning: useCan('viewSchoolLearning'),
    accessLeads: useCan('accessLeads'),
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

  const activeSectionId =
    visibleItems.find((item) => isNavActive(location.pathname, item.path))
      ?.section ?? null;
  const sectionStorageKey = user?.id
    ? `autodrive-sidebar-sections:${user.company_id ?? 'default'}:${user.id}`
    : null;
  const [sectionState, setSectionState] = useState(() => ({
    storageKey: sectionStorageKey,
    activeSectionId,
    openIds: withSection(readOpenSections(sectionStorageKey), activeSectionId),
  }));
  // Navigating into a collapsed group re-opens it so the selection stays visible.
  if (
    sectionState.storageKey !== sectionStorageKey ||
    sectionState.activeSectionId !== activeSectionId
  ) {
    const baseIds =
      sectionState.storageKey === sectionStorageKey
        ? sectionState.openIds
        : readOpenSections(sectionStorageKey);
    setSectionState({
      storageKey: sectionStorageKey,
      activeSectionId,
      openIds: withSection(baseIds, activeSectionId),
    });
  }
  const openSectionIds = sectionState.openIds;

  const [flyout, setFlyout] = useState<{
    sectionId: NavSectionId;
    pathname: string;
    via: 'hover' | 'click';
  } | null>(null);
  const isFlyoutOpen = (sectionId: NavSectionId) =>
    !desktopExpanded &&
    flyout?.sectionId === sectionId &&
    flyout.pathname === location.pathname;
  const anyFlyoutOpen =
    !desktopExpanded && flyout?.pathname === location.pathname;

  const hoverTimer = useDelayedAction();
  const clearHoverTimer = hoverTimer.cancel;

  const openFlyout = (sectionId: NavSectionId, via: 'hover' | 'click') => {
    clearHoverTimer();
    setFlyout({ sectionId, pathname: location.pathname, via });
  };
  const closeFlyout = () => {
    clearHoverTimer();
    setFlyout(null);
  };
  const scheduleHoverOpen = (sectionId: NavSectionId) => {
    clearHoverTimer();
    if (isFlyoutOpen(sectionId)) return;
    if (anyFlyoutOpen) {
      if (flyout?.via === 'hover') openFlyout(sectionId, 'hover');
      return;
    }
    hoverTimer.schedule(
      () => openFlyout(sectionId, 'hover'),
      FLYOUT_OPEN_DELAY_MS,
    );
  };
  const scheduleHoverClose = () => {
    clearHoverTimer();
    if (flyout?.via !== 'hover') return;
    hoverTimer.schedule(() => setFlyout(null), FLYOUT_CLOSE_DELAY_MS);
  };

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

  const toggleSection = (sectionId: NavSectionId) => {
    const next = openSectionIds.includes(sectionId)
      ? openSectionIds.filter((id) => id !== sectionId)
      : [...openSectionIds, sectionId];

    setSectionState({ ...sectionState, openIds: next });
    if (sectionStorageKey) {
      window.localStorage.setItem(sectionStorageKey, JSON.stringify(next));
    }
  };

  const renderNavItem = (
    item: NavItem,
    variant: 'desktop' | 'mobile' | 'flyout',
    onNavigate?: () => void,
  ) => {
    const active = isNavActive(location.pathname, item.path);
    const label = t(item.labelKey);
    const pinned = pinnedPaths.includes(item.path);
    const isDesktop = variant === 'desktop';
    const isRail = isDesktop && !desktopExpanded;

    return (
      <div className="group relative" key={`${variant}-${item.path}`}>
        <Link
          to={item.path}
          preload={false}
          onClick={onNavigate}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          data-sidebar-item="true"
          data-active={String(active)}
          title={isRail ? label : undefined}
          className={
            isRail
              ? railItemClass(active)
              : cn(
                  ACTIVE_MARKER_CLASS,
                  'relative flex h-10 w-full items-center gap-3 rounded-[10px] py-0 pl-4 pr-3 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ease-out before:left-1.5',
                  active
                    ? 'before:scale-100 before:opacity-100 bg-sidebar-accent text-sidebar-foreground shadow-[0_1px_2px_hsl(var(--foreground)/0.05)]'
                    : 'before:scale-75 before:opacity-0 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  isDesktop &&
                    desktopExpanded &&
                    item.pinnable !== false &&
                    'pr-12',
                  variant === 'mobile' && 'h-11 text-[0.95rem]',
                )
          }
        >
          {isRail ? (
            renderRailContent(item.icon, label, active)
          ) : (
            <>
              <item.icon
                className="h-[18px] w-[18px] shrink-0"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate">{label}</span>
            </>
          )}
        </Link>
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

  const renderRailSection = (section: VisibleSection) => {
    const label = t(section.labelKey);
    const active = section.id === activeSectionId;
    const open = isFlyoutOpen(section.id);
    const hoverOpened = open && flyout?.via === 'hover';

    return (
      <Popover
        key={`rail-${section.id}`}
        open={open}
        onOpenChange={(next) => {
          if (!next) closeFlyout();
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            data-sidebar-section="true"
            data-active={String(active)}
            onClick={(event) => {
              // Own the toggle so a click on a hover-opened flyout pins it open.
              event.preventDefault();
              if (open && !hoverOpened) closeFlyout();
              else openFlyout(section.id, 'click');
            }}
            onPointerEnter={(event) => {
              if (isMousePointer(event)) scheduleHoverOpen(section.id);
            }}
            onPointerLeave={(event) => {
              if (isMousePointer(event)) scheduleHoverClose();
            }}
            title={label}
            className={railItemClass(active || open)}
          >
            {renderRailContent(section.icon, label, active || open)}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          aria-label={label}
          onOpenAutoFocus={(event) => {
            if (hoverOpened) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            if (flyout?.via === 'hover') event.preventDefault();
          }}
          onPointerEnter={(event) => {
            if (isMousePointer(event)) clearHoverTimer();
          }}
          onPointerLeave={(event) => {
            if (isMousePointer(event)) scheduleHoverClose();
          }}
          className="w-60 rounded-2xl border-sidebar-border p-2 shadow-[0_16px_40px_-12px_hsl(var(--foreground)/0.22)]"
        >
          <p className="px-3 pb-1.5 pt-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) =>
              renderNavItem(item, 'flyout', closeFlyout),
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const renderStaticSection = (
    section: VisibleSection,
    variant: 'desktop' | 'mobile',
    onNavigate?: () => void,
  ) => (
    <div
      role="group"
      className="mb-3 last:mb-0"
      key={section.id}
      aria-label={t(section.labelKey)}
    >
      <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {t(section.labelKey)}
      </p>
      <div className="space-y-1">
        {section.items.map((item) => renderNavItem(item, variant, onNavigate))}
      </div>
    </div>
  );

  const renderCollapsibleSection = (
    section: VisibleSection,
    variant: 'desktop' | 'mobile',
    onNavigate?: () => void,
  ) => {
    const label = t(section.labelKey);
    const open = openSectionIds.includes(section.id);
    const contentId = `${variant}-nav-section-${section.id}`;

    return (
      <div
        role="group"
        className="mb-1 last:mb-0"
        key={section.id}
        aria-label={label}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => toggleSection(section.id)}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground transition-[background-color,color] duration-150 ease-out hover:bg-sidebar-accent/60 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
            variant === 'mobile' ? 'h-10' : 'h-8',
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">{label}</span>
          {!open && section.id === activeSectionId && (
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
            />
          )}
          <CaretDown
            aria-hidden="true"
            className={cn(
              'h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none',
              !open && '-rotate-90',
            )}
          />
        </button>
        <div
          id={contentId}
          inert={!open}
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
            open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="-mx-1 min-h-0 overflow-hidden px-1">
            <div className="space-y-1 pb-3 pt-1">
              {section.items.map((item) =>
                renderNavItem(item, variant, onNavigate),
              )}
            </div>
          </div>
        </div>
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
          <div
            role="group"
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
          </div>
        )}

        {collapsedDesktop ? (
          <div className="space-y-1">
            {visibleSections.map((section) =>
              section.collapsible === false ? (
                <div
                  key={`rail-${section.id}`}
                  className="space-y-1 border-b border-sidebar-border pb-2 mb-2 last:mb-0 last:border-b-0 last:pb-0"
                >
                  {section.items.map((item) =>
                    renderNavItem(item, variant, onNavigate),
                  )}
                </div>
              ) : section.items.length === 1 ? (
                renderNavItem(section.items[0]!, variant, onNavigate)
              ) : (
                renderRailSection(section)
              ),
            )}
          </div>
        ) : (
          visibleSections.map((section) =>
            section.collapsible === false
              ? renderStaticSection(section, variant, onNavigate)
              : renderCollapsibleSection(section, variant, onNavigate),
          )
        )}
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
