import { createFileRoute } from '@tanstack/react-router';
import AttendancePage from '@/pages/AttendancePage';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';

type AttendanceSearch = { lesson?: string };

export const Route = createFileRoute('/_authenticated/attendance')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/attendance']),
  validateSearch: (search: Record<string, unknown>): AttendanceSearch => ({
    lesson: typeof search.lesson === 'string' ? search.lesson : undefined,
  }),
  component: AttendancePage,
});
