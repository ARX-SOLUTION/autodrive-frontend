import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { Sidebar } from '@/components/layout/Sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

// Sidebar rework (exec-dash 6-rail-and-header): the desktop rail is now
// fixed — no collapse/expand mode. Every item shows both an icon and an
// 8.5px micro-label, so aria-label is a defensive accessible-name duplicate
// rather than the only way to reach the item. Capability-gated items must
// still be filtered by useCan, and the mobile Sheet keeps its own separate
// full-label rendering with the original active-pill treatment.

let canGate = true;

vi.mock('@/hooks/useCan', () => ({ useCan: () => canGate }));
vi.mock('@/services/authService', () => ({
  useLogout: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      user: { role: 'owner', name: 'Test User', branch_name: null },
    }),
}));

afterEach(() => {
  canGate = true;
  cleanup();
});

const renderSidebar = (mobileOpen = false) =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <TooltipProvider>
        <Sidebar mobileOpen={mobileOpen} onMobileOpenChange={vi.fn()} />
      </TooltipProvider>
    </MemoryRouter>,
  );

describe('Sidebar rail', () => {
  it('renders items with a visible micro-label and a matching aria-label', () => {
    renderSidebar();
    expect(screen.getByLabelText('nav.dashboard')).toBeTruthy();
    expect(screen.getAllByText('nav.dashboard').length).toBeGreaterThan(0);
  });

  it('hides a capability-gated item when the capability check fails', () => {
    canGate = false;
    renderSidebar();
    expect(screen.queryByLabelText('nav.branches')).toBeNull();
  });

  it('marks the active route with the primary pill treatment', () => {
    renderSidebar();
    expect(screen.getByLabelText('nav.dashboard').className).toContain(
      'bg-primary',
    );
  });

  it('mobile sheet: still renders the full-label list, unchanged active treatment', () => {
    renderSidebar(true);
    // One match in the always-rendered desktop rail, one in the open sheet.
    const items = screen.getAllByLabelText('nav.dashboard');
    expect(items.length).toBe(2);
    expect(items.some((el) => el.className.includes('bg-primary/[12%]'))).toBe(
      true,
    );
  });
});
