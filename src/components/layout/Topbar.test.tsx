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
  useCan: (capability: string) =>
    capability === 'viewAllBranches' && state.user.role === 'owner',
}));

vi.mock('@/services/branchService', () => ({
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
