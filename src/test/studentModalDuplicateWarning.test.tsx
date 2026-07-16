import {
  render,
  screen,
  fireEvent,
  act,
  cleanup,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';
import StudentModal from '@/components/ui/StudentModal';

// autodrive-553: create-time duplicate check -- a debounced search (phone
// primarily, once enough digits are typed; last name secondarily) against
// GET /students?search=, rendered as a dismissible, non-blocking warning
// panel linking to the match. Debounce timing test follows the convention
// in commandPaletteSearch.test.tsx ("debounces the query by 300ms...").

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
vi.mock('@/components/ui/StudentExamsTab', () => ({
  StudentExamsTab: () => null,
}));

const MATCH = {
  id: 's99',
  last_name: 'Karimov',
  first_name: 'Aziz',
  phone: '+998901234567',
};

const searchSpy = vi.fn();

vi.mock('@/services/studentService', () => ({
  useStudentsPage: (
    _courseType: unknown,
    _branchId: unknown,
    _page: unknown,
    _limit: unknown,
    _operatorId: unknown,
    options: { search: string; enabled: boolean },
  ) => {
    searchSpy(options.search);
    const isMatch =
      options.search === 'Karimov' || options.search === '901234567';
    return {
      data: {
        data: isMatch ? [MATCH] : [],
        meta: { total: isMatch ? 1 : 0 },
      },
      isFetching: false,
    };
  },
}));

const q = (name: string) =>
  document.querySelector(`input[name="${name}"]`) as HTMLInputElement;

const renderModal = () =>
  render(
    <MemoryRouter>
      <StudentModal
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        courseType="tezkor"
      />
    </MemoryRouter>,
  );

describe('StudentModal create-time duplicate warning', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    searchSpy.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('debounces the last-name query by 300ms before it reaches useStudentsPage', () => {
    renderModal();
    fireEvent.change(q('last_name'), { target: { value: 'Karimov' } });

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(searchSpy).not.toHaveBeenCalledWith('Karimov');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(searchSpy).toHaveBeenCalledWith('Karimov');
  });

  it('shows a dismissible warning with a working link when the name matches an existing student', () => {
    renderModal();
    fireEvent.change(q('last_name'), { target: { value: 'Karimov' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('students.duplicate_warning.title')).toBeTruthy();
    const link = screen.getByText('Karimov Aziz · +998901234567').closest('a');
    expect(link).toHaveAttribute('href', '/students/s99');

    fireEvent.click(screen.getByLabelText('common.close'));
    expect(screen.queryByText('students.duplicate_warning.title')).toBeNull();
  });

  it('shows no warning for a genuinely new name', () => {
    renderModal();
    fireEvent.change(q('last_name'), { target: { value: 'Yangi' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByText('students.duplicate_warning.title')).toBeNull();
  });

  it('searches by phone once enough digits are typed, even with no last name', () => {
    renderModal();
    fireEvent.change(q('phone'), { target: { value: '901234567' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText('students.duplicate_warning.title')).toBeTruthy();
  });
});
