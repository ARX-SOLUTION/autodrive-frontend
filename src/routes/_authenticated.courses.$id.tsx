import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import CourseDetailPage from '@/pages/CourseDetailPage';

export const Route = createFileRoute('/_authenticated/courses/$id')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/courses/$id']),
  loader: async ({ context, params }) => {
    const { courseDetailQueryOptions } =
      await import('@/services/courseService');
    return context.queryClient.ensureQueryData(
      courseDetailQueryOptions(params.id),
    );
  },
  component: CourseDetailPage,
});
