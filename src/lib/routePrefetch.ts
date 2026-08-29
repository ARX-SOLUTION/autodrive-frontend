// Perf: warm a route's lazy chunk before the user clicks it (on nav hover/focus),
// so the page paints instantly instead of showing a Suspense fallback. Each
// importer resolves to the SAME module App.tsx's lazy() loads, so Vite/Rollup
// serve one shared chunk — prefetching just moves the download earlier.
const importers: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('@/pages/DashboardPage'),
  '/branches': () => import('@/pages/BranchesPage'),
  '/schedule': () => import('@/pages/SchedulePage'),
  '/attendance': () => import('@/pages/AttendancePage'),
  '/groups': () => import('@/pages/GroupsPage'),
  '/courses': () => import('@/pages/CoursesPage'),
  '/students': () => import('@/pages/StudentsPage'),
  '/payments': () => import('@/pages/PaymentsPage'),
  '/operators': () => import('@/pages/OperatorsPage'),
  '/teachers': () => import('@/pages/TeachersPage'),
  '/users': () => import('@/pages/UsersPage'),
  '/audit': () => import('@/pages/AuditLogPage'),
  '/profile': () => import('@/pages/ProfilePage'),
};

const warmed = new Set<string>();

/**
 * Fire-and-forget prefetch of a route's code chunk. Runs at most once per path;
 * a failed prefetch is harmless (the real navigation re-imports) and is
 * un-warmed so it can retry. The `map` param exists only for testing.
 */
export function prefetchRoute(
  path: string,
  map: Record<string, () => Promise<unknown>> = importers,
): void {
  if (warmed.has(path)) return;
  const importer = map[path];
  if (!importer) return;
  warmed.add(path);
  void importer().catch(() => warmed.delete(path));
}
