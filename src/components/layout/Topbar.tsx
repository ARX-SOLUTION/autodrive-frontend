import { Menu } from "lucide-react";

interface TopbarProps {
  onMobileMenuClick: () => void;
}

export const Topbar = ({ onMobileMenuClick }: TopbarProps) => {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur sm:px-4 md:hidden">
      <button
        type="button"
        aria-label="Yon menyu"
        onClick={onMobileMenuClick}
        className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>
      <span className="font-heading text-base font-semibold text-foreground">
        Auto Maktab
      </span>
    </header>
  );
};
