import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { toast } from 'sonner';
import SchedulePage from '@/features/schedule/pages/SchedulePage';
import {
  useCalendarLessons,
  useGenerateLessons,
  useScheduleTemplates,
} from '@/features/schedule/api/scheduleService';
import { useGroups } from '@/features/groups/api/groupService';
import { useBatchAttendance } from '@/features/attendance/api/attendanceService';
import { ScheduleTemplate, CalendarLesson } from '@/features/schedule/types';
import { Group } from '@/features/groups/types';
import { renderWithRouter } from '@/test/utils/renderWithRouter';
import uz from '@/i18n/locales/uz.json';
import ru from '@/i18n/locales/ru.json';
import en from '@/i18n/locales/en.json';

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
    i18n: { language: 'ru', changeLanguage: () => new Promise(() => {}) },
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

vi.mock('@/features/schedule/api/scheduleService', () => ({
  useScheduleTemplates: vi.fn(() => ({
    data: mockTemplates,
    isLoading: false,
  })),
  useCalendarLessons: vi.fn(() => ({ data: [mockLesson], isLoading: false })),
  useCreateTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useGenerateLessons: vi.fn(),
}));

vi.mock('@/features/groups/api/groupService', () => ({
  useGroups: vi.fn(() => ({ data: [], isLoading: false })),
  useGroup: () => ({ data: mockGroup }),
}));

vi.mock('@/features/attendance/api/attendanceService', () => ({
  useLessonById: () => ({ data: undefined, isLoading: false }),
  useBatchAttendance: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

describe('SchedulePage', () => {
  beforeEach(() => {
    vi.mocked(useScheduleTemplates).mockReturnValue({
      data: mockTemplates,
      isLoading: false,
    } as unknown as ReturnType<typeof useScheduleTemplates>);
    tSpy.mockImplementation((key: string) => key);
    vi.mocked(useCalendarLessons).mockImplementation(
      () =>
        ({
          data: [mockLesson],
          isLoading: false,
        }) as unknown as ReturnType<typeof useCalendarLessons>,
    );
  });

  it('keeps a template fetch failure distinct from a genuine empty schedule', async () => {
    vi.mocked(useGenerateLessons).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateLessons>);
    const refetch = vi.fn();
    vi.mocked(useScheduleTemplates).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as unknown as ReturnType<typeof useScheduleTemplates>);
    await renderWithRouter(<SchedulePage />);
    fireEvent.mouseDown(
      screen.getByRole('tab', { name: 'schedule.tab_templates' }),
    );
    expect(await screen.findByText('common.error')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('enables only the active tab and opens group queries when a form needs them', async () => {
    vi.mocked(useGenerateLessons).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateLessons>);
    await renderWithRouter(<SchedulePage />);

    expect(useScheduleTemplates).toHaveBeenLastCalledWith(false);
    expect(vi.mocked(useCalendarLessons).mock.calls.at(-1)?.[2]).toBe(true);
    expect(useGroups).toHaveBeenLastCalledWith({}, false);
    fireEvent.mouseDown(
      screen.getByRole('tab', { name: 'schedule.tab_templates' }),
    );
    await waitFor(() =>
      expect(useScheduleTemplates).toHaveBeenLastCalledWith(true),
    );
    expect(vi.mocked(useCalendarLessons).mock.calls.at(-1)?.[2]).toBe(false);

    fireEvent.click(screen.getByText('schedule.generate_lessons'));
    expect(useGroups).toHaveBeenLastCalledWith({}, true);
  });

  it('explains an empty week and lets the user move to the next week', async () => {
    vi.mocked(useCalendarLessons).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useCalendarLessons>);
    vi.mocked(useGenerateLessons).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateLessons>);
    await renderWithRouter(<SchedulePage />);

    expect(screen.getByText('schedule.week_empty')).toBeInTheDocument();
    const previousFrom = vi.mocked(useCalendarLessons).mock.calls.at(-1)![0];
    fireEvent.click(
      screen.getAllByRole('button', { name: 'schedule.next_week' }).at(-1)!,
    );
    const nextFrom = vi.mocked(useCalendarLessons).mock.calls.at(-1)![0];
    expect(
      new Date(nextFrom).getTime() - new Date(previousFrom).getTime(),
    ).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('shows a retry action instead of an empty week when the calendar query fails', async () => {
    const refetch = vi.fn();
    vi.mocked(useCalendarLessons).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as unknown as ReturnType<typeof useCalendarLessons>);
    vi.mocked(useGenerateLessons).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateLessons>);

    await renderWithRouter(<SchedulePage />);

    expect(screen.queryByText('schedule.week_empty')).not.toBeInTheDocument();
    expect(screen.getByText('common.error')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('keeps the current week, Today action and early lessons in Tashkent time', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-27T20:00:00.000Z'));
    vi.mocked(useCalendarLessons).mockReturnValue({
      data: [
        {
          ...mockLesson,
          date: '2026-09-27T20:00:00.000Z',
          group_name: 'Early Tashkent group',
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useCalendarLessons>);
    vi.mocked(useGenerateLessons).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateLessons>);

    try {
      await renderWithRouter(<SchedulePage />);

      expect(useCalendarLessons).toHaveBeenLastCalledWith(
        '2026-09-28',
        '2026-10-04',
        true,
      );
      expect(screen.getByText('Early Tashkent group')).toBeInTheDocument();
      expect(screen.getByText('01:00')).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole('button', { name: 'schedule.prev_week' }),
      );
      fireEvent.click(screen.getByRole('button', { name: 'schedule.today' }));
      expect(useCalendarLessons).toHaveBeenLastCalledWith(
        '2026-09-28',
        '2026-10-04',
        true,
      );
      expect(screen.getByText('Early Tashkent group')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ['uz', uz],
    ['ru', ru],
    ['en', en],
  ] as const)(
    'renders %s weekday translations in both calendar and template labels',
    async (_language, locale) => {
      const labels: Record<string, string> = locale.schedule;
      tSpy.mockImplementation((key: string) =>
        key.startsWith('schedule.day_')
          ? labels[key.slice('schedule.'.length)]
          : key,
      );
      vi.mocked(useGenerateLessons).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as unknown as ReturnType<typeof useGenerateLessons>);
      await renderWithRouter(<SchedulePage />);

      expect(
        screen.getByText(new RegExp(`^${locale.schedule.day_monday}`)),
      ).toBeInTheDocument();
      fireEvent.mouseDown(
        screen.getByRole('tab', { name: 'schedule.tab_templates' }),
      );
      await waitFor(() =>
        expect(
          screen.getByText(locale.schedule.day_monday),
        ).toBeInTheDocument(),
      );
    },
  );

  it('requests the complete calendar week using date-only API parameters', async () => {
    vi.mocked(useGenerateLessons).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateLessons>);

    await renderWithRouter(<SchedulePage />);

    const [from, to] = vi.mocked(useCalendarLessons).mock.calls.at(-1)!;
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(
      new Date(`${to}T00:00:00Z`).getTime() -
        new Date(`${from}T00:00:00Z`).getTime(),
    ).toBe(6 * 24 * 60 * 60 * 1000);
  });

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
