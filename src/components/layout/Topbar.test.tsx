import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/utils/renderWithRouter';
import { Topbar } from './Topbar';

const state = vi.hoisted(() => ({
  user: {
    name: 'Demo Owner',
    role: 'owner',
    branch_id: undefined as string | undefined,
    branch_name: undefined as string | undefined,
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (value: typeof state) => unknown) => selector(state),
}));

vi.mock('@/hooks/useCan', () => ({
  useCan: (capability: string) => {
    if (capability === 'accessOperations') {
      return state.user.role !== 'accountant';
    }
    if (capability === 'recordPayment') {
      return ['dev', 'owner', 'manager', 'operator'].includes(state.user.role);
    }
    return capability === 'viewAllBranches' && state.user.role === 'owner';
  },
}));

vi.mock('@/features/branches/api/branchService', () => ({
  useBranches: (enabled: boolean) => ({
    data: enabled
      ? [
          { id: 'branch-1', name: 'Toshkent Markaziy' },
          { id: 'branch-2', name: 'Samarqand Registon' },
        ]
      : [],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggle: vi.fn() }),
}));

vi.mock('@/i18n', () => ({
  changeAppLanguage: vi.fn(),
  SUPPORTED_LANGS: ['uz', 'ru', 'en'],
}));

afterEach(() => {
  state.user = {
    name: 'Demo Owner',
    role: 'owner',
    branch_id: undefined,
    branch_name: undefined,
  };
  cleanup();
  vi.clearAllMocks();
});

describe('Topbar dashboard branch scope', () => {
  it('keeps the selected owner branch in the dashboard URL', async () => {
    const { router } = await renderWithRouter(
      <Topbar onMobileMenuClick={vi.fn()} onCommandPaletteOpen={vi.fn()} />,
      {
        initialEntry: '/dashboard?branch_id=branch-2',
        routePattern: '/dashboard',
      },
    );

    const trigger = screen.getByRole('button', {
      name: 'dashboard.v2.branch',
    });
    expect(trigger).toHaveTextContent('Samarqand Registon');
    expect(trigger).toHaveClass('cursor-pointer');
    expect(
      within(trigger).getByText('dashboard.v2.branch'),
    ).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.pointerDown(trigger, { button: 0 });
    fireEvent.click(
      await screen.findByRole('menuitemradio', { name: 'Toshkent Markaziy' }),
    );

    await waitFor(() =>
      expect(
        new URLSearchParams(router.state.location.searchStr).get('branch_id'),
      ).toBe('branch-1'),
    );
  });

  it('does not expose cross-branch selection to a branch-scoped role', async () => {
    state.user = {
      name: 'Demo Manager',
      role: 'manager',
      branch_id: 'branch-1',
      branch_name: 'Toshkent Markaziy',
    };

    await renderWithRouter(
      <Topbar onMobileMenuClick={vi.fn()} onCommandPaletteOpen={vi.fn()} />,
      {
        initialEntry: '/dashboard?branch_id=branch-2',
        routePattern: '/dashboard',
      },
    );

    expect(
      screen.queryByRole('button', { name: 'dashboard.v2.branch' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Toshkent Markaziy')).toBeInTheDocument();
  });
});

describe('Topbar global search access', () => {
  it('does not expose the search entry to an accountant', async () => {
    state.user = {
      name: 'Demo Accountant',
      role: 'accountant',
      branch_id: undefined,
      branch_name: undefined,
    };

    await renderWithRouter(
      <Topbar onMobileMenuClick={vi.fn()} onCommandPaletteOpen={vi.fn()} />,
      {
        initialEntry: '/profile',
        routePattern: '/profile',
      },
    );

    expect(
      screen.queryByRole('button', { name: 'actions.search_hint' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the search entry working for an owner', async () => {
    const onCommandPaletteOpen = vi.fn();

    await renderWithRouter(
      <Topbar
        onMobileMenuClick={vi.fn()}
        onCommandPaletteOpen={onCommandPaletteOpen}
      />,
      {
        initialEntry: '/dashboard',
        routePattern: '/dashboard',
      },
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'actions.search_hint' }),
    );
    expect(onCommandPaletteOpen).toHaveBeenCalledOnce();
  });
});

describe('Topbar quick payment', () => {
  it('opens the create-payment route with the selected branch', async () => {
    const { router } = await renderWithRouter(
      <Topbar onMobileMenuClick={vi.fn()} onCommandPaletteOpen={vi.fn()} />,
      {
        initialEntry: '/dashboard?branch_id=branch-2',
        routePattern: '/$',
      },
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'actions.quick_payment' }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/payments');
      const search = new URLSearchParams(router.state.location.searchStr);
      expect(search.get('action')).toBe('create');
      expect(search.get('branch_id')).toBe('branch-2');
    });
  });

  it('does not forward a cross-branch filter for a branch-scoped role', async () => {
    state.user = {
      name: 'Demo Manager',
      role: 'manager',
      branch_id: 'branch-1',
      branch_name: 'Toshkent Markaziy',
    };
    const { router } = await renderWithRouter(
      <Topbar onMobileMenuClick={vi.fn()} onCommandPaletteOpen={vi.fn()} />,
      { initialEntry: '/dashboard?branch_id=branch-2', routePattern: '/$' },
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'actions.quick_payment' }),
    );
    await waitFor(() => {
      const search = new URLSearchParams(router.state.location.searchStr);
      expect(search.get('action')).toBe('create');
      expect(search.has('branch_id')).toBe(false);
    });
  });

  it.each(['teacher', 'accountant'])(
    'hides quick payment from %s',
    async (role) => {
      state.user.role = role;
      await renderWithRouter(
        <Topbar onMobileMenuClick={vi.fn()} onCommandPaletteOpen={vi.fn()} />,
        { initialEntry: '/profile', routePattern: '/profile' },
      );
      expect(
        screen.queryByRole('button', { name: 'actions.quick_payment' }),
      ).toBeNull();
    },
  );
});
