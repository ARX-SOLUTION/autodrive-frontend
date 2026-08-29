import { screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, vi, describe, it, expect } from 'vitest';
import StudentsPage from '@/pages/StudentsPage';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// DateRangePicker: two calendar clicks write date_from/date_to.
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

describe('StudentsPage date-range filter', () => {
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
});
