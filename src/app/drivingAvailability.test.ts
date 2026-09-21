import { afterEach, describe, expect, it } from 'vitest';
import { NAV_ITEMS } from '@/lib/navigation';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types/user';
import { requireCapability } from './routeGuards';

const originalAuth = useAuthStore.getState();

afterEach(() => useAuthStore.setState(originalAuth));

describe('driving availability after the session API is available', () => {
  it('advertises the session page in navigation', () => {
    expect(NAV_ITEMS.some((item) => item.path === '/driving-sessions')).toBe(
      true,
    );
  });

  it('allows direct session URLs for roles that can view driving sessions', () => {
    useAuthStore.setState({
      hasHydrated: true,
      isAuthenticated: true,
      user: { role: 'owner' } as User,
    });
    const location = { pathname: '/driving-sessions', searchStr: '' };

    expect(() =>
      requireCapability(location, 'viewDrivingSessions'),
    ).not.toThrow();
    expect(() =>
      requireCapability(location, 'viewTrainingEnrollments'),
    ).not.toThrow();
  });
});
