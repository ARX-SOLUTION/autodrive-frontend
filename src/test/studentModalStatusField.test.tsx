import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StudentModal from '@/components/ui/StudentModal';
import type { Student } from '@/types/student';

// autodrive-rz3.1: Student.status was already modelled end-to-end (zod
// schema, defaults, load-from-student, submit payload) but no FormField
// ever rendered it -- every student was stuck 'active' forever. This locks
// in the fix: the control shows up in edit mode (and only edit mode) and a
// changed value reaches onSubmit.

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'operator', branch_id: 'b1' } }),
}));
vi.mock('@/hooks/useCan', () => ({ useCan: () => false }));
vi.mock('@/services/branchService', () => ({
  useBranches: () => ({ data: [] }),
}));
vi.mock('@/services/groupService', () => ({
  useGroups: () => ({ data: [], refetch: vi.fn() }),
}));
vi.mock('@/services/studentService', () => ({
  useStudentsPage: () => ({ data: undefined, isFetching: false }),
}));
vi.mock('@/services/courseService', () => ({
  useCourses: () => ({ data: [] }),
}));

const STUDENT: Student = {
  id: 's1',
  last_name: 'Karimov',
  first_name: 'Aziz',
  phone: '+998901234567',
  course_type: 'tezkor',
  branch_id: 'b1',
  payment_method: 'naqd',
  has_document: true,
  result: 'oqimoqda',
  created_at: '2026-01-01',
  status: 'active',
  total_price: 1000000,
  debt: 0,
};

const pickSelectOption = (labelText: string, optionText: string) => {
  fireEvent.click(screen.getByLabelText(labelText));
  fireEvent.click(within(screen.getByRole('listbox')).getByText(optionText));
};

describe('StudentModal status field (autodrive-rz3.1)', () => {
  it('renders the status control in edit mode and sends a changed value on submit', async () => {
    const onSubmit = vi.fn();
    render(
      <StudentModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        student={STUDENT}
        courseType="tezkor"
      />,
    );

    await waitFor(() =>
      expect(screen.getByLabelText('students.status')).toBeInTheDocument(),
    );
    pickSelectOption('students.status', 'students.status_dropped');

    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].status).toBe('dropped');
  });

  it('does not render the status control in create mode (a new student is always active)', async () => {
    render(
      <StudentModal
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        courseType="tezkor"
      />,
    );

    await waitFor(() =>
      expect(screen.getByLabelText('students.result')).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText('students.status')).not.toBeInTheDocument();
  });
});
