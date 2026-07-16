import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StudentModal from '@/components/ui/StudentModal';

// autodrive-0d6: total_price used to pre-fill from a hardcoded constant
// (courseType === 'tezkor' ? 2500000 : 6000000). It now pre-fills from the
// matching Course's real `price`, and stays editable (a discount is still
// legitimate) instead of being locked to that value.

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
vi.mock('@/components/ui/StudentExamsTab', () => ({
  StudentExamsTab: () => null,
}));

const COURSE = {
  id: 'c1',
  name: 'Tezkor kurs',
  branch_id: 'b1',
  course_type: 'tezkor',
  price: 3300000,
  duration_days: 14,
  is_active: true,
  created_at: '2026-01-01',
};

vi.mock('@/services/courseService', () => ({
  useCourses: () => ({ data: [COURSE] }),
}));

const q = (name: string) =>
  document.querySelector(`input[name="${name}"]`) as HTMLInputElement;
const digitsOnly = (v: string) => v.replace(/\D/g, '');

describe('StudentModal total_price pre-fill from Course', () => {
  it('pre-fills total_price from the sole matching active course, not the old hardcoded constant', async () => {
    render(
      <StudentModal
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        courseType="tezkor"
      />,
    );

    await waitFor(() =>
      expect(digitsOnly(q('total_price').value)).toBe('3300000'),
    );
    // Old hardcoded constant for tezkor was 2500000 -- must not win.
    expect(digitsOnly(q('total_price').value)).not.toBe('2500000');
  });

  it('stays editable after pre-fill -- a manual override wins on submit', async () => {
    const onSubmit = vi.fn();
    render(
      <StudentModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        courseType="tezkor"
      />,
    );

    await waitFor(() =>
      expect(digitsOnly(q('total_price').value)).toBe('3300000'),
    );

    fireEvent.change(q('last_name'), { target: { value: 'Karimov' } });
    fireEvent.change(q('first_name'), { target: { value: 'Aziz' } });
    fireEvent.change(q('phone'), { target: { value: '901234567' } });
    fireEvent.change(q('total_price'), { target: { value: '2000000' } });
    expect(digitsOnly(q('total_price').value)).toBe('2000000');

    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].total_price).toBe(2000000);
  });
});
