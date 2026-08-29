import {
  screen,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import UsersPage from '@/pages/UsersPage';
import type { User, UserRole } from '@/types/user';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// autodrive-cg9: owner-only "show deleted" toggle + restore on UsersPage
// (managers). Role-parameterized authStore mock (real permissions matrix),
// mirrors src/test/sidebarTeacherNav.test.tsx.

let role: UserRole = 'owner';

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role, branch_id: null } }),
}));

const LIVE_USER: User = {
  id: 'u-live',
  name: 'Nigora Karimova',
  email: 'nigora@example.com',
  role: 'manager',
  branch_id: 'b1',
  branch_name: 'Yunusobod',
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
};

const DELETED_USER: User = {
  ...LIVE_USER,
  id: 'u-deleted',
  name: 'Shoxrux Tosh',
  email: 'shoxrux@example.com',
  deleted_at: '2026-07-10T00:00:00.000Z',
};

const h = vi.hoisted(() => ({
  useUsersPage: vi.fn(),
  restoreMutate: vi.fn(),
}));

vi.mock('@/services/userService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/userService')>();
  return {
    ...actual,
    useUsersPage: h.useUsersPage,
    useCreateManager: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdateUser: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteUser: () => ({ mutate: vi.fn(), isPending: false }),
    useRestoreUser: () => ({ mutate: h.restoreMutate, isPending: false }),
  };
});

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({ data: [{ id: 'b1', name: 'Yunusobod' }] }),
}));

const renderPage = () => renderWithRouter(<UsersPage />);

const emptyResult = {
  data: {
    data: [] as User[],
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
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
};

afterEach(() => {
  role = 'owner';
  h.useUsersPage.mockReset();
  h.restoreMutate.mockReset();
  cleanup();
});

describe('UsersPage "show deleted" toggle visibility (autodrive-cg9)', () => {
  it('is absent for a manager', async () => {
    role = 'manager';
    h.useUsersPage.mockReturnValue(emptyResult);
    await renderPage();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('is absent for an operator', async () => {
    role = 'operator';
    h.useUsersPage.mockReturnValue(emptyResult);
    await renderPage();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('is present for an owner', async () => {
    role = 'owner';
    h.useUsersPage.mockReturnValue(emptyResult);
    await renderPage();
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });
});

describe('UsersPage "show deleted" toggle wiring (autodrive-cg9)', () => {
  it('flips includeDeleted through to useUsersPage when switched on', async () => {
    role = 'owner';
    h.useUsersPage.mockReturnValue(emptyResult);
    await renderPage();

    fireEvent.click(screen.getByRole('switch'));

    const lastCall =
      h.useUsersPage.mock.calls[h.useUsersPage.mock.calls.length - 1];
    // (role, page, limit, filters) -- filters is the 4th positional arg.
    expect(lastCall[3]).toMatchObject({ includeDeleted: true });
  });
});

describe('UsersPage deleted-row rendering (autodrive-cg9)', () => {
  it('shows the deleted badge and restore action only on the deleted row', async () => {
    role = 'owner';
    h.useUsersPage.mockReturnValue({
      ...emptyResult,
      data: { ...emptyResult.data, data: [LIVE_USER, DELETED_USER] },
    });
    await renderPage();

    expect(screen.getAllByText('common.deleted')).toHaveLength(2);
    expect(screen.getAllByLabelText('common.restore')).toHaveLength(2);
    expect(screen.getAllByLabelText('common.edit').length).toBeGreaterThan(0);
  });

  it('hides the restore action for a non-owner even if a deleted row is present', async () => {
    role = 'manager';
    h.useUsersPage.mockReturnValue({
      ...emptyResult,
      data: { ...emptyResult.data, data: [DELETED_USER] },
    });
    await renderPage();

    expect(screen.queryByLabelText('common.restore')).toBeNull();
  });
});

describe('UsersPage restore action (autodrive-cg9)', () => {
  it('fires the restore mutation with the row id after confirming', async () => {
    role = 'owner';
    h.useUsersPage.mockReturnValue({
      ...emptyResult,
      data: { ...emptyResult.data, data: [DELETED_USER] },
    });
    await renderPage();

    fireEvent.click(screen.getAllByLabelText('common.restore')[0]);
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText('common.confirm_restore_desc'),
    ).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole('button', { name: 'common.restore' }),
    );

    await waitFor(() =>
      expect(h.restoreMutate).toHaveBeenCalledWith(
        'u-deleted',
        expect.anything(),
      ),
    );
  });
});

// autodrive-52v.3: deleting the last row of the last page left currentPage
// pointing past the new (shrunk) totalPages -- the page silently kept
// requesting a page that no longer exists. Same clamp GroupsPage already
// had; StudentsPage, PaymentsPage and UsersPage didn't.
describe('UsersPage pagination clamp (autodrive-52v.3)', () => {
  it('clamps currentPage back to 1 once totalPages shrinks below the URL page', async () => {
    role = 'owner';
    // emptyResult.data.meta.totalPages is already 1 -- URL page=3 below is
    // the "shrunk after delete" case this clamp exists for.
    h.useUsersPage.mockReturnValue(emptyResult);
    await renderWithRouter(<UsersPage />, {
      initialEntry: '/users?page=3',
      routePattern: '/users',
    });

    await waitFor(() => {
      const lastCall = h.useUsersPage.mock.calls.at(-1)!;
      expect(lastCall[1]).toBe(1); // page (2nd positional arg), clamped from 3
    });
  });
});
