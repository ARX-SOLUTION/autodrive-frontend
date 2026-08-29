import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { toast } from 'sonner';
import SchedulePage from '@/pages/SchedulePage';
import { useGenerateLessons } from '@/services/scheduleService';
import { useBatchAttendance } from '@/services/attendanceService';
import { ScheduleTemplate, CalendarLesson } from '@/types/schedule';
import { Group } from '@/types/group';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// The global react-i18next mock (src/test/setup.ts) returns the raw key and
// ignores interpolation args, which can't distinguish "real counts passed"
// from "no counts passed" -- both render as the bare key. Override with a
// spy that still returns just the key (so every existing getByText(key)
// assertion below is unaffected) but also records call args, so the new
// autodrive-52v.4 test can assert the exact {created, skipped} passed in.
const tSpy = vi.hoisted(() => vi.fn((key: string) => key));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: tSpy,
    i18n: { changeLanguage: () => new Promise(() => {}) },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const mockTemplates: ScheduleTemplate[] = [
  {
    id: 'tpl-1',
    group_id: 'group-1',
    group_name: 'Group A',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '11:00',
    lesson_type: 'theory',
    is_active: true,
    teacher_name: 'Teacher A',
  },
];

const mockLesson: CalendarLesson = {
  id: 'lesson-1',
  title: 'Lesson 1',
  date: new Date().toISOString(),
  lesson_type: 'theory',
  group_id: 'group-1',
  group_name: 'Group A',
  branch_id: 'b1',
  teacher_name: 'Teacher A',
  present_count: 0,
  total_count: 0,
};

const mockGroup = {
  id: 'group-1',
  students: [{ id: 'student-1', first_name: 'Ali', last_name: 'Valiyev' }],
} as unknown as Group;

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'owner' } }),
}));

vi.mock('@/services/scheduleService', () => ({
  useScheduleTemplates: () => ({ data: mockTemplates, isLoading: false }),
  useCalendarLessons: () => ({ data: [mockLesson], isLoading: false }),
  useCreateTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useGenerateLessons: vi.fn(),
}));

vi.mock('@/services/groupService', () => ({
  useGroups: () => ({ data: [], isLoading: false }),
  useGroup: () => ({ data: mockGroup }),
}));

vi.mock('@/services/attendanceService', () => ({
  useLessonById: () => ({ data: undefined, isLoading: false }),
  useBatchAttendance: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

describe('SchedulePage', () => {
  it('renders the templates list without crashing when templates exist', async () => {
    vi.mocked(useGenerateLessons).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateLessons>);

    await renderWithRouter(<SchedulePage />, {
      initialEntry: '/schedule',
      routePattern: '/schedule',
    });
    // Templates now live under the "Shablonlar" tab (autodrive-y5b).
    // Radix Tabs switches on mousedown, not click.
    fireEvent.mouseDown(screen.getByText('schedule.tab_templates'));
    expect(screen.getByText('Group A')).toBeInTheDocument();
  });

  // Regression for autodrive-6cq.5.53: parseInt('') is NaN, and NaN<1 /
  // NaN>12 are both false, so the guard used to let a cleared weeks field
  // through and call generateLessons with weeks: NaN.
  it('rejects a cleared weeks field instead of sending NaN', async () => {
    const mutateAsync = vi.fn();
    vi.mocked(useGenerateLessons).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateLessons>);

    await renderWithRouter(<SchedulePage />, {
      initialEntry: '/schedule',
      routePattern: '/schedule',
    });

    fireEvent.click(screen.getByText('schedule.generate_lessons'));
    // FormLabel's htmlFor ties to the Input's id (rhf + shadcn Form), so the
    // weeks field is queryable by its label now.
    const weeksInput = screen.getByLabelText('schedule.weeks_label');
    fireEvent.change(weeksInput, { target: { value: '' } });
    fireEvent.click(screen.getByText('common.create'));

    // zodResolver always validates async, so wait for the inline range error
    // to surface first -- only then is "mutation not called" meaningful. A
    // bare sync assertion would pass before validation ever runs.
    await waitFor(() =>
      expect(screen.getByText('schedule.weeks_error')).toBeInTheDocument(),
    );
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  // autodrive-52v.4: the success toast used to be a fixed "Lessons
  // generated" string no matter how many lessons were actually created vs
  // skipped. It must now report the real counts from the mutation result.
  it('reports the real created/skipped counts in the success toast', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      created: 5,
      skipped: 2,
      message: 'ok',
    });
    vi.mocked(useGenerateLessons).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateLessons>);

    await renderWithRouter(<SchedulePage />, {
      initialEntry: '/schedule',
      routePattern: '/schedule',
    });

    // genWeeks defaults to '4' -- submit as-is, no need to touch the field.
    fireEvent.click(screen.getByText('schedule.generate_lessons'));
    fireEvent.click(screen.getByText('common.create'));

    await waitFor(() =>
      expect(tSpy).toHaveBeenCalledWith('schedule.lessons_generated', {
        created: 5,
        skipped: 2,
      }),
    );
    expect(toast.success).toHaveBeenCalledWith('schedule.lessons_generated');
  });

  // autodrive-38m.3: clicking a week-strip lesson card opens the
  // AttendanceDrawer for that lesson; marking a student via the toggle and
  // saving calls the shared batch-attendance mutation.
  it('opens the drawer from a lesson card, marks a student, and saves', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useBatchAttendance).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useBatchAttendance>);

    await renderWithRouter(<SchedulePage />, {
      initialEntry: '/schedule',
      routePattern: '/schedule',
    });

    fireEvent.click(screen.getByText('Group A'));

    expect(await screen.findByText('Valiyev Ali')).toBeInTheDocument();

    fireEvent.click(screen.getByText('attendance.toggle_present'));
    fireEvent.click(screen.getByText('attendance.save'));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        lessonId: 'lesson-1',
        records: [
          { lessonId: 'lesson-1', studentId: 'student-1', status: 'present' },
        ],
      }),
    );
  });
});
