import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
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
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(
    readDesktopSidebarExpanded,
  );
  const location = useLocation();
  const { pathname, href } = location;
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
          desktopExpanded={desktopSidebarExpanded}
          onDesktopExpandedChange={handleDesktopSidebarExpandedChange}
        />
        <div
          className={cn(
            'flex min-h-dvh flex-col',
            desktopSidebarExpanded ? 'lg:ml-64' : 'lg:ml-[72px]',
          )}
        >
          <Topbar
            onMobileMenuClick={() => setMobileSidebarOpen(true)}
            onCommandPaletteOpen={() => palette.setOpen(true)}
          />
          <main
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            className="flex-1 p-4 outline-none sm:p-6 md:p-8 lg:p-10"
          >
            <div className="mx-auto w-full max-w-screen-2xl">
              <Breadcrumbs />
              <div>
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
