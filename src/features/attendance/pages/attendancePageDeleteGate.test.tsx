import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AttendancePage from '@/features/attendance/pages/AttendancePage';
import { useAuthStore } from '@/store/authStore';
import {
  useLessons,
  useCreateLesson,
} from '@/features/attendance/api/attendanceService';
import { LessonSummary } from '@/features/attendance/types';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

vi.mock('@/store/authStore', () => ({ useAuthStore: vi.fn() }));

const lesson: LessonSummary = {
  id: 'l1',
  title: 'Theory 101',
  date: '2026-07-10T09:00:00.000Z',
  lesson_type: 'theory',
  group_id: 'g1',
  group_name: 'Group A',
  branch_id: 'b1',
  created_by_id: 'u1',
  created_at: '2026-07-01T00:00:00.000Z',
  present_count: 1,
  total_count: 2,
};

vi.mock('@/features/attendance/api/attendanceService', () => ({
  useLessons: vi.fn(() => ({
    data: { data: [lesson], total: 1 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
  useLessonById: () => ({ data: undefined, isError: false, refetch: vi.fn() }),
  useCreateLesson: vi.fn(),
  useBatchAttendance: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteLesson: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateLesson: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/features/groups/api/groupService', () => ({
  useGroups: () => ({ data: [], isLoading: false }),
  // AttendanceDrawer (autodrive-38m.3) is now reused by this page and calls
  // the real useGroup for its roster fallback -- without a mock it'd hit
  // useQuery with no QueryClientProvider in this test tree.
  useGroup: () => ({ data: undefined }),
}));

function renderAsRole(role: string) {
  (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({ user: { role, branch_id: 'b1' } }),
  );
  return renderWithRouter(<AttendancePage />, {
    initialEntry: '/attendance',
    routePattern: '/attendance',
  });
}

beforeEach(() => {
  vi.mocked(useLessons).mockReturnValue({
    data: { data: [lesson], total: 1 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useLessons>);
  vi.mocked(useCreateLesson).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useCreateLesson>);
});

// Regression for autodrive-6cq.5.50: canCreate (manageSchedule) includes
// operator, but the backend's DELETE /lessons/:id is
// @Roles(owner, manager) only -- operator always got a 403.
describe('AttendancePage delete-lesson gate', () => {
  it('shows a retryable fetch error instead of an empty attendance list', async () => {
    const refetch = vi.fn();
    vi.mocked(useLessons).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as unknown as ReturnType<typeof useLessons>);
    await renderAsRole('owner');
    expect(screen.getByText('common.error')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('hides the delete button for operator (backend would 403)', async () => {
    await renderAsRole('operator');
    expect(
      screen.queryByLabelText('attendance.delete_title'),
    ).not.toBeInTheDocument();
  });

  it('shows the delete button for manager (backend allows it)', async () => {
    await renderAsRole('manager');
    expect(
      screen.getByLabelText('attendance.delete_title'),
    ).toBeInTheDocument();
  });
});

// autodrive-6ef.27: the dense row list + inline expand-to-table was replaced
// with cards that open the same AttendanceDrawer SchedulePage uses.
describe('AttendancePage card -> drawer', () => {
  it('displays early lessons with their Tashkent date and time on the list card', async () => {
    const previousDate = lesson.date;
    lesson.date = '2026-09-27T20:00:00.000Z';
    try {
      await renderAsRole('manager');
      expect(screen.getByText('28.09.2026 01:00')).toBeInTheDocument();
    } finally {
      lesson.date = previousDate;
    }
  });

  it('opens the AttendanceDrawer when a lesson card is clicked', async () => {
    await renderAsRole('manager');
    expect(screen.getByText('schedule.status_marked')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Theory 101'));
    expect(
      await screen.findByText('attendance.no_students'),
    ).toBeInTheDocument();
  });
});

// autodrive-6ef.27: Create Lesson dialog moved from manual useState fields to
// react-hook-form + zod. Confirms required-field validation still blocks an
// empty submit instead of silently sending a half-filled payload.
describe('AttendancePage create-lesson form validation', () => {
  it('blocks submit when required fields are empty', async () => {
    const mutateAsync = vi.fn();
    vi.mocked(useCreateLesson).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateLesson>);
    await renderAsRole('manager');

    fireEvent.click(screen.getByText('attendance.add_lesson'));
    fireEvent.click(screen.getByText('attendance.create'));

    await waitFor(() => expect(mutateAsync).not.toHaveBeenCalled());
  });
});
