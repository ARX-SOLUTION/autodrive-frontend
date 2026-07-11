import { render, screen, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { RoleGate } from '@/components/RoleGate';

const auth = vi.hoisted(() => ({ role: 'manager' as string }));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: auth.role } }),
}));

afterEach(cleanup);

describe('RoleGate', () => {
  it('hides children when the role lacks the capability', () => {
    auth.role = 'manager';
    render(
      <RoleGate cap="manageBranches">
        <span>owner-only control</span>
      </RoleGate>,
    );
    expect(screen.queryByText('owner-only control')).toBeNull();
  });

  it('shows children when the role has the capability', () => {
    auth.role = 'owner';
    render(
      <RoleGate cap="manageBranches">
        <span>owner-only control</span>
      </RoleGate>,
    );
    expect(screen.getByText('owner-only control')).toBeTruthy();
  });

  it('renders the fallback when the capability is absent', () => {
    auth.role = 'teacher';
    render(
      <RoleGate cap="recordPayment" fallback={<span>no access</span>}>
        <span>pay form</span>
      </RoleGate>,
    );
    expect(screen.queryByText('pay form')).toBeNull();
    expect(screen.getByText('no access')).toBeTruthy();
  });
});
