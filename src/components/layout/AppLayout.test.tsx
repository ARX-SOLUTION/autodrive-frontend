import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  localStorage.clear();
  cleanup();
});

const Page = ({ label }: { label: string }) => <Link to="/other">{label}</Link>;

describe('AppLayout mobile sidebar auto-close on navigation', () => {
  it('closes the mobile sidebar drawer when the route changes', () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/home" element={<Page label="go" />} />
            <Route path="/other" element={<Page label="here" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('open-menu'));
    expect(screen.getByTestId('mobile-open').textContent).toBe('true');

    fireEvent.click(screen.getByText('go'));
    expect(screen.getByTestId('mobile-open').textContent).toBe('false');
  });

  it('reclaims desktop content width and persists the collapsed preference', () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/home" element={<Page label="go" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const contentShell = screen.getByRole('main').parentElement!;
    expect(screen.getByTestId('desktop-expanded')).toHaveTextContent('true');
    expect(contentShell.className).toContain('lg:ml-64');

    fireEvent.click(screen.getByText('toggle-desktop'));

    expect(screen.getByTestId('desktop-expanded')).toHaveTextContent('false');
    expect(contentShell.className).toContain('lg:ml-[72px]');
    expect(localStorage.getItem('autodrive-sidebar-expanded')).toBe('false');
  });

  it('restores the persisted desktop preference during initial render', () => {
    localStorage.setItem('autodrive-sidebar-expanded', 'false');

    render(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/home" element={<Page label="go" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('desktop-expanded')).toHaveTextContent('false');
    expect(screen.getByRole('main').parentElement!.className).toContain(
      'lg:ml-[72px]',
    );
  });
});
