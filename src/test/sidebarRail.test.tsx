import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { Sidebar } from '@/components/layout/Sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { prefetchRoute } from '@/lib/routePrefetch';

// The desktop sidebar is a stable, full-label navigation surface. The active
// marker must live in a reserved gutter so moving between routes never changes
// the item's size or pushes its label horizontally.

let canGate = true;

vi.mock('@/hooks/useCan', () => ({ useCan: () => canGate }));
vi.mock('@/services/authService', () => ({
  useLogout: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/lib/routePrefetch', () => ({ prefetchRoute: vi.fn() }));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      user: {
        id: 'user-1',
        role: 'owner',
        name: 'Test User',
        branch_name: null,
      },
    }),
}));

afterEach(() => {
  canGate = true;
  localStorage.clear();
  vi.mocked(prefetchRoute).mockClear();
  cleanup();
});

const renderSidebar = (
  mobileOpen = false,
  path = '/dashboard',
  desktopExpanded = true,
  onDesktopExpandedChange = vi.fn(),
) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <TooltipProvider>
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileOpenChange={vi.fn()}
          desktopExpanded={desktopExpanded}
          onDesktopExpandedChange={onDesktopExpandedChange}
        />
      </TooltipProvider>
    </MemoryRouter>,
  );

describe('Sidebar navigation', () => {
  it('renders full labels on desktop instead of relying on hover tooltips', () => {
    renderSidebar();
    expect(screen.getByLabelText('nav.dashboard')).toBeTruthy();
    expect(screen.getByText('nav.dashboard')).toBeTruthy();
  });

  it('exposes a 40px desktop toggle with its expanded state', () => {
    const onDesktopExpandedChange = vi.fn();
    renderSidebar(false, '/dashboard', true, onDesktopExpandedChange);

    const toggle = screen.getByRole('button', { name: 'actions.sidebar' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute(
      'aria-controls',
      'desktop-sidebar-navigation',
    );
    expect(toggle.className).toContain('h-10');
    expect(toggle.className).toContain('w-10');

    fireEvent.click(toggle);
    expect(onDesktopExpandedChange).toHaveBeenCalledWith(false);
  });

  it('keeps collapsed desktop links labeled, recognizable, and prefetchable', async () => {
    renderSidebar(false, '/dashboard', false);

    const dashboard = screen.getByLabelText('nav.dashboard');
    expect(dashboard.className).toContain('justify-center');
    expect(dashboard.querySelector('svg')).not.toBeNull();
    expect(screen.getByText('nav.dashboard').className).toContain('sr-only');

    fireEvent.focus(dashboard);
    expect(prefetchRoute).toHaveBeenCalledWith('/dashboard');
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'nav.dashboard',
    );
  });

  it('keeps pinned navigation present when the desktop sidebar collapses', () => {
    const { rerender } = renderSidebar();
    fireEvent.click(screen.getAllByLabelText('actions.pin')[0]!);

    rerender(
      <MemoryRouter initialEntries={['/dashboard']}>
        <TooltipProvider>
          <Sidebar
            mobileOpen={false}
            onMobileOpenChange={vi.fn()}
            desktopExpanded={false}
            onDesktopExpandedChange={vi.fn()}
          />
        </TooltipProvider>
      </MemoryRouter>,
    );

    expect(screen.getAllByLabelText('nav.dashboard')).toHaveLength(2);
    expect(screen.getByLabelText('nav_sections.pinned')).toBeTruthy();
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

  it('mobile sheet: stays a full-label drawer when desktop is collapsed', () => {
    renderSidebar(true, '/dashboard', false);
    const items = screen.getAllByLabelText('nav.dashboard');
    expect(items.length).toBe(2);
    expect(
      items.every((el) => el.getAttribute('data-sidebar-item') === 'true'),
    ).toBe(true);
    expect(items.every((el) => el.getAttribute('data-active') === 'true')).toBe(
      true,
    );
    expect(items.some((el) => el.className.includes('justify-center'))).toBe(
      true,
    );
    expect(
      items.some(
        (el) =>
          el.className.includes('h-11') &&
          !el.className.includes('justify-center'),
      ),
    ).toBe(true);
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
