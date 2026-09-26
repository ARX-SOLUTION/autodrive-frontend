import { createFileRoute } from '@tanstack/react-router';
import StudentDetailPage from '@/pages/StudentDetailPage';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';

const STUDENT_DETAIL_TABS = [
  'payments',
  'exams',
  'attendance',
  'group-history',
] as const;

type StudentDetailTab = (typeof STUDENT_DETAIL_TABS)[number];
type StudentDetailSearch = { tab?: StudentDetailTab };

export const Route = createFileRoute('/_authenticated/students/$id')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/students/$id']),
  validateSearch: (search: Record<string, unknown>): StudentDetailSearch => ({
    tab: STUDENT_DETAIL_TABS.includes(search.tab as StudentDetailTab)
      ? (search.tab as StudentDetailTab)
      : undefined,
  }),
  loader: async ({ context, params }) => {
    const { studentDetailQueryOptions } =
      await import('@/services/studentService');
    return context.queryClient.ensureQueryData(
      studentDetailQueryOptions(params.id),
    );
  },
  component: StudentDetailPage,
});
