import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import { useBatchAttendance } from '@/services/attendanceService';
import { attendanceKeys, lessonKeys, scheduleKeys } from '@/lib/queryKeys';
import type { Lesson, PaginatedLessons } from '@/types/attendance';
import type { CalendarLesson } from '@/types/schedule';

vi.mock('@/api/axiosInstance', () => ({
  default: { post: vi.fn() },
}));

vi.mock('@/lib/umami', () => ({ track: vi.fn() }));

const lesson: Lesson = {
  id: 'lesson-1',
  title: 'Theory',
  date: '2026-08-29T09:00:00.000Z',
  lesson_type: 'theory',
  group_id: 'group-1',
  group_name: 'Group A',
  branch_id: 'branch-1',
  created_by_id: 'teacher-1',
  created_at: '2026-08-20T09:00:00.000Z',
  attendance: [
    {
      id: 'attendance-1',
      student_id: 'student-1',
      student_name: 'Ali Valiyev',
      status: 'absent',
      marked_by_id: 'teacher-1',
    },
  ],
};

const calendarLesson: CalendarLesson = {
  id: lesson.id,
  title: lesson.title,
  date: lesson.date,
  lesson_type: lesson.lesson_type,
  group_id: lesson.group_id,
  group_name: lesson.group_name || '',
  branch_id: lesson.branch_id,
  present_count: 0,
  total_count: 1,
};

describe('useBatchAttendance optimistic rollback', () => {
  it('restores every touched cache exactly and invalidates attendance views after failure', async () => {
    let rejectRequest: (error: Error) => void = () => undefined;
    const request = new Promise((_, reject) => {
      rejectRequest = reject;
    });
    vi.mocked(axiosInstance.post).mockReturnValue(request);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const lessonPageKey = lessonKeys.page({
      branchId: 'branch-1',
      page: 1,
      limit: 50,
    });
    const lessonDetailKey = lessonKeys.detail(lesson.id);
    const calendarKey = scheduleKeys.calendar({
      branchId: 'branch-1',
      dateFrom: '2026-08-25',
      dateTo: '2026-08-31',
    });
    const historyKey = attendanceKeys.history('student-1', { limit: 20 });
    const originalPage: PaginatedLessons = {
      data: [lesson],
      total: 1,
      page: 1,
      limit: 50,
    };
    const originalDetail = lesson;
    const originalCalendar = [calendarLesson];

    queryClient.setQueryData(lessonPageKey, originalPage);
    queryClient.setQueryData(lessonDetailKey, originalDetail);
    queryClient.setQueryData(calendarKey, originalCalendar);
    queryClient.setQueryData(historyKey, [{ id: 'history-1' }]);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useBatchAttendance(), { wrapper });

    result.current.mutate({
      lessonId: lesson.id,
      records: [
        {
          lessonId: lesson.id,
          studentId: 'student-1',
          status: 'present',
        },
      ],
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData<Lesson>(lessonDetailKey)?.attendance[0].status,
      ).toBe('present');
      expect(
        queryClient.getQueryData<CalendarLesson[]>(calendarKey)?.[0]
          .present_count,
      ).toBe(1);
    });

    rejectRequest(new Error('network down'));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData(lessonPageKey)).toEqual(originalPage);
    expect(queryClient.getQueryData(lessonDetailKey)).toEqual(originalDetail);
    expect(queryClient.getQueryData(calendarKey)).toEqual(originalCalendar);
    expect(queryClient.getQueryState(lessonPageKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(calendarKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(historyKey)?.isInvalidated).toBe(true);
  });
});
