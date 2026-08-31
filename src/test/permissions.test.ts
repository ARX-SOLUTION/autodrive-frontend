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
      expect(roleCan('dev', cap)).toBe(true);
      expect(roleCan('owner', cap)).toBe(true);
    }
  });

  it('manager can manage staff/students but not branches or audit', () => {
    expect(roleCan('manager', 'manageStaff')).toBe(true);
    expect(roleCan('manager', 'manageStudents')).toBe(true);
    expect(roleCan('manager', 'manageBranches')).toBe(false);
    expect(roleCan('manager', 'assignBranch')).toBe(false);
    expect(roleCan('manager', 'viewAudit')).toBe(false);
  });

  it('operator handles day-to-day but cannot add staff', () => {
    expect(roleCan('operator', 'recordPayment')).toBe(true);
    expect(roleCan('operator', 'manageGroups')).toBe(true);
    expect(roleCan('operator', 'manageStaff')).toBe(false);
    expect(roleCan('operator', 'manageBranches')).toBe(false);
  });

  it('teacher can only take attendance and view the dashboard', () => {
    expect(roleCan('teacher', 'takeAttendance')).toBe(true);
    expect(roleCan('teacher', 'viewDashboard')).toBe(true);
    expect(roleCan('teacher', 'recordPayment')).toBe(false);
    expect(roleCan('teacher', 'manageStudents')).toBe(false);
  });

  it('accountant has no operational capability', () => {
    expect(roleCan('accountant', 'accessOperations')).toBe(false);
    expect(roleCan('accountant', 'viewDashboard')).toBe(false);
    expect(roleCan('accountant', 'recordPayment')).toBe(false);
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

  it('isCrossTenantRole is owner or dev only', () => {
    expect(isCrossTenantRole('owner')).toBe(true);
    expect(isCrossTenantRole('dev')).toBe(true);
    expect(isCrossTenantRole('manager')).toBe(false);
    expect(isCrossTenantRole('operator')).toBe(false);
    expect(isCrossTenantRole('teacher')).toBe(false);
    expect(isCrossTenantRole(undefined)).toBe(false);
  });
});
