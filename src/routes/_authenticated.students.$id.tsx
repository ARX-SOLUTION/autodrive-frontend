import { createFileRoute } from '@tanstack/react-router';
import StudentDetailPage from '@/pages/StudentDetailPage';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';

type StudentDetailSearch = { tab?: 'payments' };

export const Route = createFileRoute('/_authenticated/students/$id')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/students/$id']),
  validateSearch: (search: Record<string, unknown>): StudentDetailSearch => ({
    tab: search.tab === 'payments' ? 'payments' : undefined,
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
