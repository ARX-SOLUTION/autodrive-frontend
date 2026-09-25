import { describe, it, expect } from 'vitest';
import {
  roleCan,
  isCrossTenantRole,
  CAPABILITIES,
  type Capability,
} from '@/lib/permissions';

const ALL_CAPS = Object.keys(CAPABILITIES) as Capability[];

describe('permissions matrix (bd autodrive-6ef.2)', () => {
  it('dev and owner have every capability (dev ⊇ owner)', () => {
    for (const cap of ALL_CAPS) {
      if (
        cap === 'viewOwnSettlements' ||
        cap === 'submitDrivingSession' ||
        cap === 'reviewDrivingSessions'
      ) {
        expect(roleCan('owner', cap)).toBe(false);
        expect(roleCan('dev', cap)).toBe(false);
        continue;
      }
      expect(roleCan('owner', cap)).toBe(true);
      if (
        cap === 'viewExpenses' ||
        cap === 'manageCompanyFinance' ||
        cap === 'navigateExpenseOverdueSweep' ||
        cap === 'cancelDrivingSessions'
      ) {
        expect(roleCan('dev', cap)).toBe(false);
      } else {
        expect(roleCan('dev', cap)).toBe(true);
      }
    }
  });

  it('manager can manage staff/students but not branches or audit', () => {
    expect(roleCan('manager', 'manageStaff')).toBe(true);
    expect(roleCan('manager', 'manageStudents')).toBe(true);
    expect(roleCan('manager', 'manageGroups')).toBe(true);
    expect(roleCan('manager', 'viewExpenses')).toBe(true);
    expect(roleCan('manager', 'manageCompanyFinance')).toBe(false);
    expect(roleCan('manager', 'manageBranches')).toBe(false);
    expect(roleCan('manager', 'assignBranch')).toBe(false);
    expect(roleCan('manager', 'viewAudit')).toBe(false);
  });

  it('limits group mutations to dev, owner, and manager', () => {
    expect(roleCan('dev', 'manageGroups')).toBe(true);
    expect(roleCan('owner', 'manageGroups')).toBe(true);
    expect(roleCan('manager', 'manageGroups')).toBe(true);
    expect(roleCan('operator', 'manageGroups')).toBe(false);
    expect(roleCan('teacher', 'manageGroups')).toBe(false);
    expect(roleCan('accountant', 'manageGroups')).toBe(false);
  });

  it('operator handles day-to-day but cannot add staff', () => {
    expect(roleCan('operator', 'recordPayment')).toBe(true);
    expect(roleCan('operator', 'manageGroups')).toBe(false);
    expect(roleCan('operator', 'manageStaff')).toBe(false);
    expect(roleCan('operator', 'manageBranches')).toBe(false);
  });

  it('teacher can only take attendance and view the dashboard', () => {
    expect(roleCan('teacher', 'takeAttendance')).toBe(true);
    expect(roleCan('teacher', 'viewDashboard')).toBe(true);
    expect(roleCan('teacher', 'viewOwnSettlements')).toBe(true);
    expect(roleCan('teacher', 'recordPayment')).toBe(false);
    expect(roleCan('teacher', 'manageStudents')).toBe(false);
  });

  it('accountant has no operational capability except T8B dashboard', () => {
    expect(roleCan('accountant', 'accessOperations')).toBe(false);
    expect(roleCan('accountant', 'viewDashboard')).toBe(true);
    expect(roleCan('accountant', 'recordPayment')).toBe(false);
  });

  it('pins overdue sweep keyboard navigation to owner and manager only', () => {
    expect(roleCan('owner', 'navigateExpenseOverdueSweep')).toBe(true);
    expect(roleCan('manager', 'navigateExpenseOverdueSweep')).toBe(true);
    expect(roleCan('accountant', 'navigateExpenseOverdueSweep')).toBe(false);
    expect(roleCan('dev', 'navigateExpenseOverdueSweep')).toBe(false);
    expect(roleCan('operator', 'navigateExpenseOverdueSweep')).toBe(false);
    expect(roleCan('teacher', 'navigateExpenseOverdueSweep')).toBe(false);
  });

  it('owner/accountant receive finance controls and managers receive read-only expense access', () => {
    expect(roleCan('owner', 'viewExpenses')).toBe(true);
    expect(roleCan('accountant', 'viewExpenses')).toBe(true);
    expect(roleCan('manager', 'viewExpenses')).toBe(true);
    expect(roleCan('owner', 'manageCompanyFinance')).toBe(true);
    expect(roleCan('accountant', 'manageCompanyFinance')).toBe(true);
    expect(roleCan('dev', 'viewExpenses')).toBe(false);
    expect(roleCan('dev', 'manageCompanyFinance')).toBe(false);
  });

  // autodrive-vh0.4: manageOwnLesson deliberately excludes operator even
  // though operator already creates lessons via manageSchedule -- operator
  // must never get a delete-own-lesson affordance the backend won't honor.
  it('manageOwnLesson is teacher plus dev/owner/manager, never operator', () => {
    expect(roleCan('teacher', 'manageOwnLesson')).toBe(true);
    expect(roleCan('operator', 'manageOwnLesson')).toBe(false);
  });

  it('an absent/unknown role has no capability', () => {
    expect(roleCan(undefined, 'viewDashboard')).toBe(false);
    expect(roleCan(null, 'takeAttendance')).toBe(false);
  });

  // autodrive-cg9: soft-delete restore is owner-only across all 4 entities.
  it('viewDeleted is owner/dev only', () => {
    expect(roleCan('manager', 'viewDeleted')).toBe(false);
    expect(roleCan('operator', 'viewDeleted')).toBe(false);
    expect(roleCan('teacher', 'viewDeleted')).toBe(false);
  });

  it('fleet is operational, but only owner and manager may mutate vehicles', () => {
    for (const role of [
      'dev',
      'owner',
      'manager',
      'operator',
      'teacher',
    ] as const) {
      expect(roleCan(role, 'viewVehicles')).toBe(true);
    }
    expect(roleCan('accountant', 'viewVehicles')).toBe(false);
    for (const role of ['dev', 'owner', 'manager'] as const) {
      expect(roleCan(role, 'manageVehicles')).toBe(true);
    }
    expect(roleCan('operator', 'manageVehicles')).toBe(false);
    expect(roleCan('teacher', 'manageVehicles')).toBe(false);
    expect(roleCan('accountant', 'manageVehicles')).toBe(false);
  });

  it('keeps fleet tracking out of staff and finance roles', () => {
    for (const role of ['dev', 'owner', 'manager'] as const) {
      expect(roleCan(role, 'viewFleetMap')).toBe(true);
    }
    for (const role of ['operator', 'teacher', 'accountant'] as const) {
      expect(roleCan(role, 'viewFleetMap')).toBe(false);
    }
  });

  it('separates driving instructor submission from manager-only review', () => {
    expect(roleCan('teacher', 'submitDrivingSession')).toBe(true);
    expect(roleCan('owner', 'submitDrivingSession')).toBe(false);
    expect(roleCan('manager', 'submitDrivingSession')).toBe(false);
    expect(roleCan('teacher', 'reviewDrivingSessions')).toBe(false);
    expect(roleCan('owner', 'reviewDrivingSessions')).toBe(false);
    expect(roleCan('manager', 'reviewDrivingSessions')).toBe(true);
    expect(roleCan('operator', 'scheduleDrivingSessions')).toBe(true);
    expect(roleCan('teacher', 'viewDrivingSummary')).toBe(false);
    expect(roleCan('operator', 'viewDrivingSummary')).toBe(true);
    expect(roleCan('accountant', 'viewDrivingSessions')).toBe(false);
  });

  it('school learning view includes operator; manage excludes operator', () => {
    for (const role of [
      'dev',
      'owner',
      'manager',
      'operator',
      'teacher',
    ] as const) {
      expect(roleCan(role, 'viewSchoolLearning')).toBe(true);
    }
    expect(roleCan('accountant', 'viewSchoolLearning')).toBe(false);
    for (const role of ['dev', 'owner', 'manager', 'teacher'] as const) {
      expect(roleCan(role, 'manageSchoolLearning')).toBe(true);
    }
    expect(roleCan('operator', 'manageSchoolLearning')).toBe(false);
    expect(roleCan('accountant', 'manageSchoolLearning')).toBe(false);
  });

  it('isCrossTenantRole is owner or dev only', () => {
    expect(isCrossTenantRole('owner')).toBe(true);
    expect(isCrossTenantRole('dev')).toBe(true);
    expect(isCrossTenantRole('manager')).toBe(false);
    expect(isCrossTenantRole('operator')).toBe(false);
    expect(isCrossTenantRole('teacher')).toBe(false);
    expect(isCrossTenantRole(undefined)).toBe(false);
  });
});
