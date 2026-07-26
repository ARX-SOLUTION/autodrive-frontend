import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StudentModal, {
  type CreateStudentPayload,
} from '@/components/ui/StudentModal';

// autodrive-qsgc.3: avto_maktab's completion_date went through
// <Input type="date">. It's now the shared DatePicker (@/lib/calendarDate),
// whose public contract is a plain 'YYYY-MM-DD' string. This proves the
// create-student submit payload carries that exact string, not a Date.

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'manager', branch_id: 'b1' } }),
}));

vi.mock('@/hooks/useCan', () => ({
  // canAssignBranch = false -> branch_id comes from the auth user, skipping
  // the branch Radix Select entirely (same rationale as AddStudentDialog's
  // test and this repo's PersonModal.test.tsx precedent).
  useCan: () => false,
}));

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({ data: [{ id: 'b1', name: 'Branch 1' }] }),
}));
vi.mock('@/services/courseService', () => ({
  useCourses: () => ({ data: [] }),
}));
vi.mock('@/services/groupService', () => ({
  useGroups: () => ({ data: [] }),
}));
vi.mock('@/services/studentService', () => ({
  useStudentsPage: () => ({ data: undefined }),
}));

afterEach(cleanup);

const q = (name: string) =>
  document.querySelector(`input[name="${name}"]`) as HTMLInputElement;

describe('StudentModal calendar-date wiring (autodrive-qsgc.3)', () => {
  it('submits completion_date as a YYYY-MM-DD string, never a Date', async () => {
    const onSubmit = vi.fn();
    render(
      <StudentModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        loading={false}
        courseType="avto_maktab"
      />,
    );

    fireEvent.change(q('last_name'), { target: { value: 'Ivanov' } });
    fireEvent.change(q('first_name'), { target: { value: 'Ivan' } });
    fireEvent.change(q('phone'), { target: { value: '901234567' } });

    const completionDateInput = q('completion_date');
    fireEvent.change(completionDateInput, {
      target: { value: '2026-06-15' },
    });
    fireEvent.blur(completionDateInput);

    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0] as CreateStudentPayload;

    expect(payload.completion_date).toBe('2026-06-15');
    expect(typeof payload.completion_date).toBe('string');

    // Wire proof: JSON must carry the bare calendar date, never a datetime.
    const wire = JSON.parse(JSON.stringify(payload)) as CreateStudentPayload;
    expect(wire.completion_date).toBe('2026-06-15');
  });

  it('omits completion_date when left empty (never emits an empty-string wire value)', async () => {
    const onSubmit = vi.fn();
    render(
      <StudentModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        loading={false}
        courseType="avto_maktab"
      />,
    );

    fireEvent.change(q('last_name'), { target: { value: 'Petrov' } });
    fireEvent.change(q('first_name'), { target: { value: 'Petr' } });
    fireEvent.change(q('phone'), { target: { value: '911234567' } });

    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0] as CreateStudentPayload;
    expect(payload.completion_date).toBeUndefined();
  });
});
