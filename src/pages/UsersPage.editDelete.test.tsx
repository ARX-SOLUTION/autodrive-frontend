import {
  screen,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import UsersPage from '@/pages/UsersPage';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// autodrive-rz3.3: UsersPage only ever rendered PersonModal in create mode --
// no edit/delete affordance existed even though useUpdateUser and
// DELETE /users/:id were both already wired. This mirrors OperatorsPage's
// edit/delete pattern (same PersonModal, same ConfirmDialog, same row
// buttons) onto the manager entity.

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'owner', branch_id: null } }),
}));

const h = vi.hoisted(() => ({
  updateMutate: vi.fn(),
  lifecycleMutate: vi.fn(),
}));

const MANAGER = {
  id: 'u1',
  name: 'Nigora Karimova',
  email: 'nigora@example.com',
  phone: '+998901234567',
  branch_id: 'b1',
  branch_name: 'Yunusobod',
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  role: 'manager' as const,
};

vi.mock('@/services/userService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/userService')>();
  return {
    ...actual,
    useUsersPage: () => ({
      data: {
        data: [MANAGER],
        meta: {
          total: 1,
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
    }),
    useCreateCompanyUser: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdateUser: () => ({ mutate: h.updateMutate, isPending: false }),
    useChangeUserLifecycle: () => ({
      mutate: h.lifecycleMutate,
      isPending: false,
    }),
    useRestoreUser: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({
    data: [{ id: 'b1', name: 'Yunusobod' }],
    isLoading: false,
  }),
}));

const renderPage = () => renderWithRouter(<UsersPage />);

afterEach(() => {
  cleanup();
  h.updateMutate.mockClear();
  h.lifecycleMutate.mockClear();
});

describe('UsersPage edit', () => {
  it('opens the modal prefilled with the row values', async () => {
    await renderPage();

    fireEvent.click(screen.getAllByLabelText('common.edit')[0]);

    expect(screen.getByText('users.edit')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByDisplayValue('Nigora Karimova')).toBeInTheDocument(),
    );
  });

  it('sends the expected update payload on save', async () => {
    await renderPage();

    fireEvent.click(screen.getAllByLabelText('common.edit')[0]);
    await waitFor(() =>
      expect(screen.getByDisplayValue('Nigora Karimova')).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByDisplayValue('Nigora Karimova'), {
      target: { value: 'Nigora Yusupova' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    await waitFor(() => expect(h.updateMutate).toHaveBeenCalledTimes(1));
    expect(h.updateMutate.mock.calls[0][0]).toMatchObject({
      id: 'u1',
      fullName: 'Nigora Yusupova',
    });
  });
});

describe('UsersPage delete', () => {
  it('triggers the delete mutation after confirmation', async () => {
    await renderPage();

    fireEvent.click(screen.getAllByLabelText('common.delete')[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'common.delete' }),
    );

    await waitFor(() =>
      expect(h.lifecycleMutate).toHaveBeenCalledWith('u1', expect.anything()),
    );
  });
});
