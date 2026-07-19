import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AttendancePage from '@/pages/AttendancePage';
import { useAuthStore } from '@/store/authStore';
import { useCreateLesson, useUpdateLesson } from '@/services/attendanceService';
import { Lesson } from '@/types/attendance';

// autodrive-vh0.4: a teacher adds an ad-hoc lesson for their own
// (server-scoped) group, and may delete/edit only a lesson they created
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

// Schedule-generated lessons carry no distinct FE-visible flag -- the
// backend rejects PATCH/DELETE on them purely because createdById is never
// the teacher's (attendance.service.ts: "createdById won't be theirs for
// either" admin-created or schedule-generated). Modeled here with a
// manager's id standing in for the schedule-generation actor -- same shape
// as othersLesson, kept separate to document the scenario explicitly.
const scheduleGeneratedLesson: Lesson = {
  ...ownLesson,
  id: 'l3',
  title: 'Generated theory',
  created_by_id: 'manager-1',
};

vi.mock('@/services/attendanceService', () => ({
  useLessons: () => ({
    data: {
      data: [ownLesson, othersLesson, scheduleGeneratedLesson],
      total: 3,
    },
    isLoading: false,
  }),
  useLessonById: () => ({ data: undefined, isError: false, refetch: vi.fn() }),
  useCreateLesson: vi.fn(),
  useUpdateLesson: vi.fn(),
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
  vi.mocked(useUpdateLesson).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateLesson>);
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

// SLICE B (autodrive-vh0.4): PATCH /lessons/:id, same ownership shape as
// delete -- a teacher edits only a lesson they created for their own group.
describe('AttendancePage edit-own-lesson for a teacher (autodrive-vh0.4)', () => {
  it('shows edit only on the lesson the teacher created, not on others or a schedule-generated one', () => {
    renderAsRole('teacher', 'teacher-1');
    const editButtons = screen.getAllByLabelText('attendance.edit_title');
    expect(editButtons).toHaveLength(1);
  });

  it('shows no edit button when the teacher created none of the lessons', () => {
    renderAsRole('teacher', 'someone-new');
    expect(
      screen.queryByLabelText('attendance.edit_title'),
    ).not.toBeInTheDocument();
  });
});

// CRITICAL gate: manageOwnLesson also grants dev/owner/manager (used above
// for the delete-own affordance), but PATCH /lessons/:id is
// @Roles(teacher) ONLY -- a non-teacher must never see edit, even on a
// lesson they created themselves, or clicking it would 403.
describe('AttendancePage non-teacher excluded from edit (autodrive-vh0.4)', () => {
  it('hides edit for manager even on a lesson manager created (teacher-only endpoint)', () => {
    renderAsRole('manager', 'teacher-1'); // matches ownLesson.created_by_id
    expect(
      screen.queryByLabelText('attendance.edit_title'),
    ).not.toBeInTheDocument();
  });
});

describe('AttendancePage edit-lesson submit (autodrive-vh0.4)', () => {
  it('pre-fills the form and sends only the editable fields to the update mutation, never groupId', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useUpdateLesson).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateLesson>);
    renderAsRole('teacher', 'teacher-1');

    fireEvent.click(screen.getByLabelText('attendance.edit_title'));
    // Pre-filled from ownLesson -- proves this is the same dialog/schema,
    // not a second parallel form.
    const titleInput = screen.getByDisplayValue('Ad-hoc practice');
    fireEvent.change(titleInput, { target: { value: 'Updated title' } });
    fireEvent.click(screen.getByText('attendance.save'));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    const payload = mutateAsync.mock.calls[0][0];
    expect(payload).not.toHaveProperty('groupId');
    expect(payload.id).toBe('l1');
    expect(payload.title).toBe('Updated title');
    expect(payload.lessonType).toBe('practice');
  });
});
