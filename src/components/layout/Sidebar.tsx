import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ownerOnly: false },
  { path: "/filiallar", label: "Filiallar", icon: Building2, ownerOnly: true },
  { path: "/guruhlar", label: "Guruhlar", icon: Layers, ownerOnly: false },
  { path: "/talabalar", label: "Talabalar", icon: GraduationCap, ownerOnly: false },
  { path: "/tolovlar", label: "To'lovlar", icon: CreditCard, ownerOnly: false },
  { path: "/operatorlar", label: "Operatorlar", icon: Headphones, ownerOnly: false },
  { path: "/oqituvchilar", label: "O'qituvchilar", icon: Users, ownerOnly: false },
  { path: "/foydalanuvchilar", label: "Foydalanuvchilar", icon: UserCog, ownerOnly: true },
  { path: "/audit", label: "Audit log", icon: ShieldCheck, ownerOnly: true },
  { path: "/profile", label: "Profil", icon: User, ownerOnly: false },
];

interface SidebarContentProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

const SidebarContent = ({ collapsed, onNavigate }: SidebarContentProps) => {
  const location = useLocation();
  const { user, logout, isOwner } = useAuthStore();
  const filteredItems = navItems.filter((item) => !item.ownerOnly || isOwner());

  return (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center">
          <img src="/favicon.png" alt="Logo" className="h-full w-full" />
        </div>
        {!collapsed && (
          <span className="font-heading text-lg font-bold text-foreground">
            Auto Maktab
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
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
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
            <p className="text-xs text-muted-foreground">
              {user?.role === "owner" ? "Biznes egasi" : user?.branch_name}
            </p>
          </div>
        )}
        <div className="flex items-center justify-between gap-1 px-1">
          <button
            onClick={() => {
              onNavigate?.();
              logout();
            }}
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Chiqish</span>}
          </button>
          <ThemeToggle collapsed={collapsed} />
        </div>
      </div>
    </>
  );
};

interface SidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export const Sidebar = ({ mobileOpen, onMobileOpenChange }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-border bg-sidebar transition-all duration-300 md:flex",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        <SidebarContent collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Yon menyuni ochish" : "Yon menyuni yopish"}
          className="absolute -right-3 top-20 z-10 rounded-full border border-border bg-background p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
          />
        </button>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-72 bg-sidebar p-0 [&>button]:text-sidebar-foreground"
        >
          <div className="flex h-full flex-col">
            <SidebarContent collapsed={false} onNavigate={() => onMobileOpenChange(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
