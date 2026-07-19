import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { CommandPalette } from '@/components/layout/CommandPalette';
import type { UserRole } from '@/types/user';

// autodrive-vh0.2: CommandPalette (Cmd+K) keeps its own NAV_ENTRIES list,
// separate from Sidebar's navItems, gated the same way (cap + useCan filter)
// -- it had the identical "Payments visible to everyone" gap. Uses the REAL
// permissions.ts matrix (unlike commandPaletteSearch.test.tsx's blanket
// useCan-always-true mock) so this is a genuine regression guard.

let role: UserRole = 'owner';

vi.mock('@/services/searchService', () => ({
  useGlobalSearch: () => ({ data: undefined, isFetching: false }),
}));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role } }),
}));

afterEach(() => {
  role = 'owner';
  cleanup();
});

const renderPalette = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <CommandPalette open onOpenChange={vi.fn()} />
    </MemoryRouter>,
  );

describe('CommandPalette teacher nav trim (autodrive-vh0.2)', () => {
  it('hides the Payments entry for a teacher', () => {
    role = 'teacher';
    renderPalette();
    expect(screen.queryByText('nav.payments')).toBeNull();
    // Teacher-relevant entries stay.
    expect(screen.getByText('nav.schedule')).toBeTruthy();
    expect(screen.getByText('nav.attendance')).toBeTruthy();
  });

  it('still shows the Payments entry for a manager (regression)', () => {
    role = 'manager';
    renderPalette();
    expect(screen.getByText('nav.payments')).toBeTruthy();
  });
});
