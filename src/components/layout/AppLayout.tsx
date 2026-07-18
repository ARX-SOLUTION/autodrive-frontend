import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Breadcrumbs } from './Breadcrumbs';
import { CommandPalette, useCommandPalette } from './CommandPalette';

export const AppLayout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const palette = useCommandPalette();

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />
      <div className="flex min-h-screen flex-col md:ml-[82px]">
        <Topbar
          onMobileMenuClick={() => setMobileSidebarOpen(true)}
          onCommandPaletteOpen={() => palette.setOpen(true)}
        />
        <main className="flex-1 p-3 sm:p-4 md:p-6">
          <div className="mx-auto w-full max-w-screen-2xl">
            <Breadcrumbs />
            <div className="animate-in fade-in duration-200">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
    </div>
  );
};
