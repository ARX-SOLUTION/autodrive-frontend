import { createFileRoute } from '@tanstack/react-router';
import { requireCompanyOwner } from '@/app/routeGuards';
import PermissionTemplatesPage from '@/features/staff/pages/PermissionTemplatesPage';

export const Route = createFileRoute('/_authenticated/permission-templates')({
  beforeLoad: ({ location }) => requireCompanyOwner(location),
  component: PermissionTemplatesPage,
});
