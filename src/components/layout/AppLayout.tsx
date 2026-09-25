import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { List } from '@phosphor-icons/react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { DemoSessionBanner } from './DemoSessionBanner';
import { Breadcrumbs } from './Breadcrumbs';
import { useCommandPalette } from './useCommandPalette';
import { PageLoader } from './PageLoader';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';

const CommandPalette = lazy(() => import('./CommandPalette'));

const DESKTOP_SIDEBAR_STORAGE_KEY = 'autodrive-sidebar-expanded';

const readDesktopSidebarExpanded = () => {
  if (typeof window === 'undefined') return true;

  try {
    return window.localStorage.getItem(DESKTOP_SIDEBAR_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
};

export const AppLayout = () => {
  const { t } = useTranslation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mapSidebarExpanded, setMapSidebarExpanded] = useState(false);
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(
    readDesktopSidebarExpanded,
  );
  const location = useLocation();
  const { pathname, href } = location;
  const isMapWorkspace = pathname.replace(/\/$/, '') === '/fleet-map';
  const sidebarExpanded = isMapWorkspace
    ? mapSidebarExpanded
    : desktopSidebarExpanded;
  const prevPathnameRef = useRef(pathname);
  const mainRef = useRef<HTMLElement>(null);
  const palette = useCommandPalette();

  // Match the previous router: any committed navigation (including a same-page
  // query update) closes the mobile drawer without waiting for an effect.
  const [committedHref, setCommittedHref] = useState(href);
  if (href !== committedHref) {
    setCommittedHref(href);
    setMobileSidebarOpen(false);
  }

  useEffect(() => {
    const pathChanged = pathname !== prevPathnameRef.current;
    prevPathnameRef.current = pathname;
    if (pathChanged) {
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [pathname]);

  const handleDesktopSidebarExpandedChange = (expanded: boolean) => {
    setDesktopSidebarExpanded(expanded);
    try {
      window.localStorage.setItem(
        DESKTOP_SIDEBAR_STORAGE_KEY,
        String(expanded),
      );
    } catch {
      // Storage can be unavailable in private/restricted browser contexts.
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-dvh bg-background">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
        >
          {t('a11y.skip_to_content')}
        </a>
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
          desktopExpanded={sidebarExpanded}
          onDesktopExpandedChange={
            isMapWorkspace
              ? setMapSidebarExpanded
              : handleDesktopSidebarExpandedChange
          }
        />
        <div
          className={cn(
            'relative flex flex-col',
            isMapWorkspace ? 'h-dvh overflow-hidden' : 'min-h-dvh',
            sidebarExpanded ? 'lg:ml-64' : 'lg:ml-[72px]',
          )}
        >
          <div className={cn(!isMapWorkspace && 'sticky top-0 z-30')}>
            <DemoSessionBanner />
            {!isMapWorkspace && (
              <Topbar
                onMobileMenuClick={() => setMobileSidebarOpen(true)}
                onCommandPaletteOpen={() => palette.setOpen(true)}
              />
            )}
          </div>
          <main
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            className={cn(
              'flex-1 outline-none',
              isMapWorkspace ? 'relative min-h-0' : 'p-4 sm:p-6 md:p-8 lg:p-10',
            )}
          >
            {isMapWorkspace && (
              <button
                type="button"
                aria-label={t('actions.sidebar')}
                onClick={() => setMobileSidebarOpen(true)}
                className="absolute left-3 top-3 z-40 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-foreground shadow-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
              >
                <List className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
            <div
              className={
                isMapWorkspace ? 'h-full' : 'mx-auto w-full max-w-screen-2xl'
              }
            >
              {!isMapWorkspace && <Breadcrumbs />}
              <div className={isMapWorkspace ? 'h-full' : undefined}>
                <Suspense fallback={<PageLoader />}>
                  <Outlet />
                </Suspense>
              </div>
            </div>
          </main>
        </div>
        {palette.open ? (
          <Suspense fallback={null}>
            <CommandPalette
              open={palette.open}
              onOpenChange={palette.setOpen}
            />
          </Suspense>
        ) : null}
      </div>
    </TooltipProvider>
  );
};
