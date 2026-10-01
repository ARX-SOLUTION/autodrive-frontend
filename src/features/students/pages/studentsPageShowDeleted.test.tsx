import {
  screen,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import StudentsPage from '@/features/students/pages/StudentsPage';
import type { Student } from '@/features/students/types';
import type { UserRole } from '@/features/staff/types';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// autodrive-cg9: owner-only "show deleted" toggle + restore on StudentsPage.
// Role-parameterized authStore mock (not a hardcoded useCan stub) so this
// exercises the REAL permissions matrix -- mirrors
// src/test/sidebarTeacherNav.test.tsx.

let role: UserRole = 'owner';

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role, branch_id: 'b1' } }),
}));

const LIVE_STUDENT: Student = {
  id: 's-live',
  last_name: 'Karimov',
  first_name: 'Aziz',
  phone: '+998901112233',
  course_type: 'tezkor',
  branch_id: 'b1',
  payment_method: null,
  has_document: false,
  result: 'oqimoqda',
  created_at: '2026-07-01T00:00:00.000Z',
};

const DELETED_STUDENT: Student = {
  ...LIVE_STUDENT,
  id: 's-deleted',
  last_name: 'Yusupov',
  first_name: 'Bek',
  deleted_at: '2026-07-10T00:00:00.000Z',
};

const h = vi.hoisted(() => ({
  useStudentsPage: vi.fn(),
  restoreMutate: vi.fn(),
}));

vi.mock('@/features/students/api/studentService', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@/features/students/api/studentService')
    >();
  return {
    ...actual,
    fetchAllStudents: vi.fn(),
    useStudentsPage: h.useStudentsPage,
    useCreateStudent: () => ({ mutate: vi.fn(), isPending: false }),
    useCreateStudentWithPayment: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdateStudent: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteStudent: () => ({ mutate: vi.fn(), isPending: false }),
    useRestoreStudent: () => ({
      mutate: h.restoreMutate,
      isPending: false,
    }),
  };
});

vi.mock('@/features/branches/api/branchService', () => ({
  useBranches: () => ({ data: [], isLoading: false }),
}));
vi.mock('@/features/staff/api/operatorService', () => ({
  useOperators: () => ({ data: [], isLoading: false }),
}));

// StudentModal/AddStudentDialog are always mounted (just closed) inside
// StudentsDialogs and call useGroups/useCourses themselves; stub them out
// entirely (mirrors src/test/studentsPageDetailedToggle.test.tsx) rather
// than chase every service they need -- this test only cares about the
// list/toggle/restore behavior, not the create/edit form.
vi.mock('@/features/students/api/StudentModal', () => ({
  default: () => null,
}));
vi.mock('@/features/students/components/AddStudentDialog', () => ({
  default: () => null,
}));

const renderPage = () =>
  renderWithRouter(<StudentsPage />, {
    initialEntry: '/students',
    routePattern: '/students',
  });

const openFiltersIfPanelExists = () => {
  const trigger = screen.queryAllByRole('button', {
    name: 'filters.open_filters',
  })[0];
  if (trigger) fireEvent.click(trigger);
};

const closeFiltersIfPanelOpen = () => {
  const close =
    screen.queryAllByRole('button', { name: 'common.close' }).at(0) ??
    screen.queryByRole('button', { name: 'filters.apply' });
  if (close) fireEvent.click(close);
};

const emptyResult = {
  data: { data: [], meta: { total: 0, totalPages: 4 } },
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
};

afterEach(() => {
  role = 'owner';
  h.useStudentsPage.mockReset();
  h.restoreMutate.mockReset();
  cleanup();
});

