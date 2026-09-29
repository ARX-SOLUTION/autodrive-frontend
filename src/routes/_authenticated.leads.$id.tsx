import { createFileRoute } from '@tanstack/react-router';
import LeadDetailPage from '@/features/leads/pages/LeadDetailPage';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';

export const Route = createFileRoute('/_authenticated/leads/$id')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/leads/$id']),
  component: LeadDetailPage,
});
