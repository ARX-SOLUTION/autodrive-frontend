import { createFileRoute } from '@tanstack/react-router';
import AttendancePage from '@/pages/AttendancePage';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import {
  parseRouteLimit,
  parseRoutePage,
  type PageSizeOption,
} from '@/lib/listQuery';

type AttendanceSearch = {
  lesson?: string;
  limit?: PageSizeOption;
  page?: number;
  q?: string;
};

export const Route = createFileRoute('/_authenticated/attendance')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/attendance']),
  validateSearch: (search: Record<string, unknown>): AttendanceSearch => ({
    lesson: typeof search.lesson === 'string' ? search.lesson : undefined,
    limit: parseRouteLimit(search.limit),
    page: parseRoutePage(search.page),
    q: typeof search.q === 'string' ? search.q : undefined,
  }),
  component: AttendancePage,
});
