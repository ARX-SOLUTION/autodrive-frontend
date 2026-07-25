import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import AttendanceDrawer from '@/components/AttendanceDrawer';
import type { CalendarLesson } from '@/types/schedule';

// react-hooks/set-state-in-effect fix: `setChanges({})` moved from a
// useEffect keyed on lesson?.id to a render-phase reset. Locks down that
// unsaved-but-marked attendance still clears when the drawer is reused for
// a different lesson (the exact behavior the effect provided).

vi.mock('@/hooks/useCan', () => ({ useCan: () => true }));
vi.mock('@/services/attendanceService', () => ({
  useLessonById: () => ({ data: undefined, isError: false, refetch: vi.fn() }),
  useBatchAttendance: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/services/groupService', () => ({
  useGroup: () => ({
    data: {
      students: [{ id: 's1', first_name: 'Ali', last_name: 'Valiyev' }],
    },
  }),
}));

const lessonA: CalendarLesson = {
  id: 'l1',
  title: 'Theory 101',
  date: '2026-07-10T09:00:00.000Z',
  lesson_type: 'theory',
  group_id: 'g1',
  group_name: 'Group A',
  branch_id: 'b1',
  present_count: 0,
  total_count: 0,
};
const lessonB: CalendarLesson = { ...lessonA, id: 'l2', title: 'Theory 102' };

afterEach(cleanup);

describe('AttendanceDrawer resets unsaved marks when the lesson changes', () => {
  it('clears a marked-but-unsaved status when the drawer switches to a different lesson', () => {
    const { rerender } = render(
      <AttendanceDrawer lesson={lessonA} onClose={vi.fn()} />,
    );

    fireEvent.click(screen.getByText('attendance.toggle_present'));
    expect(screen.getByText('attendance.toggle_present')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    rerender(<AttendanceDrawer lesson={lessonB} onClose={vi.fn()} />);
    expect(screen.getByText('attendance.toggle_present')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
