import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { Sidebar } from '@/components/layout/Sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { UserRole } from '@/types/user';

// autodrive-vh0.2: teacher self-service nav trim. Unlike sidebarRail.test.tsx
// (which mocks useCan as one global boolean shared by every capability, fine
// for testing the filter mechanism in isolation), this exercises the REAL
// useCan/permissions.ts matrix via a role-parameterized authStore mock -- so
// it's a genuine regression guard on the CAPABILITIES map, not just this
// component's rendering.

let role: UserRole = 'owner';

vi.mock('@/services/authService', () => ({
  useLogout: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      user: { role, name: 'Test User', branch_name: null },
    }),
}));

afterEach(() => {
  role = 'owner';
  cleanup();
});

const renderSidebar = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <TooltipProvider>
        <Sidebar
          mobileOpen={false}
          onMobileOpenChange={vi.fn()}
          desktopExpanded
          onDesktopExpandedChange={vi.fn()}
        />
      </TooltipProvider>
    </MemoryRouter>,
  );

describe('Sidebar teacher nav trim (autodrive-vh0.2)', () => {
  it('hides Payments for a teacher', () => {
    role = 'teacher';
    renderSidebar();
    expect(screen.queryByLabelText('nav.payments')).toBeNull();
  });

  it('keeps dashboard/schedule/attendance/groups/students/profile for a teacher', () => {
    role = 'teacher';
    renderSidebar();
    expect(screen.getByLabelText('nav.dashboard')).toBeTruthy();
    expect(screen.getByLabelText('nav.schedule')).toBeTruthy();
    expect(screen.getByLabelText('nav.attendance')).toBeTruthy();
    expect(screen.getByLabelText('nav.groups')).toBeTruthy();
    expect(screen.getByLabelText('nav.students')).toBeTruthy();
    expect(screen.getByLabelText('nav.profile')).toBeTruthy();
  });

  it('still hides the already-admin-only items for a teacher', () => {
    role = 'teacher';
    renderSidebar();
    expect(screen.queryByLabelText('nav.branches')).toBeNull();
    expect(screen.queryByLabelText('nav.courses')).toBeNull();
    expect(screen.queryByLabelText('nav.operators')).toBeNull();
    expect(screen.queryByLabelText('nav.teachers')).toBeNull();
    expect(screen.queryByLabelText('nav.users')).toBeNull();
    expect(screen.queryByLabelText('nav.audit')).toBeNull();
  });

  // Regression: only teacher's nav should change (Slice A requirement).
  it('still shows Payments for dev', () => {
    role = 'dev';
    renderSidebar();
    expect(screen.getByLabelText('nav.payments')).toBeTruthy();
  });

  it('still shows Payments for owner', () => {
    role = 'owner';
    renderSidebar();
    expect(screen.getByLabelText('nav.payments')).toBeTruthy();
  });

  it('still shows Payments for manager', () => {
    role = 'manager';
    renderSidebar();
    expect(screen.getByLabelText('nav.payments')).toBeTruthy();
  });

  it('still shows Payments for operator', () => {
    role = 'operator';
    renderSidebar();
    expect(screen.getByLabelText('nav.payments')).toBeTruthy();
  });
});
