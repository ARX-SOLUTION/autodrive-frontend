import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import AttendanceDrawer from '@/features/attendance/api/AttendanceDrawer';
import type { CalendarLesson } from '@/features/schedule/types';

const mockMutateAsync = vi.fn().mockResolvedValue({});
let groupLoadingState = false;

vi.mock('@/hooks/useCan', () => ({ useCan: () => true }));
vi.mock('@/features/attendance/api/attendanceService', () => ({
  useLessonById: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useBatchAttendance: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));
vi.mock('@/features/groups/api/groupService', () => ({
  useGroup: () => ({
    isLoading: groupLoadingState,
    data: groupLoadingState
      ? undefined
      : {
          students: [
            { id: 's1', first_name: 'Islom', last_name: 'Karimov' },
            { id: 's2', first_name: 'Abdulla', last_name: 'Qodiriy' },
            { id: 's3', first_name: 'Ali', last_name: 'Valiyev' },
            { id: 's4', first_name: 'Oʻgʻiloy', last_name: 'Sobirova' },
          ],
        },
  }),
}));

const lesson: CalendarLesson = {
  id: 'l1',
  title: 'Theory 101',
  date: '2026-07-10T09:00:00.000Z',
  lesson_type: 'theory',
  group_id: 'g1',
  group_name: 'Group A',
  branch_id: 'b1',
  present_count: 0,
  total_count: 4,
};

afterEach(() => {
  groupLoadingState = false;
  mockMutateAsync.mockClear();
  cleanup();
});

describe('AttendanceDrawer search & layout', () => {
  it('formats the lesson header in Uzbek with the Tashkent local time', () => {
    render(<AttendanceDrawer lesson={lesson} onClose={vi.fn()} />);
    expect(screen.getByText('10.07.2026 14:00')).toBeInTheDocument();
  });

  it('lets an excused mark be selected and saved with the full roster flow', async () => {
    render(<AttendanceDrawer lesson={lesson} onClose={vi.fn()} />);

    const excused = screen.getByRole('button', {
      name: 'attendance.status_excused - Karimov Islom',
    });
    fireEvent.click(excused);
    expect(excused).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'attendance.save' }));

    await vi.waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        lessonId: 'l1',
        records: [{ lessonId: 'l1', studentId: 's1', status: 'excused' }],
      }),
    );
  });

  it('renders student name with wrapping classes and accessible search input', () => {
    render(<AttendanceDrawer lesson={lesson} onClose={vi.fn()} />);

    const student1 = screen.getByTitle('Karimov Islom');
    expect(student1).toBeInTheDocument();
    expect(student1).toHaveClass('break-words', 'line-clamp-2');

    const searchInput = screen.getByRole('textbox', { name: 'common.search' });
    expect(searchInput).toHaveAttribute('aria-label', 'common.search');

    fireEvent.change(searchInput, { target: { value: 'Islom' } });
    expect(screen.getByTitle('Karimov Islom')).toBeInTheDocument();
    expect(screen.queryByTitle('Qodiriy Abdulla')).not.toBeInTheDocument();

    // Progress total remains 4 even when filtered
    expect(
      screen.getByText('attendance.marked_progress', { exact: false }),
    ).toBeInTheDocument();
  });

  it('renders loading skeleton while group is loading preventing premature "no students" flash', () => {
    groupLoadingState = true;
    render(<AttendanceDrawer lesson={lesson} onClose={vi.fn()} />);

    expect(
      screen.queryByText('attendance.no_students'),
    ).not.toBeInTheDocument();
    expect(
      document.body.querySelectorAll('.animate-pulse').length,
    ).toBeGreaterThan(0);
  });

  it('verifies reverse word order search ("Ali Valiyev" finds "Valiyev Ali")', () => {
    render(<AttendanceDrawer lesson={lesson} onClose={vi.fn()} />);
    const searchInput = screen.getByRole('textbox', { name: 'common.search' });

    fireEvent.change(searchInput, { target: { value: 'Ali Valiyev' } });

    expect(screen.getByTitle('Valiyev Ali')).toBeInTheDocument();
    expect(screen.queryByTitle('Karimov Islom')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Qodiriy Abdulla')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Sobirova Oʻgʻiloy')).not.toBeInTheDocument();
  });

  it('verifies apostrophe search ("O\'g\'iloy" matches "Oʻgʻiloy")', () => {
    render(<AttendanceDrawer lesson={lesson} onClose={vi.fn()} />);
    const searchInput = screen.getByRole('textbox', { name: 'common.search' });

    fireEvent.change(searchInput, { target: { value: "O'g'iloy" } });

    expect(screen.getByTitle('Sobirova Oʻgʻiloy')).toBeInTheDocument();
    expect(screen.queryByTitle('Karimov Islom')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Valiyev Ali')).not.toBeInTheDocument();
  });

  it('verifies clearing search preserves marked attendance statuses', () => {
    render(<AttendanceDrawer lesson={lesson} onClose={vi.fn()} />);
    const searchInput = screen.getByRole('textbox', { name: 'common.search' });

    // Mark Karimov Islom as present
    const presentKarimov = screen.getByRole('button', {
      name: 'attendance.toggle_present - Karimov Islom',
    });
    fireEvent.click(presentKarimov);
    expect(presentKarimov).toHaveAttribute('aria-pressed', 'true');

    // Filter to Qodiriy
    fireEvent.change(searchInput, { target: { value: 'Qodiriy' } });
    expect(screen.queryByTitle('Karimov Islom')).not.toBeInTheDocument();

    // Mark Qodiriy Abdulla as late
    const lateQodiriy = screen.getByRole('button', {
      name: 'attendance.toggle_late - Qodiriy Abdulla',
    });
    fireEvent.click(lateQodiriy);
    expect(lateQodiriy).toHaveAttribute('aria-pressed', 'true');

    // Clear search using the clear button
    const clearButton = screen.getAllByRole('button', {
      name: 'common.clear',
    })[0];
    fireEvent.click(clearButton);

    // Both students are visible and have preserved statuses
    expect(screen.getByTitle('Karimov Islom')).toBeInTheDocument();
    expect(screen.getByTitle('Qodiriy Abdulla')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'attendance.toggle_present - Karimov Islom',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', {
        name: 'attendance.toggle_late - Qodiriy Abdulla',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders empty state with clear option when search yields no matches', () => {
    render(<AttendanceDrawer lesson={lesson} onClose={vi.fn()} />);
    const searchInput = screen.getByRole('textbox', { name: 'common.search' });

    fireEvent.change(searchInput, { target: { value: 'Nobody Here' } });

    expect(screen.getByText('common.no_data')).toBeInTheDocument();
    expect(screen.queryByTitle('Karimov Islom')).not.toBeInTheDocument();

    const clearButton = screen.getAllByRole('button', {
      name: 'common.clear',
    })[0];
    fireEvent.click(clearButton);

    expect(screen.getByTitle('Karimov Islom')).toBeInTheDocument();
    expect(screen.queryByText('common.no_data')).not.toBeInTheDocument();
  });

  it('sends all marked records when saving while filtered', async () => {
    render(<AttendanceDrawer lesson={lesson} onClose={vi.fn()} />);
    const searchInput = screen.getByRole('textbox', { name: 'common.search' });

    // Mark Karimov Islom as present
    fireEvent.click(
      screen.getByRole('button', {
        name: 'attendance.toggle_present - Karimov Islom',
      }),
    );

    // Filter to Qodiriy
    fireEvent.change(searchInput, { target: { value: 'Qodiriy' } });
    expect(screen.queryByTitle('Karimov Islom')).not.toBeInTheDocument();

    // Mark Qodiriy as absent
    fireEvent.click(
      screen.getByRole('button', {
        name: 'attendance.toggle_absent - Qodiriy Abdulla',
      }),
    );

    // Save
    const saveButton = screen.getByText('attendance.save').closest('button')!;
    fireEvent.click(saveButton);

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenCalledWith({
      lessonId: 'l1',
      records: expect.arrayContaining([
        { lessonId: 'l1', studentId: 's1', status: 'present' },
        { lessonId: 'l1', studentId: 's2', status: 'absent' },
      ]),
    });
    expect(mockMutateAsync.mock.calls[0][0].records).toHaveLength(2);
  });
});
