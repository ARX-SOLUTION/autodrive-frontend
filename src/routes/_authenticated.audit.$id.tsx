import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import AuditDetailPage from '@/pages/AuditDetailPage';

export const Route = createFileRoute('/_authenticated/audit/$id')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/audit/$id']),
  component: AuditDetailPage,
});
