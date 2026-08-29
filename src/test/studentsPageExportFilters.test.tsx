import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentsPage from '@/pages/StudentsPage';
import type { Student } from '@/types/student';

const h = vi.hoisted(() => ({
  fetchAllStudents: vi.fn(),
  useStudentsPage: vi.fn(),
  jsonToSheet: vi.fn(() => ({})),
  bookNew: vi.fn(() => ({})),
  bookAppendSheet: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'owner', branch_id: null } }),
}));

vi.mock('@/services/studentService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/studentService')>();
  return {
    ...actual,
    fetchAllStudents: h.fetchAllStudents,
    useStudentsPage: h.useStudentsPage,
    useCreateStudent: () => ({ mutate: vi.fn(), isPending: false }),
    useCreateStudentWithPayment: () => ({
      mutate: vi.fn(),
      isPending: false,
    }),
    useUpdateStudent: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteStudent: () => ({ mutate: vi.fn(), isPending: false }),
    useRestoreStudent: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/services/operatorService', () => ({
  useOperators: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/components/ui/StudentModal', () => ({ default: () => null }));
vi.mock('@/components/ui/AddStudentDialog', () => ({ default: () => null }));

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: h.jsonToSheet,
    book_new: h.bookNew,
    book_append_sheet: h.bookAppendSheet,
  },
  writeFile: h.writeFile,
}));

const STUDENT: Student = {
  id: 'student-1',
  first_name: 'Aziz',
  last_name: 'Karimov',
  phone: '+998901234567',
  course_type: 'avto_maktab',
  branch_id: 'branch-9',
  branch_name: 'Chilonzor',
  payment_method: 'naqd',
  has_document: true,
  result: 'oqimoqda',
  created_at: '2026-07-01T00:00:00.000Z',
  total_price: 3_000_000,
  debt: 500_000,
};

beforeEach(() => {
  h.fetchAllStudents.mockReset().mockResolvedValue([STUDENT]);
  h.useStudentsPage.mockReset().mockReturnValue({
    data: {
      data: [STUDENT],
      meta: { total: 1, totalPages: 1 },
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  });
  h.jsonToSheet.mockClear();
  h.bookNew.mockClear();
  h.bookAppendSheet.mockClear();
  h.writeFile.mockClear();
});

describe('StudentsPage Excel export filters', () => {
  it('exports with the same active filters as the visible server-side list', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          '/students?course_type=avto_maktab&branch_id=branch-9' +
            '&operator_id=operator-7&q=aziz&date_from=2026-07-01' +
            '&date_to=2026-07-31&status=active&has_debt=false' +
            '&has_group=false&referred_by_user_id=user-ref' +
            '&referred_by_student_id=student-ref',
        ]}
      >
        <StudentsPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'common.date' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'students.export_excel' }),
    );

    await waitFor(() => expect(h.fetchAllStudents).toHaveBeenCalledTimes(1));

    const listCall = h.useStudentsPage.mock.calls.at(-1)!;
    const activeListFilters = {
      courseType: listCall[0],
      branchId: listCall[1],
      operatorId: listCall[4],
      ...listCall[5],
    };
    const exportFilters = h.fetchAllStudents.mock.calls[0][0];

    expect(exportFilters).toEqual(activeListFilters);
    expect(activeListFilters).toMatchObject({
      courseType: 'avto_maktab',
      branchId: 'branch-9',
      operatorId: 'operator-7',
      search: 'aziz',
      dateFrom: expect.any(Date),
      dateTo: expect.any(Date),
      sortBy: 'created_at',
      sortOrder: 'asc',
      status: 'active',
      hasDebt: false,
      hasGroup: false,
      referredByUserId: 'user-ref',
      referredByStudentId: 'student-ref',
      includeDeleted: true,
    });
    expect(h.writeFile).toHaveBeenCalledTimes(1);
  });
});
