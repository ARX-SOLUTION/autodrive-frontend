import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StudentModal from '@/components/ui/StudentModal';

// Uzbekistan phone validation + mask (isValidUzPhone / uzPhoneE164). The field
// must reject a short number and submit the E.164 form for a valid one.

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
vi.mock('@/services/courseService', () => ({
  useCourses: () => ({ data: [] }),
}));
// autodrive-553: StudentModal now also runs a debounced create-time
// duplicate-check query (search-as-you-type on last name / phone).
vi.mock('@/services/studentService', () => ({
  useStudentsPage: () => ({ data: undefined, isFetching: false }),
}));
vi.mock('@/components/ui/StudentExamsTab', () => ({
  StudentExamsTab: () => null,
}));

const q = (name: string) =>
  document.querySelector(`input[name="${name}"]`) as HTMLInputElement;

const setup = () => {
  const onSubmit = vi.fn();
  render(
    <StudentModal
      open
      onClose={vi.fn()}
      onSubmit={onSubmit}
      courseType="tezkor"
    />,
  );
  fireEvent.change(q('last_name'), { target: { value: 'Karimov' } });
  fireEvent.change(q('first_name'), { target: { value: 'Aziz' } });
  return { onSubmit };
};

describe('StudentModal UZ phone validation', () => {
  it('rejects an invalid (too short) phone and blocks submit', async () => {
    const { onSubmit } = setup();
    fireEvent.change(q('phone'), { target: { value: '+998 90 1' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));

    await waitFor(() =>
      expect(screen.getByText('students.phone_invalid')).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('accepts a valid phone and submits it in E.164 form', async () => {
    const { onSubmit } = setup();
    fireEvent.change(q('phone'), { target: { value: '901234567' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.add' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].phone).toBe('+998901234567');
  });
});
