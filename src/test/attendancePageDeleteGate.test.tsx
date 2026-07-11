import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import AttendancePage from '@/pages/AttendancePage';
import { useAuthStore } from '@/store/authStore';
import { Lesson } from '@/types/attendance';

vi.mock('@/store/authStore', () => ({ useAuthStore: vi.fn() }));

const lesson: Lesson = {
  id: 'l1',
  title: 'Theory 101',
  date: '2026-07-10T09:00:00.000Z',
  lesson_type: 'theory',
  group_id: 'g1',
  group_name: 'Group A',
  branch_id: 'b1',
  created_by_id: 'u1',
  created_at: '2026-07-01T00:00:00.000Z',
  attendance: [],
};

vi.mock('@/services/attendanceService', () => ({
  useLessons: () => ({
    data: { data: [lesson], total: 1 },
    isLoading: false,
  }),
  useLessonById: () => ({ data: undefined, isError: false, refetch: vi.fn() }),
  useCreateLesson: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useBatchAttendance: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteLesson: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/services/groupService', () => ({
  useGroups: () => ({ data: [], isLoading: false }),
}));

function renderAsRole(role: string) {
  (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({ user: { role, branch_id: 'b1' } }),
  );
  return render(
    <MemoryRouter>
      <AttendancePage />
    </MemoryRouter>,
  );
}

// Regression for autodrive-6cq.5.50: canCreate (manageSchedule) includes
// operator, but the backend's DELETE /lessons/:id is
// @Roles(owner, manager) only -- operator always got a 403.
describe('AttendancePage delete-lesson gate', () => {
  it('hides the delete button for operator (backend would 403)', () => {
    renderAsRole('operator');
    expect(
      screen.queryByLabelText('attendance.delete_title'),
    ).not.toBeInTheDocument();
  });

  it('shows the delete button for manager (backend allows it)', () => {
    renderAsRole('manager');
    expect(
      screen.getByLabelText('attendance.delete_title'),
    ).toBeInTheDocument();
  });
});
