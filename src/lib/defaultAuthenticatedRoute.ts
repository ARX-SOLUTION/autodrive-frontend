import type { User, UserRole } from '@/features/staff/types';
import { roleCan, userCan } from '@/lib/permissions';

export type DefaultAuthenticatedRoute = '/dashboard' | '/expenses' | '/profile';

export function getDefaultAuthenticatedRoute(
  identity: User | UserRole | undefined | null,
): DefaultAuthenticatedRoute {
  if (identity && typeof identity === 'object') {
    if (userCan(identity, 'viewDashboard')) return '/dashboard';
    if (userCan(identity, 'viewExpenses')) return '/expenses';
    return '/profile';
  }
  const role = identity;
  if (roleCan(role, 'viewDashboard')) return '/dashboard';
  if (roleCan(role, 'viewExpenses')) return '/expenses';
  return '/profile';
}
