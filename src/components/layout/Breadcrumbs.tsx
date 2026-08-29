import { CaretRight, House } from '@phosphor-icons/react';
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

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

export const Breadcrumbs = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation();
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
      <Link
        to="/dashboard"
        preload="intent"
        className="inline-flex items-center text-muted-foreground hover:text-foreground"
        aria-label={t('actions.home')}
      >
        <House className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={c.href} className="inline-flex items-center gap-1">
            <CaretRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            {isLast ? (
              <span className="font-medium text-foreground">{c.label}</span>
            ) : (
              <Link
                to={c.href as never}
                preload="intent"
                className="text-muted-foreground hover:text-foreground"
              >
                {c.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
};
