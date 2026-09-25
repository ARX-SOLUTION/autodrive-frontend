import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/utils/renderWithRouter';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from './AppLayout';

// react-hooks/set-state-in-effect fix: setMobileSidebarOpen(false) moved
// from the route-change effect to a render-phase reset. Locks down that
// opening the mobile drawer then navigating still closes it.

vi.mock('./Sidebar', () => ({
  Sidebar: ({
    mobileOpen,
    desktopExpanded,
    onDesktopExpandedChange,
  }: {
    mobileOpen: boolean;
    desktopExpanded: boolean;
    onDesktopExpandedChange: (expanded: boolean) => void;
  }) => (
    <div>
      <div data-testid="mobile-open">{String(mobileOpen)}</div>
      <div data-testid="desktop-expanded">{String(desktopExpanded)}</div>
      <button
        onClick={() => onDesktopExpandedChange(!desktopExpanded)}
        type="button"
      >
        toggle-desktop
      </button>
    </div>
  ),
}));
vi.mock('./Topbar', () => ({
  Topbar: ({ onMobileMenuClick }: { onMobileMenuClick: () => void }) => (
    <button onClick={onMobileMenuClick}>open-menu</button>
  ),
}));
vi.mock('./Breadcrumbs', () => ({ Breadcrumbs: () => null }));
vi.mock('./CommandPalette', () => ({
  CommandPalette: () => null,
  useCommandPalette: () => ({ open: false, setOpen: vi.fn() }),
}));
vi.mock('./PageLoader', () => ({ PageLoader: () => null }));

afterEach(() => {
  useAuthStore.setState({
    token: null,
    user: null,
    isAuthenticated: false,
    hasHydrated: true,
  });
  localStorage.clear();
  cleanup();
});

describe('AppLayout mobile sidebar auto-close on navigation', () => {
  it('closes the mobile sidebar drawer when the route changes', async () => {
    const { router } = await renderWithRouter(<AppLayout />, {
      initialEntry: '/home',
      routePattern: '/$',
    });

    fireEvent.click(screen.getByText('open-menu'));
    expect(screen.getByTestId('mobile-open').textContent).toBe('true');

    await act(() => router.navigate({ to: '/other' as never }));
    expect(screen.getByTestId('mobile-open').textContent).toBe('false');
  });

  it('reclaims desktop content width and persists the collapsed preference', async () => {
    await renderWithRouter(<AppLayout />, {
      initialEntry: '/home',
      routePattern: '/home',
    });

    const contentShell = screen.getByRole('main').parentElement!;
    expect(screen.getByTestId('desktop-expanded')).toHaveTextContent('true');
    expect(contentShell.className).toContain('lg:ml-64');
    expect(contentShell.className).not.toContain('transition-[margin-left]');

    fireEvent.click(screen.getByText('toggle-desktop'));

    expect(screen.getByTestId('desktop-expanded')).toHaveTextContent('false');
    expect(contentShell.className).toContain('lg:ml-[72px]');
    expect(localStorage.getItem('autodrive-sidebar-expanded')).toBe('false');
  });

  it('restores the persisted desktop preference during initial render', async () => {
    localStorage.setItem('autodrive-sidebar-expanded', 'false');

    await renderWithRouter(<AppLayout />, {
      initialEntry: '/home',
      routePattern: '/home',
    });

    expect(screen.getByTestId('desktop-expanded')).toHaveTextContent('false');
    expect(screen.getByRole('main').parentElement!.className).toContain(
      'lg:ml-[72px]',
    );
  });
});

describe('AppLayout demo company banner', () => {
  it('shows the reset notice for a demo company slug', async () => {
    useAuthStore.setState({
      user: {
        id: 'manager-1',
        email: 'manager@example.com',
        role: 'manager',
        company_slug: 'automaktab-demo-2026',
      },
      isAuthenticated: true,
      hasHydrated: true,
    });

    await renderWithRouter(<AppLayout />, {
      initialEntry: '/home',
      routePattern: '/home',
    });

    expect(screen.getByRole('status')).toHaveTextContent('common.demo_banner');
  });

  it('shows the reset notice for the demo login email', async () => {
    useAuthStore.setState({
      user: {
        id: 'demo-owner',
        email: 'demo@automaktab.uz',
        role: 'owner',
      },
      isAuthenticated: true,
      hasHydrated: true,
    });

    await renderWithRouter(<AppLayout />, {
      initialEntry: '/home',
      routePattern: '/home',
    });

    expect(screen.getByRole('status')).toHaveTextContent('common.demo_banner');
  });

  it('hides the reset notice for another company', async () => {
    useAuthStore.setState({
      user: {
        id: 'owner-1',
        email: 'owner@school.uz',
        role: 'owner',
        company_slug: 'another-school',
      },
      isAuthenticated: true,
      hasHydrated: true,
    });

    await renderWithRouter(<AppLayout />, {
      initialEntry: '/home',
      routePattern: '/home',
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
