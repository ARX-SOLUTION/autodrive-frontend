import { Menu, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TopbarProps {
  onMobileMenuClick: () => void;
  onCommandPaletteOpen: () => void;
}

export const Topbar = ({ onMobileMenuClick, onCommandPaletteOpen }: TopbarProps) => {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur sm:px-4 md:px-6">
      <button
        type="button"
        aria-label={t("actions.sidebar") as string}
        onClick={onMobileMenuClick}
        className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <span className="font-heading text-base font-semibold text-foreground md:hidden">
        {t("app.title")}
      </span>
      <div className="flex flex-1 items-center justify-end">
        <button
          type="button"
          onClick={onCommandPaletteOpen}
          aria-label={t("actions.search", "Qidirish") as string}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground sm:px-3"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">{t("actions.search", "Qidirish") as string}</span>
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium sm:inline">
            ⌘K
          </kbd>
        </button>
      </div>
    </header>
  );
};
