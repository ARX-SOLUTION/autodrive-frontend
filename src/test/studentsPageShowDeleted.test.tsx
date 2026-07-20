import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, afterEach } from 'vitest';
import StudentsPage from '@/pages/StudentsPage';
import type { Student } from '@/types/student';
import type { UserRole } from '@/types/user';

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

vi.mock('@/services/studentService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/studentService')>();
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

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({ data: [], isLoading: false }),
}));
vi.mock('@/services/operatorService', () => ({
  useOperators: () => ({ data: [], isLoading: false }),
}));

// StudentModal/AddStudentDialog are always mounted (just closed) inside
// StudentsDialogs and call useGroups/useCourses themselves; stub them out
// entirely (mirrors src/test/studentsPageDetailedToggle.test.tsx) rather
// than chase every service they need -- this test only cares about the
// list/toggle/restore behavior, not the create/edit form.
vi.mock('@/components/ui/StudentModal', () => ({
  default: () => null,
}));
vi.mock('@/components/ui/AddStudentDialog', () => ({
  default: () => null,
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/students']}>
      <StudentsPage />
    </MemoryRouter>,
  );

const emptyResult = {
  data: { data: [], meta: { total: 0, totalPages: 1 } },
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
  it('is absent for a manager', () => {
    role = 'manager';
    h.useStudentsPage.mockReturnValue(emptyResult);
    renderPage();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByText('common.show_deleted')).toBeNull();
  });

  it('is absent for an operator', () => {
    role = 'operator';
    h.useStudentsPage.mockReturnValue(emptyResult);
    renderPage();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('is absent for a teacher', () => {
    role = 'teacher';
    h.useStudentsPage.mockReturnValue(emptyResult);
    renderPage();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('is present for an owner', () => {
    role = 'owner';
    h.useStudentsPage.mockReturnValue(emptyResult);
    renderPage();
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('is present for dev (owner is a strict subset of dev)', () => {
    role = 'dev';
    h.useStudentsPage.mockReturnValue(emptyResult);
    renderPage();
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });
});

describe('StudentsPage "show deleted" toggle wiring (autodrive-cg9)', () => {
  it('flips includeDeleted through to useStudentsPage when switched on', () => {
    role = 'owner';
    h.useStudentsPage.mockReturnValue(emptyResult);
    renderPage();

    fireEvent.click(screen.getByRole('switch'));

    const lastCall =
      h.useStudentsPage.mock.calls[h.useStudentsPage.mock.calls.length - 1];
    // Options object is the 6th positional arg (courseType, branchId, page,
    // limit, operatorId, options).
    expect(lastCall[5]).toMatchObject({ includeDeleted: true });
  });
});

describe('StudentsPage deleted-row rendering (autodrive-cg9)', () => {
  it('shows the deleted badge and restore action only on the deleted row', () => {
    role = 'owner';
    h.useStudentsPage.mockReturnValue({
      ...emptyResult,
      data: {
        data: [LIVE_STUDENT, DELETED_STUDENT],
        meta: { total: 2, totalPages: 1 },
      },
    });
    renderPage();

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

  it('hides the restore action for a non-owner even if a deleted row is present', () => {
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
    renderPage();

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
    renderPage();

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
