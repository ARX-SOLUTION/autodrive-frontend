import type { Capability } from '@/lib/permissions';

export const ROUTE_CAPABILITIES = {
  '/branches': 'manageBranches',
  '/branches/$id': 'manageBranches',
  '/courses': 'manageStaff',
  '/courses/$id': 'manageStaff',
  '/payments': 'recordPayment',
  '/operators': 'manageStaff',
  '/teachers': 'manageStaff',
  '/users': 'manageUsers',
  // Managers intentionally reach a staff detail from teacher/operator lists
  // even though the company-wide /users list remains owner/dev only.
  '/users/$id': 'manageStaff',
  '/audit': 'viewAudit',
  '/audit/$id': 'viewAudit',
} as const satisfies Record<string, Capability>;

export type CapabilityRoutePath = keyof typeof ROUTE_CAPABILITIES;
