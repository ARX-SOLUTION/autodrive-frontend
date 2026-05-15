import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface ThemeToggleProps {
  collapsed?: boolean;
}

export const ThemeToggle = ({ collapsed }: ThemeToggleProps) => {
  const { theme, toggle } = useTheme();
  const Icon = theme === "dark" ? Sun : Moon;
  const label = theme === "dark" ? "Yorug' rejim" : "Tungi rejim";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
    >
      <Icon className="h-4 w-4" />
      {!collapsed && <span>{label}</span>}
    </button>
  );
};
