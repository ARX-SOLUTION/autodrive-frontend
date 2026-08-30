import { describe, expect, it } from 'vitest';
import { roleCan } from '@/lib/permissions';
import { ROUTE_CAPABILITIES } from './routeAccess';
import type { UserRole } from '@/types/user';

const ROLES: UserRole[] = [
  'dev',
  'owner',
  'manager',
  'accountant',
  'operator',
  'teacher',
];

const allowedRoles = (path: keyof typeof ROUTE_CAPABILITIES) =>
  ROLES.filter((role) => roleCan(role, ROUTE_CAPABILITIES[path]));

describe('protected route capability matrix', () => {
  it.each([
    ['/branches', ['dev', 'owner']],
    ['/branches/$id', ['dev', 'owner']],
    ['/courses', ['dev', 'owner', 'manager']],
    ['/courses/$id', ['dev', 'owner', 'manager']],
    ['/payments', ['dev', 'owner', 'manager', 'operator']],
    ['/operators', ['dev', 'owner', 'manager']],
    ['/teachers', ['dev', 'owner', 'manager']],
    ['/users', ['dev', 'owner']],
    ['/users/$id', ['dev', 'owner', 'manager']],
    ['/audit', ['dev', 'owner']],
    ['/audit/$id', ['dev', 'owner']],
  ] as const)('%s keeps its approved role boundary', (path, expected) => {
    expect(allowedRoles(path)).toEqual(expected);
  });
});
