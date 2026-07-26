import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import StudentsPage from '@/pages/StudentsPage';

// autodrive-qsgc.4: DateRangeFields typed entry (not Calendar range mode).
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
      data: { data: [], meta: { total: 0, totalPages: 1 } },
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

vi.mock('@/components/ui/StudentModal', () => ({
  default: () => null,
}));

vi.mock('@/components/ui/AddStudentDialog', () => ({
  default: () => null,
}));

vi.mock('@/services/courseService', () => ({
  useCourses: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/services/groupService', () => ({
  useGroups: () => ({ data: [], isLoading: false, refetch: vi.fn() }),
}));

const SearchParamsSpy = () => {
  const [params] = useSearchParams();
  return <div data-testid="search-params">{params.toString()}</div>;
};

describe('StudentsPage date-range filter', () => {
  it('writes both typed local calendar days to the URL', () => {
    render(
      <MemoryRouter initialEntries={['/students']}>
        <StudentsPage />
        <SearchParamsSpy />
      </MemoryRouter>,
    );

    const range = screen.getByTestId('date-range-fields');
    const inputs = range.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThanOrEqual(2);

    fireEvent.change(inputs[0], { target: { value: '10.07.2026' } });
    fireEvent.blur(inputs[0]);
    fireEvent.change(inputs[1], { target: { value: '12.07.2026' } });
    fireEvent.blur(inputs[1]);

    const params = screen.getByTestId('search-params').textContent ?? '';
    expect(params).toContain('date_from=2026-07-10');
    expect(params).toContain('date_to=2026-07-12');
  });
});
