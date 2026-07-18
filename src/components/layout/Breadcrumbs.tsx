import { CaretRight, House } from '@phosphor-icons/react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useViewTransitionNavigate } from '@/hooks/useViewTransitionNavigate';

/** Slug → translation key. Unknown slugs fall back to title-cased slug. */
const SEGMENT_KEYS: Record<string, string> = {
  dashboard: 'nav.dashboard',
  branches: 'nav.branches',
  groups: 'nav.groups',
  students: 'nav.students',
  payments: 'nav.payments',
  hujjatlar: 'nav.documents',
  operators: 'nav.operators',
  teachers: 'nav.teachers',
  users: 'nav.users',
  audit: 'nav.audit',
  profile: 'nav.profile',
  schedule: 'nav.schedule',
  attendance: 'nav.attendance',
};

const titleCase = (s: string) =>
  s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// ponytail: same real-<a>+onClick swap as Sidebar.tsx, see comment there —
// keeps Enter-key activation and modifier-click "open in new tab" for free.
const handleNavClick = (
  e: React.MouseEvent<HTMLAnchorElement>,
  goTo: ReturnType<typeof useViewTransitionNavigate>,
  path: string,
) => {
  if (
    e.defaultPrevented ||
    e.button !== 0 ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey
  ) {
    return;
  }
  e.preventDefault();
  goTo(path, null, '');
};

export const Breadcrumbs = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const goTo = useViewTransitionNavigate();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length < 2 || segments[0] === 'login') return null;

  const crumbs = segments.map((segment, idx) => {
    const href = '/' + segments.slice(0, idx + 1).join('/');
    const key = SEGMENT_KEYS[segment];
    return { segment, href, label: key ? t(key) : titleCase(segment) };
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-3 flex items-center gap-1 text-sm"
    >
      <a
        href="/dashboard"
        onClick={(e) => handleNavClick(e, goTo, '/dashboard')}
        className="inline-flex items-center text-muted-foreground hover:text-foreground"
        aria-label={t('actions.home')}
      >
        <House className="h-3.5 w-3.5" />
      </a>
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={c.href} className="inline-flex items-center gap-1">
            <CaretRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            {isLast ? (
              <span className="font-medium text-foreground">{c.label}</span>
            ) : (
              <a
                href={c.href}
                onClick={(e) => handleNavClick(e, goTo, c.href)}
                className="text-muted-foreground hover:text-foreground"
              >
                {c.label}
              </a>
            )}
          </span>
        );
      })}
    </nav>
  );
};
