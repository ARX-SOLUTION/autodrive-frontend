import { userCan, type Capability } from '@/lib/permissions';
import type { User } from '@/features/staff/types';

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
  '/vehicle-fuel': 'viewFuel',
  '/vehicle-fuel/$id': 'viewFuel',
  '/fuel-stations': 'viewFuel',
  '/vehicle-inspections': 'viewInspections',
  '/vehicle-inspections/$id': 'viewInspections',
  '/vehicles': 'viewVehicles',
  '/vehicles/$id': 'viewVehicles',
  '/fleet-map': 'viewFleetMap',
  '/training-programs': 'viewTrainingPrograms',
  '/training-enrollments': 'viewTrainingEnrollments',
  '/training-enrollments/$id': 'viewTrainingEnrollments',
  '/driving-sessions': 'viewDrivingSessions',
  '/driving-sessions/$id': 'viewDrivingSessions',
  '/students': 'accessOperations',
  '/students/$id': 'accessOperations',
  '/leads': 'accessLeads',
  '/leads/$id': 'accessLeads',
  '/questions': 'viewSchoolLearning',
  '/questions/$id': 'viewSchoolLearning',
  '/school-tests': 'viewSchoolLearning',
  '/school-tests/$id': 'viewSchoolLearning',
  '/branches': 'manageBranches',
  '/branches/$id': 'manageBranches',
  '/courses': 'manageStaff',
  '/courses/$id': 'manageStaff',
  '/payments': 'viewPayments',
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

export const ROUTE_PERMISSIONS: Partial<
  Record<CapabilityRoutePath, `${string}.${string}`>
> = {
  '/students': 'students.read',
  '/students/$id': 'students.read',
  '/groups': 'groups.read',
  '/groups/$id': 'groups.read',
  '/schedule': 'schedule.read',
  '/attendance': 'attendance.read',
  '/courses': 'courses.read',
  '/courses/$id': 'courses.read',
  '/questions': 'questions.read',
  '/questions/$id': 'questions.read',
  '/school-tests': 'test_templates.read',
  '/school-tests/$id': 'test_templates.read',
  '/branches': 'branches.read',
  '/branches/$id': 'branches.read',
  '/operators': 'staff.read',
  '/teachers': 'staff.read',
  '/users': 'staff.read',
  '/users/$id': 'staff.read',
  '/fuel-stations': 'fuel_stations.read',
};

const CREATE_ROUTE_PERMISSIONS: Partial<
  Record<CapabilityRoutePath, `${string}.${string}`>
> = {
  '/students': 'students.create',
  '/groups': 'groups.create',
  '/users': 'staff.create',
  '/teachers': 'staff.create',
  '/operators': 'staff.create',
  '/branches': 'branches.create',
  '/courses': 'courses.create',
  '/vehicles': 'vehicles.create',
  '/vehicle-fuel': 'fuel.create',
  '/fuel-stations': 'fuel_stations.create',
  '/vehicle-inspections': 'vehicle_inspections.create',
  '/training-programs': 'training_programs.create',
  '/training-enrollments': 'training_enrollments.create',
  '/driving-sessions': 'driving_sessions.create',
  '/questions': 'questions.create',
  '/school-tests': 'test_templates.create',
  '/expenses': 'expenses.create',
  '/payments': 'payments.create',
  '/schedule': 'schedule.create',
  '/attendance': 'lessons.create',
  '/leads': 'leads.create',
};

/** A write-only user may open the list shell to create; detail routes still require read. */
export function canAccessRoute(
  user: User | null,
  path: string,
  capability: Capability,
  branchId?: string | null,
) {
  if (user?.permissions === undefined)
    return userCan(user, capability, branchId);
  const routePath = (
    path in ROUTE_CAPABILITIES ? path : path.replace(/\/[^/]+$/, '/$id')
  ) as CapabilityRoutePath;
  const create = CREATE_ROUTE_PERMISSIONS[routePath];
  return (
    userCan(user, ROUTE_PERMISSIONS[routePath] ?? capability, branchId) ||
    (!!create && userCan(user, create, branchId))
  );
}
