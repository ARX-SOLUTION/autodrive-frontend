import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { Sidebar } from '@/components/layout/Sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// The desktop sidebar is a stable, full-label navigation surface. The active
// marker must live in a reserved gutter so moving between routes never changes
// the item's size or pushes its label horizontally.

let canGate = true;

vi.mock('@/hooks/useCan', () => ({ useCan: () => canGate }));
vi.mock('@/features/auth/api/authService', () => ({
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

  it('shows fleet, enrollment, and driving session pages', async () => {
    await renderSidebar();
    expect(screen.getByLabelText('nav.vehicles')).toBeTruthy();
    expect(screen.getByLabelText('nav.fleet_map')).toBeTruthy();
    expect(screen.getByLabelText('nav.training_programs')).toBeTruthy();
    expect(screen.getByLabelText('nav.training_enrollments')).toBeTruthy();
    expect(screen.getByLabelText('nav.driving_sessions')).toBeTruthy();
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

  it('collapsed desktop: groups open a flyout menu that navigates and closes', async () => {
    const { router } = await renderSidebar(false, '/groups', false);

    const learning = screen.getByRole('button', {
      name: 'nav_sections.learning',
    });
    expect(learning.getAttribute('data-active')).toBe('true');
    const team = screen.getByRole('button', { name: 'nav_sections.team' });
    expect(team.getAttribute('data-active')).toBe('false');
    expect(screen.queryByLabelText('nav.branches')).toBeNull();

    fireEvent.click(team);
    const flyout = await screen.findByRole('dialog', {
      name: 'nav_sections.team',
    });
    const branches = within(flyout).getByLabelText('nav.branches');

    fireEvent.click(branches);
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/branches'),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('collapsed desktop: workspace pages stay directly visible in the rail', async () => {
    await renderSidebar(false, '/groups', false);

    expect(
      screen.queryByRole('button', { name: 'nav_sections.workspace' }),
    ).toBeNull();
    const dashboard = screen.getByLabelText('nav.dashboard');
    expect(dashboard.className).toContain('flex-col');
    expect(screen.getByText('nav.dashboard').className).not.toContain(
      'sr-only',
    );
  });

  it('collapsed desktop: hover opens the flyout after a delay without stealing focus', async () => {
    await renderSidebar(false, '/groups', false);
    const team = screen.getByRole('button', { name: 'nav_sections.team' });

    fireEvent.pointerEnter(team, { pointerType: 'mouse' });
    expect(screen.queryByRole('dialog')).toBeNull();
    const flyout = await screen.findByRole('dialog', {
      name: 'nav_sections.team',
    });
    expect(flyout.contains(document.activeElement)).toBe(false);

    fireEvent.pointerLeave(team, { pointerType: 'mouse' });
    fireEvent.pointerEnter(flyout, { pointerType: 'mouse' });
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(screen.getByRole('dialog')).toBeTruthy();

    fireEvent.pointerLeave(flyout, { pointerType: 'mouse' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('collapsed desktop: clicking a hover-opened flyout pins it open', async () => {
    await renderSidebar(false, '/groups', false);
    const team = screen.getByRole('button', { name: 'nav_sections.team' });

    fireEvent.pointerEnter(team, { pointerType: 'mouse' });
    await screen.findByRole('dialog', { name: 'nav_sections.team' });
    fireEvent.click(team);
    fireEvent.pointerLeave(team, { pointerType: 'mouse' });
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(screen.getByRole('dialog')).toBeTruthy();

    fireEvent.click(team);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('collapsed desktop: a single-item group stays a direct labeled link', async () => {
    canGate = false;
    const { router } = await renderSidebar(false, '/groups', false);

    const profile = screen.getByLabelText('nav.profile');
    expect(profile.className).toContain('flex-col');
    expect(screen.getByText('nav.profile').className).not.toContain('sr-only');

    fireEvent.click(profile);
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/profile'),
    );
  });

  it('expanded desktop: groups collapse, remember state, and keep the active group open', async () => {
    await renderSidebar(false, '/groups');

    expect(
      screen.queryByRole('button', { name: 'nav_sections.workspace' }),
    ).toBeNull();
    expect(screen.getByText('nav_sections.workspace')).toBeTruthy();
    const learning = screen.getByRole('button', {
      name: 'nav_sections.learning',
    });
    const team = screen.getByRole('button', { name: 'nav_sections.team' });
    expect(learning).toHaveAttribute('aria-expanded', 'true');
    expect(team).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('desktop-nav-section-team')).toHaveAttribute(
      'inert',
    );

    fireEvent.click(team);
    expect(team).toHaveAttribute('aria-expanded', 'true');
    expect(
      document.getElementById('desktop-nav-section-team'),
    ).not.toHaveAttribute('inert');

    fireEvent.click(learning);
    expect(learning).toHaveAttribute('aria-expanded', 'false');
    expect(
      JSON.parse(
        localStorage.getItem('autodrive-sidebar-sections:default:user-1') ??
          '[]',
      ),
    ).toEqual(['team']);
  });

  it('expanded desktop: navigating into a collapsed group re-opens it', async () => {
    const { router } = await renderWithRouter(
      <TooltipProvider>
        <Sidebar
          mobileOpen={false}
          onMobileOpenChange={vi.fn()}
          desktopExpanded
          onDesktopExpandedChange={vi.fn()}
        />
      </TooltipProvider>,
      { initialEntry: '/dashboard', routePattern: '/$' },
    );

    const team = screen.getByRole('button', { name: 'nav_sections.team' });
    expect(team).toHaveAttribute('aria-expanded', 'false');

    await router.navigate({ to: '/branches' });
    await waitFor(() => expect(team).toHaveAttribute('aria-expanded', 'true'));
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
    expect(items.some((el) => el.className.includes('flex-col'))).toBe(true);
    expect(
      items.some(
        (el) =>
          el.className.includes('h-11') && !el.className.includes('flex-col'),
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

  it('keeps the parent Expenses menu active on a direct detail route', async () => {
    await renderSidebar(false, '/expenses/expense-1');
    expect(
      screen.getByLabelText('nav.expenses').getAttribute('data-active'),
    ).toBe('true');
  });
});
