import { afterEach, describe, expect, it } from 'vitest';
import { NAV_ITEMS } from '@/lib/navigation';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types/user';
import { requireCapability } from './routeGuards';

const originalAuth = useAuthStore.getState();

afterEach(() => useAuthStore.setState(originalAuth));

describe('driving availability before the session API exists', () => {
  it('does not advertise the unavailable session page in navigation', () => {
    expect(NAV_ITEMS.some((item) => item.path === '/driving-sessions')).toBe(
      false,
    );
  });

  it('blocks a direct session URL while keeping enrollments accessible', () => {
    useAuthStore.setState({
      hasHydrated: true,
      isAuthenticated: true,
      user: { role: 'owner' } as User,
    });
    const location = { pathname: '/driving-sessions', searchStr: '' };

    expect(() => requireCapability(location, 'viewDrivingSessions')).toThrow();
    expect(() =>
      requireCapability(location, 'viewTrainingEnrollments'),
    ).not.toThrow();
  });
});
