import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { Sidebar } from '@/components/layout/Sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

// Sidebar rework (exec-dash 2-shell): default state is an icon-only rail
// (collapsed=true); the chevron expands it to show labels. Icon-only items
// must stay screen-reader reachable via aria-label since the visible <span>
// label is removed while collapsed.

vi.mock('@/hooks/useCan', () => ({ useCan: () => true }));
vi.mock('@/services/authService', () => ({
  useLogout: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'owner', name: 'Test User', branch_name: null } }),
}));

afterEach(cleanup);

const renderSidebar = (collapsed: boolean) =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <TooltipProvider>
        <Sidebar
          collapsed={collapsed}
          onCollapsedChange={vi.fn()}
          mobileOpen={false}
          onMobileOpenChange={vi.fn()}
        />
      </TooltipProvider>
    </MemoryRouter>,
  );

describe('Sidebar rail', () => {
  it('collapsed: hides visible labels but keeps items reachable via aria-label', () => {
    renderSidebar(true);
    expect(screen.queryByText('nav.dashboard')).toBeNull();
    expect(screen.getByLabelText('nav.dashboard')).toBeTruthy();
  });

  it('expanded: shows visible labels', () => {
    renderSidebar(false);
    expect(screen.getByText('nav.dashboard')).toBeTruthy();
  });

  it('marks the active route with the primary pill treatment', () => {
    renderSidebar(false);
    expect(screen.getByLabelText('nav.dashboard').className).toContain(
      'bg-primary/15',
    );
  });
});
