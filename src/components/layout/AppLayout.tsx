import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Breadcrumbs } from "./Breadcrumbs";
import { CommandPalette, useCommandPalette } from "./CommandPalette";

export const AppLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const palette = useCommandPalette();

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />
      <div className={cn(
        "flex min-h-screen flex-col transition-all duration-300",
        sidebarCollapsed ? "md:ml-[68px]" : "md:ml-60"
      )}>
        <Topbar
          onMobileMenuClick={() => setMobileSidebarOpen(true)}
          onCommandPaletteOpen={() => palette.setOpen(true)}
        />
        <main className="flex-1 p-3 sm:p-4 md:p-6">
          <Breadcrumbs />
          <div className="animate-in fade-in duration-200">
            <Outlet />
          </div>
        </main>
      </div>
      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
    </div>
  );
};
