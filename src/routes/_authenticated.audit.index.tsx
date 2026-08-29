import { createFileRoute } from '@tanstack/react-router';
import { requireCapability } from '@/app/routeGuards';
import { ROUTE_CAPABILITIES } from '@/app/routeAccess';
import AuditLogPage from '@/pages/AuditLogPage';

export const Route = createFileRoute('/_authenticated/audit/')({
  beforeLoad: ({ location }) =>
    requireCapability(location, ROUTE_CAPABILITIES['/audit']),
  component: AuditLogPage,
});
