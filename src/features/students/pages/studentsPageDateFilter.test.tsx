import { screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, vi, describe, it, expect } from 'vitest';
import StudentsPage from '@/features/students/pages/StudentsPage';
import { renderWithRouter } from '@/test/utils/renderWithRouter';
import { Route } from '@/routes/_authenticated.students.index';

// DateRangePicker: two calendar clicks write date_from/date_to.
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      user: { role: 'owner', branch_id: null },
      isOwner: () => true,
    }),
}));

vi.mock('@/features/students/api/studentService', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@/features/students/api/studentService')
    >();
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

vi.mock('@/features/branches/api/branchService', () => ({
  useBranches: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/features/staff/api/operatorService', () => ({
  useOperators: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/features/students/api/StudentModal', () => ({
  default: () => null,
}));

vi.mock('@/features/students/components/AddStudentDialog', () => ({
  default: () => null,
}));

vi.mock('@/features/courses/api/courseService', () => ({
  useCourses: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/features/groups/api/groupService', () => ({
  useGroups: () => ({ data: [], isLoading: false, refetch: vi.fn() }),
}));

describe('StudentsPage date-range filter', () => {
  it.each([false, 'false'])(
    'preserves explicit false route filters (%s)',
    (value) => {
      const validateSearch = Route.options.validateSearch;
      if (typeof validateSearch !== 'function')
        throw new Error('Missing student search validator');
      expect(
        validateSearch({ has_group: value, has_debt: value }),
      ).toMatchObject({
        has_group: false,
        has_debt: false,
      });
    },
  );
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('writes both calendar-selected days to the URL', async () => {
    const { router } = await renderWithRouter(<StudentsPage />, {
      initialEntry: '/students',
      routePattern: '/students',
    });
    const scrollSpy = vi.spyOn(window, 'scrollTo');
    scrollSpy.mockClear();

    fireEvent.click(
      screen.getAllByRole('button', { name: 'filters.title' }).at(-1)!,
    );
    expect(
      screen.getByRole('combobox', { name: 'common.branch' }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByTestId('date-range-picker').querySelector('button')!,
    );
    const clickDay = (day: string) => {
      const cells = screen
        .getAllByRole('gridcell')
        .filter((c) => c.textContent === day);
      const cell =
        cells.find((c) => {
          const btn = c.querySelector('button');
          return btn && !btn.disabled && !btn.className.includes('day-outside');
        }) ?? cells[0];
      fireEvent.click(cell.querySelector('button')!);
    };
    // max defaults to Tashkent today; Jul 10–12 are in range.
    clickDay('10');
    clickDay('12');

    // Router navigation resolves asynchronously; waitFor needs real timers.
    vi.useRealTimers();
    await waitFor(() => {
      expect(router.state.location.searchStr).toContain('date_from=2026-07-10');
      expect(router.state.location.searchStr).toContain('date_to=2026-07-12');
      expect(router.state.location.pathname).toBe('/students');
    });
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('keeps search and course visible without counting them in the filter badge', async () => {
    await renderWithRouter(<StudentsPage />, {
      initialEntry: '/students?q=aziz&course_type=tezkor',
      routePattern: '/students',
    });

    expect(screen.getAllByDisplayValue('aziz')).toHaveLength(2);
    expect(
      screen.getAllByRole('combobox', { name: 'common.group' }),
    ).toHaveLength(1);
    expect(
      screen
        .getAllByRole('button', { name: 'students.course_fast' })
        .every((button) => button.getAttribute('aria-pressed') === 'true'),
    ).toBe(true);
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('counts only additional student filters as logical badge items', async () => {
    await renderWithRouter(<StudentsPage />, {
      initialEntry:
        '/students?q=aziz&course_type=tezkor&branch_id=b9&operator_id=op7&has_group=false&date_from=2026-07-10&date_to=2026-07-12&status=active&has_debt=false',
      routePattern: '/students',
    });

    expect(screen.getAllByText('6')).toHaveLength(2);
  });
});
