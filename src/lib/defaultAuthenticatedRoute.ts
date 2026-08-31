import type { UserRole } from '@/types/user';
import { roleCan } from '@/lib/permissions';

export type DefaultAuthenticatedRoute = '/dashboard' | '/expenses' | '/profile';

export function getDefaultAuthenticatedRoute(
  role: UserRole | undefined | null,
): DefaultAuthenticatedRoute {
  if (roleCan(role, 'viewDashboard')) return '/dashboard';
  if (roleCan(role, 'viewExpenses')) return '/expenses';
  return '/profile';
}
