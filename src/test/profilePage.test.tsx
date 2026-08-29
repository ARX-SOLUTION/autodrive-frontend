import { screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import ProfilePage from '@/pages/ProfilePage';
import { useAuthStore } from '@/store/authStore';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

vi.mock('@/store/authStore', () => ({ useAuthStore: vi.fn() }));
vi.mock('@/services/authService', () => ({
  useChangePassword: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));
vi.mock('@/services/userService', () => ({
  useUpdateUser: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));
vi.mock('@/services/telegramService', () => ({
  useTelegramLinkStatus: () => ({ data: undefined, refetch: vi.fn() }),
  useTelegramLinkToken: () => ({ mutate: vi.fn(), isPending: false }),
  useTelegramUnlink: () => ({ mutate: vi.fn(), isPending: false }),
  useTelegramDailyReport: () => ({ mutate: vi.fn(), isPending: false }),
}));

async function renderAsRole(role: string) {
  (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        user: { role, name: 'Test User', branch_name: 'B1' },
        setUser: vi.fn(),
      }),
  );
  return renderWithRouter(<ProfilePage />, {
    initialEntry: '/profile',
    routePattern: '/profile',
  });
}

// autodrive-cwe: the role badge must come from i18n (setup.ts mocks t() to echo
// the key), never the old hardcoded Uzbek strings that mislabeled every
// non-owner role as "Filial menejeri".
describe('ProfilePage role badge', () => {
  it('renders the i18n key for a non-owner role instead of hardcoded Uzbek', async () => {
    await renderAsRole('teacher');
    expect(screen.getByText('roles.teacher')).toBeInTheDocument();
    expect(screen.queryByText('Filial menejeri')).toBeNull();
  });

  it('renders the owner role via i18n as well', async () => {
    await renderAsRole('owner');
    expect(screen.getByText('roles.owner')).toBeInTheDocument();
    expect(screen.queryByText('Biznes egasi')).toBeNull();
  });
});
