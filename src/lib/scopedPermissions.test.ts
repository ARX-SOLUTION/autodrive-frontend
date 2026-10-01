import { describe, expect, it } from 'vitest';
import { userCan } from '@/lib/permissions';
import type { User } from '@/features/staff/types';

const user: User = {
  id: 'staff',
  email: 'staff@example.com',
  role: 'manager',
  company_id: 'company',
  branch_id: 'a',
  branch_ids: ['a', 'b'],
  permissions: [],
};

describe('scoped permissions', () => {
  it('does not restore role permissions when explicit access is empty', () => {
    expect(userCan(user, 'manageStudents', 'a')).toBe(false);
  });
  it('keeps read and write branch grants independent', () => {
    const granted: User = {
      ...user,
      permissions: [
        { permission: 'students.read', scope: 'branch', branch_id: 'a' },
        { permission: 'students.update', scope: 'branch', branch_id: 'b' },
      ],
    };
    expect(userCan(granted, 'students.read', 'a')).toBe(true);
    expect(userCan(granted, 'students.update', 'a')).toBe(false);
    expect(userCan(granted, 'students.read', 'b')).toBe(false);
    expect(userCan(granted, 'students.update', 'b')).toBe(true);
    expect(userCan(granted, 'students.delete', 'b')).toBe(false);
  });
  it('rejects a branch outside active membership even with company access', () => {
    const granted: User = {
      ...user,
      permissions: [
        { permission: 'students.read', scope: 'company', branch_id: null },
      ],
    };
    expect(userCan(granted, 'students.read', 'other')).toBe(false);
    expect(userCan(granted, 'students.read', 'b')).toBe(true);
  });
});

import { useAuthStore } from '@/store/authStore';
import { studentKeys, vehicleKeys } from '@/lib/queryKeys';
import { queryClient } from '@/lib/queryClient';

describe('access cache isolation', () => {
  it('starts branch-only accountants in their membership on login and cookie restore', () => {
    const accountant: User = {
      ...user,
      role: 'accountant',
      branch_ids: ['b'],
      permissions: [
        { permission: 'payments.read', scope: 'branch', branch_id: 'b' },
      ],
    };
    useAuthStore.getState().setAuth('token', accountant);
    expect(useAuthStore.getState().activeBranchId).toBe('b');
    useAuthStore.setState({ activeBranchId: null, sessionValidated: false });
    useAuthStore.getState().setUser(accountant);
    expect(useAuthStore.getState().activeBranchId).toBe('b');
    useAuthStore.setState({ sessionValidated: true });
    useAuthStore.getState().setActiveBranch(null);
    useAuthStore.getState().setUser(accountant);
    expect(useAuthStore.getState().activeBranchId).toBeNull();
  });
  it('separates detail caches and clears old data when the active branch changes', () => {
    useAuthStore.setState({
      user: { ...user, access_version: 3 },
      activeBranchId: 'a',
    });
    const a = studentKeys.detail('student');
    const vehicleA = vehicleKeys.detail('vehicle');
    queryClient.setQueryData(a, { branch: 'a' });
    useAuthStore.getState().setActiveBranch('b');
    expect(studentKeys.detail('student')).not.toEqual(a);
    expect(vehicleKeys.detail('vehicle')).not.toEqual(vehicleA);
    expect(queryClient.getQueryData(a)).toBeUndefined();
    expect(useAuthStore.getState().activeBranchId).toBe('b');
    useAuthStore.getState().setActiveBranch('outside');
    expect(useAuthStore.getState().activeBranchId).toBe('b');
  });
  it('separates caches when access version, company or actor changes', () => {
    useAuthStore.setState({
      user: { ...user, access_version: 3 },
      activeBranchId: 'a',
    });
    const first = studentKeys.detail('student');
    useAuthStore.getState().setUser({ ...user, access_version: 4 });
    expect(studentKeys.detail('student')).not.toEqual(first);
    const version = studentKeys.detail('student');
    useAuthStore.getState().setUser({
      ...user,
      id: 'another',
      company_id: 'another',
      access_version: 4,
    });
    expect(studentKeys.detail('student')).not.toEqual(version);
  });
});

import { canAccessRoute } from '@/app/routeAccess';

describe('write-only route shells', () => {
  it('allows student creation without opening a student detail or implying read', () => {
    const writer: User = {
      ...user,
      permissions: [
        { permission: 'students.create', scope: 'branch', branch_id: 'a' },
      ],
    };
    expect(canAccessRoute(writer, '/students', 'accessOperations', 'a')).toBe(
      true,
    );
    expect(
      canAccessRoute(writer, '/students/student', 'accessOperations', 'a'),
    ).toBe(false);
    expect(userCan(writer, 'students.read', 'a')).toBe(false);
    expect(
      canAccessRoute(
        {
          ...user,
          permissions: [
            {
              permission: 'staff.permissions.manage',
              scope: 'branch',
              branch_id: 'a',
            },
          ],
        },
        '/users/staff',
        'manageStaff',
        'a',
      ),
    ).toBe(false);
    expect(canAccessRoute(writer, '/students', 'accessOperations', 'b')).toBe(
      false,
    );
  });
});
