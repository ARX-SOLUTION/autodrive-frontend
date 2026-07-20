import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, afterEach } from 'vitest';
import UsersPage from '@/pages/UsersPage';

// Regression (autodrive-6cq.11.1): Cancel used to close the create-manager
// modal even while createMut was still in flight, because useConfirmedClose
// was only guarded by form dirtiness, not the pending mutation. Clicking
// Cancel while saving must surface the discard-changes confirm step instead
// of silently closing.

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'owner', branch_id: null } }),
}));

vi.mock('@/services/userService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/userService')>();
  return {
    ...actual,
    useUsersPage: () => ({
      data: {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 100,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
      isLoading: false,
    }),
    useCreateManager: () => ({ mutate: vi.fn(), isPending: true }),
    useUpdateUser: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteUser: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({
    data: [{ id: 'b1', name: 'Branch 1' }],
    isLoading: false,
  }),
}));

afterEach(cleanup);

describe('UsersPage cancel guard while saving', () => {
  it('does not close the create modal when Cancel is clicked mid-save', () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('users.add'));
    expect(screen.getByText('users.add_title')).toBeInTheDocument();

    fireEvent.click(screen.getByText('common.cancel'));

    // Still open, with a discard-changes confirm step surfaced instead of
    // an immediate close -- the create mutation is pending.
    expect(screen.getByText('users.add_title')).toBeInTheDocument();
    expect(
      screen.getByText('common.discard_changes_title'),
    ).toBeInTheDocument();
  });
});
