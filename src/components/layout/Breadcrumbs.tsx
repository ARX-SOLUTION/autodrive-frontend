import { CaretRight, House } from '@phosphor-icons/react';
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { AppRoutePath } from '@/lib/navigation';

/** Slug → translation key. Unknown slugs fall back to title-cased slug. */
const SEGMENT_KEYS: Record<string, string> = {
  dashboard: 'nav.dashboard',
  branches: 'nav.branches',
  groups: 'nav.groups',
  vehicles: 'nav.vehicles',
  'vehicle-inspections': 'inspections.title',
  'vehicle-fuel': 'fuel.title',
  'fuel-stations': 'fuel.stations',
  'fleet-map': 'nav.fleet_map',
  'training-programs': 'nav.training_programs',
  'training-enrollments': 'nav.training_enrollments',
  'driving-sessions': 'nav.driving_sessions',
  students: 'nav.students',
  payments: 'nav.payments',
  expenses: 'nav.expenses',
  hujjatlar: 'nav.documents',
  operators: 'nav.operators',
  teachers: 'nav.teachers',
  users: 'nav.users',
  audit: 'nav.audit',
  profile: 'nav.profile',
  schedule: 'nav.schedule',
  attendance: 'nav.attendance',
};

const ROOT_PATHS: Record<string, AppRoutePath> = {
  dashboard: '/dashboard',
  branches: '/branches',
  groups: '/groups',
  vehicles: '/vehicles',
  'vehicle-inspections': '/vehicle-inspections',
  'vehicle-fuel': '/vehicle-fuel',
  'fuel-stations': '/fuel-stations',
  'fleet-map': '/fleet-map',
  'training-programs': '/training-programs',
  'training-enrollments': '/training-enrollments',
  'driving-sessions': '/driving-sessions',
  students: '/students',
  payments: '/payments',
  expenses: '/expenses',
  operators: '/operators',
  teachers: '/teachers',
  users: '/users',
  audit: '/audit',
  profile: '/profile',
  schedule: '/schedule',
  attendance: '/attendance',
};

const titleCase = (s: string) =>
  s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const ID_SEGMENT =
  /^(\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const VIEW_LABEL_ROOTS = ['vehicle-inspections', 'vehicle-fuel'];

export const Breadcrumbs = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length < 2 || segments[0] === 'login') return null;

  const crumbs = segments.flatMap((segment, idx) => {
    const href = idx === 0 ? ROOT_PATHS[segment] : undefined;
    if (idx > 0 && VIEW_LABEL_ROOTS.includes(segments[0])) {
      return [{ segment, href, label: t('common.view') }];
    }
    // Detail pages show the entity name in their own header.
    if (ID_SEGMENT.test(segment)) return [];
    const key = SEGMENT_KEYS[segment];
    return [{ segment, href, label: key ? t(key) : titleCase(segment) }];
  });

  if (crumbs.length < 2) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-3 flex items-center gap-1 text-sm"
    >
      <Link
        to="/dashboard"
        preload={false}
        className="inline-flex items-center text-muted-foreground hover:text-foreground"
        aria-label={t('actions.home')}
      >
        <House className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span
            key={`${c.segment}-${i}`}
            className="inline-flex items-center gap-1"
          >
            <CaretRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            {isLast ? (
              <span className="font-medium text-foreground">{c.label}</span>
            ) : c.href ? (
              <Link
                to={c.href}
                preload={false}
                className="text-muted-foreground hover:text-foreground"
              >
                {c.label}
              </Link>
            ) : (
              <span className="text-muted-foreground">{c.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
};
