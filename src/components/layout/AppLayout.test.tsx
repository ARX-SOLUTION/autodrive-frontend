import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppLayout } from './AppLayout';

// react-hooks/set-state-in-effect fix: setMobileSidebarOpen(false) moved
// from the route-change effect to a render-phase reset. Locks down that
// opening the mobile drawer then navigating still closes it.

vi.mock('./Sidebar', () => ({
  Sidebar: ({ mobileOpen }: { mobileOpen: boolean }) => (
    <div data-testid="mobile-open">{String(mobileOpen)}</div>
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
vi.mock('@/lib/routePrefetch', () => ({ prefetchIdle: vi.fn() }));

afterEach(cleanup);

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
});
