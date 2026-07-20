import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import StudentsPage from '@/pages/StudentsPage';

// Regression for autodrive-6cq.11.4: the table rendered the raw
// ResultStatus enum value ('oqimoqda') instead of a localized label, so it
// looked permanently "stuck" to non-Uzbek-reading users. It must render the
// same label StudentModal's result <Select> shows.
const STUDENT = {
  id: 's1',
  last_name: 'Karimov',
  first_name: 'Aziz',
  phone: '+998901234567',
  total_price: 3000000,
  course_type: 'tezkor',
  branch_id: 'b1',
  payment_method: 'naqd',
  debt: 0,
  has_document: true,
  result: 'oqimoqda',
  created_at: '2026-07-01T00:00:00.000Z',
  amount_paid: 3000000,
};

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      user: { role: 'owner', branch_id: null },
      isOwner: () => true,
    }),
}));

vi.mock('@/services/studentService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/studentService')>();
  return {
    ...actual,
    fetchAllStudents: vi.fn(),
    useStudentsPage: () => ({
      data: { data: [STUDENT], meta: { total: 1, totalPages: 1 } },
      isLoading: false,
    }),
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

vi.mock('@/components/ui/AddStudentDialog', () => ({
  default: () => null,
}));

vi.mock('@/services/courseService', () => ({
  useCourses: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/services/groupService', () => ({
  useGroups: () => ({ data: [], isLoading: false, refetch: vi.fn() }),
}));
describe('StudentsPage result status label', () => {
  it('renders the localized label, not the raw enum value', () => {
    render(
      <MemoryRouter initialEntries={['/students']}>
        <StudentsPage />
      </MemoryRouter>,
    );

    // react-i18next is mocked (src/test/setup.ts) so t(key) === key.
    expect(screen.queryAllByText('oqimoqda').length).toBe(0);
    expect(
      screen.getAllByText('students.status_studying').length,
    ).toBeGreaterThan(0);
  });
});
