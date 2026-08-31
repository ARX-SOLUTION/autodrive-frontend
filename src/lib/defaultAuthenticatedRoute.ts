import type { UserRole } from '@/types/user';
import { roleCan } from '@/lib/permissions';

export type DefaultAuthenticatedRoute = '/dashboard' | '/profile';

export function getDefaultAuthenticatedRoute(
  role: UserRole | undefined | null,
): DefaultAuthenticatedRoute {
  return roleCan(role, 'viewDashboard') ? '/dashboard' : '/profile';
}
