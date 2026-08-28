import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { Sidebar } from '@/components/layout/Sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

// The desktop sidebar is a stable, full-label navigation surface. The active
// marker must live in a reserved gutter so moving between routes never changes
// the item's size or pushes its label horizontally.

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

const renderSidebar = (mobileOpen = false, path = '/dashboard') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <TooltipProvider>
        <Sidebar mobileOpen={mobileOpen} onMobileOpenChange={vi.fn()} />
      </TooltipProvider>
    </MemoryRouter>,
  );

describe('Sidebar navigation', () => {
  it('renders full labels on desktop instead of relying on hover tooltips', () => {
    renderSidebar();
    expect(screen.getByLabelText('nav.dashboard')).toBeTruthy();
    expect(screen.getByText('nav.dashboard')).toBeTruthy();
  });

  it('hides a capability-gated item when the capability check fails', () => {
    canGate = false;
    renderSidebar();
    expect(screen.queryByLabelText('nav.branches')).toBeNull();
  });

  it('reserves a stable selection gutter for the active route', () => {
    renderSidebar();
    const dashboard = screen.getByLabelText('nav.dashboard');
    expect(dashboard.getAttribute('data-sidebar-item')).toBe('true');
    expect(dashboard.className).toContain('h-10');
    expect(dashboard.className).toContain('pl-4');
    expect(dashboard.className).toContain('before:absolute');
    expect(dashboard.getAttribute('data-active')).toBe('true');
  });

  it('mobile sheet: renders the full-label list with a stable active treatment', () => {
    renderSidebar(true);
    const items = screen.getAllByLabelText('nav.dashboard');
    expect(items.length).toBe(2);
    expect(
      items.every((el) => el.getAttribute('data-sidebar-item') === 'true'),
    ).toBe(true);
    expect(items.every((el) => el.getAttribute('data-active') === 'true')).toBe(
      true,
    );
  });

  it('keeps the parent menu active on nested detail routes', () => {
    renderSidebar(false, '/groups/group-42');
    expect(
      screen.getByLabelText('nav.groups').getAttribute('data-active'),
    ).toBe('true');
    expect(
      screen.getByLabelText('nav.dashboard').getAttribute('data-active'),
    ).toBe('false');
  });
});
