import { screen, fireEvent, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import UsersPage from '@/pages/UsersPage';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// Regression: a failed fetch (isError) used to fall through to the same
// 'no users found' empty state as a genuinely empty result, since the page
// never destructured isError from useUsersPage.

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'owner', branch_id: null } }),
}));

const refetch = vi.fn();

vi.mock('@/services/userService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/userService')>();
  return {
    ...actual,
    useUsersPage: () => ({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch,
    }),
    useCreateCompanyUser: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdateUser: () => ({ mutate: vi.fn(), isPending: false }),
    useChangeUserLifecycle: () => ({ mutate: vi.fn(), isPending: false }),
    useRestoreUser: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({
    data: [{ id: 'b1', name: 'Branch 1' }],
    isLoading: false,
  }),
}));

afterEach(cleanup);

describe('UsersPage fetch error state', () => {
  it('renders a distinct error state (not the empty state) with a working retry button', async () => {
    await renderWithRouter(<UsersPage />);

    expect(screen.getAllByText('common.error').length).toBeGreaterThan(0);
    expect(screen.queryByText('users.not_found')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByText('common.retry')[0]);
    expect(refetch).toHaveBeenCalled();
  });
});
