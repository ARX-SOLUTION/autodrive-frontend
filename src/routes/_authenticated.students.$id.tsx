import { createFileRoute } from '@tanstack/react-router';
import StudentDetailPage from '@/pages/StudentDetailPage';
import { studentDetailQueryOptions } from '@/services/studentService';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';

type StudentDetailSearch = { tab?: 'payments' };

export const Route = createFileRoute('/_authenticated/students/$id')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/students/$id']),
  validateSearch: (search: Record<string, unknown>): StudentDetailSearch => ({
    tab: search.tab === 'payments' ? 'payments' : undefined,
  }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(studentDetailQueryOptions(params.id)),
  component: StudentDetailPage,
});
