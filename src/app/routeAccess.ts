import type { Capability } from '@/lib/permissions';

export const ROUTE_CAPABILITIES = {
  '/dashboard': 'viewDashboard',
  '/expenses': 'viewExpenses',
  '/expenses/$id': 'viewExpenses',
  '/my-settlements': 'viewOwnSettlements',
  '/my-settlements/$id': 'viewOwnSettlements',
  '/schedule': 'accessOperations',
  '/attendance': 'accessOperations',
  '/groups': 'accessOperations',
  '/groups/$id': 'accessOperations',
  '/vehicles': 'viewVehicles',
  '/vehicles/$id': 'viewVehicles',
  '/training-programs': 'viewTrainingPrograms',
  '/training-enrollments': 'viewTrainingEnrollments',
  '/training-enrollments/$id': 'viewTrainingEnrollments',
  '/driving-sessions': 'viewDrivingSessions',
  '/driving-sessions/$id': 'viewDrivingSessions',
  '/students': 'accessOperations',
  '/students/$id': 'accessOperations',
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
