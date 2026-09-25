import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import QuestionsPage from '@/pages/QuestionsPage';

export const Route = createFileRoute('/_authenticated/questions/')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/questions']),
  component: QuestionsPage,
});
