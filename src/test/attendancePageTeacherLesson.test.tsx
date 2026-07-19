import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AttendancePage from '@/pages/AttendancePage';
import { useAuthStore } from '@/store/authStore';
import { useCreateLesson } from '@/services/attendanceService';
import { Lesson } from '@/types/attendance';

// autodrive-vh0.4: a teacher adds an ad-hoc lesson for their own
// (server-scoped) group, and may delete only a lesson they created
// themselves. Reuses the exact create/delete UI and services
// attendancePageDeleteGate.test.tsx already covers for owner/manager/
// operator -- this file only adds the teacher-specific scenarios.

vi.mock('@/store/authStore', () => ({ useAuthStore: vi.fn() }));

const ownLesson: Lesson = {
  id: 'l1',
  title: 'Ad-hoc practice',
  date: '2026-07-10T09:00:00.000Z',
  lesson_type: 'practice',
  group_id: 'g1',
  group_name: 'Group A',
  branch_id: 'b1',
  created_by_id: 'teacher-1',
  created_at: '2026-07-01T00:00:00.000Z',
  attendance: [],
};

const othersLesson: Lesson = {
  ...ownLesson,
  id: 'l2',
  title: 'Scheduled theory',
  created_by_id: 'someone-else',
};

vi.mock('@/services/attendanceService', () => ({
  useLessons: () => ({
    data: { data: [ownLesson, othersLesson], total: 2 },
    isLoading: false,
  }),
  useLessonById: () => ({ data: undefined, isError: false, refetch: vi.fn() }),
  useCreateLesson: vi.fn(),
  useBatchAttendance: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteLesson: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/services/groupService', () => ({
  // Teacher-scoped server-side (autodrive-vh0.2) -- GET /groups already
  // returns only the teacher's own group(s) by the time it reaches this
  // page, so the create-lesson dialog's group Select needs no extra
  // FE-side filtering.
  useGroups: () => ({
    data: [{ id: 'g1', name: 'Group A', branch_name: 'B1' }],
    isLoading: false,
  }),
  useGroup: () => ({ data: undefined }),
}));

function renderAsRole(role: string, id = 'teacher-1') {
  (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({ user: { role, id, branch_id: 'b1' } }),
  );
  return render(
    <MemoryRouter>
      <AttendancePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(useCreateLesson).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useCreateLesson>);
});

describe('AttendancePage add-lesson affordance for a teacher (autodrive-vh0.4)', () => {
  it('shows the add-lesson button for a teacher', () => {
    renderAsRole('teacher');
    expect(screen.getByText('attendance.add_lesson')).toBeInTheDocument();
  });

  it('still shows the add-lesson button for operator (regression, manageSchedule unchanged)', () => {
    renderAsRole('operator');
    expect(screen.getByText('attendance.add_lesson')).toBeInTheDocument();
  });
});

describe('AttendancePage delete-own-lesson for a teacher (autodrive-vh0.4)', () => {
  it('shows delete only on the lesson the teacher created, not the other one', () => {
    renderAsRole('teacher', 'teacher-1');
    const deleteButtons = screen.getAllByLabelText('attendance.delete_title');
    expect(deleteButtons).toHaveLength(1);
  });

  it('shows no delete button when the teacher created neither lesson', () => {
    renderAsRole('teacher', 'someone-new');
    expect(
      screen.queryByLabelText('attendance.delete_title'),
    ).not.toBeInTheDocument();
  });
});

// Regression guard for the exact asymmetry manageOwnLesson exists to avoid:
// operator can create (manageSchedule) but must never get a delete button
// for a lesson operator created themselves -- the backend does not grant it.
describe('AttendancePage operator excluded from delete-own (autodrive-vh0.4)', () => {
  it('hides delete for operator even on a lesson operator created', () => {
    renderAsRole('operator', 'teacher-1'); // matches ownLesson.created_by_id
    expect(
      screen.queryByLabelText('attendance.delete_title'),
    ).not.toBeInTheDocument();
  });
});