describe('StudentsPage "show deleted" toggle visibility (autodrive-cg9)', () => {
  it('is absent for a manager', async () => {
    role = 'manager';
    h.useStudentsPage.mockReturnValue(emptyResult);
    await renderPage();
    openFiltersIfPanelExists();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByText('common.show_deleted')).toBeNull();
  });

  it('is absent for an operator', async () => {
    role = 'operator';
    h.useStudentsPage.mockReturnValue(emptyResult);
    await renderPage();
    openFiltersIfPanelExists();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('is absent for a teacher', async () => {
    role = 'teacher';
    h.useStudentsPage.mockReturnValue(emptyResult);
    await renderPage();
    openFiltersIfPanelExists();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('is present for an owner', async () => {
    role = 'owner';
    h.useStudentsPage.mockReturnValue(emptyResult);
    await renderPage();
    openFiltersIfPanelExists();
    expect(screen.getAllByRole('switch')[0]).toBeInTheDocument();
  });

  it('is present for dev (owner is a strict subset of dev)', async () => {
    role = 'dev';
    h.useStudentsPage.mockReturnValue(emptyResult);
    await renderPage();
    openFiltersIfPanelExists();
    expect(screen.getAllByRole('switch')[0]).toBeInTheDocument();
  });
});

describe('StudentsPage "show deleted" toggle wiring (autodrive-cg9)', () => {
  it('flips includeDeleted through to useStudentsPage when switched on', async () => {
    role = 'owner';
    h.useStudentsPage.mockReturnValue(emptyResult);
    await renderPage();

    openFiltersIfPanelExists();
    fireEvent.click(screen.getAllByRole('switch')[0]);
    closeFiltersIfPanelOpen();

    const lastCall =
      h.useStudentsPage.mock.calls[h.useStudentsPage.mock.calls.length - 1];
    // Options object is the 6th positional arg (courseType, branchId, page,
    // limit, operatorId, options).
    expect(lastCall[5]).toMatchObject({ includeDeleted: true });
  });

  it('clears local includeDeleted with URL filters while preserving referral context and limit', async () => {
    role = 'owner';
    h.useStudentsPage.mockReturnValue(emptyResult);
    const { router } = await renderWithRouter(<StudentsPage />, {
      initialEntry:
        '/students?has_group=false&page=2&limit=25&referred_by_user_id=u7',
      routePattern: '/students',
    });

    openFiltersIfPanelExists();
    fireEvent.click(screen.getAllByRole('switch')[0]);
    closeFiltersIfPanelOpen();
    fireEvent.click(screen.getByRole('button', { name: 'common.next' }));
    fireEvent.click(
      screen.getAllByRole('button', { name: 'common.clear_all' }).at(-1)!,
    );

    await waitFor(() => {
      const lastCall = h.useStudentsPage.mock.calls.at(-1)!;
      expect(lastCall[2]).toBe(1);
      expect(lastCall[3]).toBe(25);
      expect(lastCall[5]).toMatchObject({
        includeDeleted: false,
        referredByUserId: 'u7',
      });
      expect(router.state.location.searchStr).toContain(
        'referred_by_user_id=u7',
      );
      expect(router.state.location.searchStr).toContain('limit=25');
      expect(router.state.location.searchStr).not.toContain('has_group=');
      expect(router.state.location.searchStr).not.toContain('page=');
    });
  });
});

describe('StudentsPage deleted-row rendering (autodrive-cg9)', () => {
  it('shows the deleted badge and restore action only on the deleted row', async () => {
    role = 'owner';
    h.useStudentsPage.mockReturnValue({
      ...emptyResult,
      data: {
        data: [LIVE_STUDENT, DELETED_STUDENT],
        meta: { total: 2, totalPages: 1 },
      },
    });
    await renderPage();

    // Rendered twice each -- once in the desktop table, once in the mobile
    // list (both mount in jsdom; only CSS hides one) -- for the ONE
    // deleted student. If this were 4, the live row would be leaking the
    // treatment too.
    expect(screen.getAllByText('common.deleted')).toHaveLength(2);
    expect(screen.getAllByLabelText('common.restore')).toHaveLength(2);

    // The live row keeps its edit/delete affordances.
    expect(screen.getAllByLabelText('common.edit').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('common.delete').length).toBeGreaterThan(0);
  });

  it('hides the restore action for a non-owner even if a deleted row is present', async () => {
    // Defensive case: role flips mid-session while stale deleted rows are
    // still in the rendered list.
    role = 'manager';
    h.useStudentsPage.mockReturnValue({
      ...emptyResult,
      data: {
        data: [DELETED_STUDENT],
        meta: { total: 1, totalPages: 1 },
      },
    });
    await renderPage();

    expect(screen.queryByLabelText('common.restore')).toBeNull();
  });
});

describe('StudentsPage restore action (autodrive-cg9)', () => {
  it('fires the restore mutation with the row id after confirming', async () => {
    role = 'owner';
    h.useStudentsPage.mockReturnValue({
      ...emptyResult,
      data: {
        data: [DELETED_STUDENT],
        meta: { total: 1, totalPages: 1 },
      },
    });
    await renderPage();

    fireEvent.click(screen.getAllByLabelText('common.restore')[0]);
    const dialog = screen.getByRole('dialog');
    // Honesty-requirement copy is present in the confirmation.
    expect(
      within(dialog).getByText('common.confirm_restore_desc'),
    ).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole('button', { name: 'common.restore' }),
    );

    await waitFor(() =>
      expect(h.restoreMutate).toHaveBeenCalledWith(
        's-deleted',
        expect.anything(),
      ),
    );
  });
});
