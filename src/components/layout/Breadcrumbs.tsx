import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

/**
 * Map URL slug → human label. Keep this colocated with routes — every page
 * the sidebar links to should have an entry here. Unknown segments fall
 * back to title-case of the slug, so a missing entry still renders something
 * sensible (just less polished).
 */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  filiallar: "Filiallar",
  guruhlar: "Guruhlar",
  talabalar: "Talabalar",
  tolovlar: "To'lovlar",
  hujjatlar: "Hujjatlar",
  operatorlar: "Operatorlar",
  oqituvchilar: "O'qituvchilar",
  foydalanuvchilar: "Foydalanuvchilar",
  audit: "Audit log",
  profile: "Profil",
};

const labelFor = (segment: string): string =>
  SEGMENT_LABELS[segment] ??
  segment
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const Breadcrumbs = () => {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0 || segments[0] === "login") return null;

  const crumbs = segments.map((segment, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    return { segment, href, label: labelFor(segment) };
  });

  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1 text-sm">
      <Link
        to="/dashboard"
        className="inline-flex items-center text-muted-foreground hover:text-foreground"
        aria-label="Bosh sahifa"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={c.href} className="inline-flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            {isLast ? (
              <span className="font-medium text-foreground">{c.label}</span>
            ) : (
              <Link to={c.href} className="text-muted-foreground hover:text-foreground">
                {c.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
};
