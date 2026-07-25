import { Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Breadcrumbs } from './Breadcrumbs';
import { CommandPalette, useCommandPalette } from './CommandPalette';
import { PageLoader } from './PageLoader';
import { prefetchIdle } from '@/lib/routePrefetch';

export const AppLayout = () => {
  const { t } = useTranslation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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

  // Warm the highest-traffic routes during idle time (covers click-before-hover).
  useEffect(() => {
    prefetchIdle(['/students', '/payments', '/dashboard']);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        {t('a11y.skip_to_content')}
      </a>
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />
      <div className="flex min-h-screen flex-col md:ml-[72px]">
        <Topbar
          onMobileMenuClick={() => setMobileSidebarOpen(true)}
          onCommandPaletteOpen={() => palette.setOpen(true)}
        />
        <main
          ref={mainRef}
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-3 outline-none sm:p-4 md:p-6"
        >
          <div className="mx-auto w-full max-w-screen-2xl">
            <Breadcrumbs />
            <div className="animate-in fade-in duration-200">
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
