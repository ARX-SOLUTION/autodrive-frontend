import { Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Breadcrumbs } from './Breadcrumbs';
import { CommandPalette, useCommandPalette } from './CommandPalette';
import { PageLoader } from './PageLoader';
import { cn } from '@/lib/utils';

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
  const navigationType = useNavigationType();
  const prevPathnameRef = useRef(location.pathname);
  const mainRef = useRef<HTMLElement>(null);
  const palette = useCommandPalette();

  // Was the first line of the effect below (`setMobileSidebarOpen(false)`),
  // unconditionally on every commit where pathname OR navigationType
  // changed (react-hooks/set-state-in-effect). Moved to React's documented
  // render-phase "reset state when a value changes" pattern -- same trigger
  // condition (tracks both values, exactly mirroring the old effect's dep
  // array), same unconditional close, just one render sooner.
  const [committedNav, setCommittedNav] = useState(() => ({
    pathname: location.pathname,
    navigationType,
  }));
  if (
    location.pathname !== committedNav.pathname ||
    navigationType !== committedNav.navigationType
  ) {
    setCommittedNav({ pathname: location.pathname, navigationType });
    setMobileSidebarOpen(false);
  }

  useEffect(() => {
    // Scroll to top only on a real PATH change via forward/replace nav (link
    // clicks). Skip POP (back/forward) so the browser restores the previous
    // scroll position; skip same-path REPLACE updates — search/filter/
    // pagination write query params via setSearchParams({ replace: true }),
    // which must NOT yank the viewport to the top mid-interaction.
    const pathChanged = location.pathname !== prevPathnameRef.current;
    prevPathnameRef.current = location.pathname;
    if (pathChanged && navigationType !== 'POP') {
      window.scrollTo(0, 0);
    }
    // a11y: on a real route change move focus to <main> so screen readers
    // announce the new page. preventScroll keeps POP scroll-restore intact.
    if (pathChanged) {
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [location.pathname, navigationType]);

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
          'flex min-h-dvh flex-col transition-[margin-left] duration-200 ease-out motion-reduce:transition-none',
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
      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
    </div>
  );
};
