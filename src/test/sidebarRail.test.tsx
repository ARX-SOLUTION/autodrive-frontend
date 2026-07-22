import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { Sidebar } from '@/components/layout/Sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

// Sidebar rework: the desktop rail is now icon-only — each item shows just
// its icon; the label lives in a hover Tooltip and on aria-label (the
// accessible name / discoverability path). Capability-gated items must still
// be filtered by useCan, and the mobile Sheet keeps its own separate
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
  it('renders items icon-only: aria-label present, no visible text label', () => {
    renderSidebar();
    // reachable by accessible name (aria-label + hover tooltip)...
    expect(screen.getByLabelText('nav.dashboard')).toBeTruthy();
    // ...but the label is not rendered as visible text in the icon-only rail
    // (the closed tooltip contributes no text node).
    expect(screen.queryByText('nav.dashboard')).toBeNull();
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

  it('mobile sheet: renders the full-label list with the solid active treatment', () => {
    renderSidebar(true);
    // One match in the always-rendered desktop rail, one in the open sheet.
    const items = screen.getAllByLabelText('nav.dashboard');
    expect(items.length).toBe(2);
    // Both rail and sheet mark the active route with the solid primary pill
    // (a11y contrast fix — the mobile tint was a failing 2.6:1).
    expect(items.every((el) => el.className.includes('bg-primary'))).toBe(true);
  });
});
