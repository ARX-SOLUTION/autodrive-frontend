import { screen, fireEvent, cleanup, within } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import TeachersPage from '@/pages/TeachersPage';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// Regression: a branch manager could not add a teacher because the create
// form showed a branch <Select> whose options come from GET /branches --
// an owner/dev-only endpoint -- so for a manager it rendered empty and
// un-fillable. The branch a manager's teacher belongs to is fixed by the
// JWT (backend assertBranchScope auto-assigns it), so the picker must only
// appear for cross-branch roles (owner/dev). (autodrive-6ef.5)

const auth = vi.hoisted(() => ({ role: 'manager' as string }));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: auth.role, branch_id: 'b1' } }),
}));

vi.mock('@/services/teacherService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/teacherService')>();
  const noopMut = () => ({ mutate: vi.fn(), isPending: false });
  return {
    ...actual,
    useTeachersPage: () => ({
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
      isError: false,
      refetch: vi.fn(),
    }),
    useCreateTeacher: noopMut,
    useUpdateTeacher: noopMut,
    useDeleteTeacher: noopMut,
  };
});

vi.mock('@/services/branchService', () => ({
  // Non-empty on purpose: proves the manager gate is what hides the select,
  // not merely an empty branches list.
  useBranches: () => ({
    data: [{ id: 'b1', name: 'Yunusobod filiali' }],
    isLoading: false,
  }),
}));

async function openCreateForm() {
  await renderWithRouter(<TeachersPage />, {
    initialEntry: '/oqituvchilar',
    routePattern: '/oqituvchilar',
  });
  // Before opening the modal there is exactly one "teachers.add" (the button).
  fireEvent.click(screen.getByText('teachers.add'));
}

afterEach(cleanup);

describe('TeachersPage branch selector gating', () => {
  // Scope to the create dialog: the list table also has a "teachers.branch"
  // column header, which is unrelated to the form gate.
  it('hides the branch selector for a branch-scoped manager', async () => {
    auth.role = 'manager';
    await openCreateForm();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByText('teachers.branch')).toBeNull();
  });

  it('shows the branch selector for an owner', async () => {
    auth.role = 'owner';
    await openCreateForm();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('teachers.branch')).toBeTruthy();
  });
});
