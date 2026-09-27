import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import QuestionDetailPage from '@/features/questions/pages/QuestionDetailPage';

export const Route = createFileRoute('/_authenticated/questions/$id')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/questions/$id']),
  component: QuestionDetailPage,
});
