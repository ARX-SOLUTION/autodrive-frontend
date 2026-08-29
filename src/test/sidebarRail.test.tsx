import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { Sidebar } from '@/components/layout/Sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

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
  cleanup();
});

const renderSidebar = (
  mobileOpen = false,
  path = '/dashboard',
  desktopExpanded = true,
  onDesktopExpandedChange = vi.fn(),
) =>
  renderWithRouter(
    <TooltipProvider>
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileOpenChange={vi.fn()}
        desktopExpanded={desktopExpanded}
        onDesktopExpandedChange={onDesktopExpandedChange}
      />
    </TooltipProvider>,
    { initialEntry: path, routePattern: path },
  );

describe('Sidebar navigation', () => {
  it('renders full labels on desktop instead of relying on hover tooltips', async () => {
    await renderSidebar();
    expect(screen.getByLabelText('nav.dashboard')).toBeTruthy();
    expect(screen.getByText('nav.dashboard')).toBeTruthy();
  });

  it('exposes a 40px desktop toggle with its expanded state', async () => {
    const onDesktopExpandedChange = vi.fn();
    await renderSidebar(false, '/dashboard', true, onDesktopExpandedChange);

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

  it('keeps collapsed desktop links labeled, recognizable, and navigable', async () => {
    const { router } = await renderSidebar(false, '/groups', false);

    const dashboard = screen.getByLabelText('nav.dashboard');
    expect(dashboard.className).toContain('justify-center');
    expect(dashboard.querySelector('svg')).not.toBeNull();
    expect(screen.getByText('nav.dashboard').className).toContain('sr-only');

    fireEvent.focus(dashboard);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'nav.dashboard',
    );

    fireEvent.click(dashboard);
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/dashboard'),
    );
  });

  it('keeps pinned navigation present when the desktop sidebar collapses', async () => {
    const { rerender } = await renderSidebar();
    fireEvent.click(screen.getAllByLabelText('actions.pin')[0]!);

    rerender(
      <TooltipProvider>
        <Sidebar
          mobileOpen={false}
          onMobileOpenChange={vi.fn()}
          desktopExpanded={false}
          onDesktopExpandedChange={vi.fn()}
        />
      </TooltipProvider>,
    );

    expect(screen.getAllByLabelText('nav.dashboard')).toHaveLength(2);
    expect(screen.getByLabelText('nav_sections.pinned')).toBeTruthy();
  });

  it('hides a capability-gated item when the capability check fails', async () => {
    canGate = false;
    await renderSidebar();
    expect(screen.queryByLabelText('nav.branches')).toBeNull();
  });

  it('reserves a stable selection gutter for the active route', async () => {
    await renderSidebar();
    const dashboard = screen.getByLabelText('nav.dashboard');
    expect(dashboard.getAttribute('data-sidebar-item')).toBe('true');
    expect(dashboard.className).toContain('h-10');
    expect(dashboard.className).toContain('pl-4');
    expect(dashboard.className).toContain('before:absolute');
    expect(dashboard.getAttribute('data-active')).toBe('true');
  });

  it('mobile sheet: stays a full-label drawer when desktop is collapsed', async () => {
    await renderSidebar(true, '/dashboard', false);
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

  it('keeps the parent menu active on nested detail routes', async () => {
    await renderSidebar(false, '/groups/group-42');
    expect(
      screen.getByLabelText('nav.groups').getAttribute('data-active'),
    ).toBe('true');
    expect(
      screen.getByLabelText('nav.dashboard').getAttribute('data-active'),
    ).toBe('false');
  });
});
