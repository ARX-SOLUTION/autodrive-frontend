import { render, screen, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import AttendanceDrawer from '@/components/AttendanceDrawer';
import type { CalendarLesson } from '@/types/schedule';

// autodrive-vh0.3: the save button used to have NO capability check at all
// (implicitly open to every role) -- this pins the new explicit
// useCan('takeAttendance') gate: it must still enable save for a teacher
// (takeAttendance is ALL-roles in permissions.ts) and must actually disable
// the button when the capability check fails, proving the gate is real and
// not just an accidental always-enabled button.

let canGate = true;
vi.mock('@/hooks/useCan', () => ({ useCan: () => canGate }));

vi.mock('@/services/attendanceService', () => ({
  useLessonById: () => ({ data: undefined, isError: false, refetch: vi.fn() }),
  useBatchAttendance: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/services/groupService', () => ({
  useGroup: () => ({ data: undefined }),
}));

const LESSON: CalendarLesson = {
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

afterEach(() => {
  canGate = true;
  cleanup();
});

describe('AttendanceDrawer save control gating (autodrive-vh0.3)', () => {
  it('is enabled when the takeAttendance capability is granted (teacher case)', () => {
    canGate = true;
    render(<AttendanceDrawer lesson={LESSON} onClose={vi.fn()} />);
    expect(screen.getByText('attendance.save').closest('button')).toBeEnabled();
  });

  it('is disabled when the takeAttendance capability check fails', () => {
    canGate = false;
    render(<AttendanceDrawer lesson={LESSON} onClose={vi.fn()} />);
    expect(
      screen.getByText('attendance.save').closest('button'),
    ).toBeDisabled();
  });
});
