import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import StudentsPage from '@/pages/StudentsPage';

// Picked local calendar days, exactly as react-day-picker would hand them to
// onSelect (local midnight). Using the local Date constructor means these are
// "July 10"/"July 12" regardless of which timezone the test runner itself is
// in -- a separate bug only reproduces for positive UTC offsets (e.g.
// Tashkent, UTC+5), where `.toISOString().slice(0, 10)` rolls it back a day.
// Distinct from/to days also catch autodrive-6cq.5.70 (two sequential
// setSearchParams calls, second overwriting the first).
const PICKED_FROM = new Date(2026, 6, 10);
const PICKED_TO = new Date(2026, 6, 12);

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      user: { role: 'owner', branch_id: null },
      isOwner: () => true,
    }),
}));

vi.mock('@/services/studentService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/studentService')>();
  return {
    ...actual,
    fetchAllStudents: vi.fn(),
    useStudentsPage: () => ({
      data: { data: [], meta: { total: 0, totalPages: 1 } },
      isLoading: false,
    }),
    useCreateStudent: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdateStudent: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteStudent: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/services/operatorService', () => ({
  useOperators: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/components/ui/StudentModal', () => ({
  default: () => null,
}));

vi.mock('@/components/ui/ImportStudentsModal', () => ({
  default: () => null,
}));

// Stand in for react-day-picker: a single button that reports the same
// kind of local-midnight Date a real day click would produce.
vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({
    onSelect,
  }: {
    onSelect: (range: { from: Date; to: Date }) => void;
  }) => (
    <button onClick={() => onSelect({ from: PICKED_FROM, to: PICKED_TO })}>
      pick-day
    </button>
  ),
}));

const SearchParamsSpy = () => {
  const [params] = useSearchParams();
  return <div data-testid="search-params">{params.toString()}</div>;
};

describe('StudentsPage date-range filter', () => {
  it('writes both the picked local calendar days to the URL in one update', () => {
    render(
      <MemoryRouter initialEntries={['/students']}>
        <StudentsPage />
        <SearchParamsSpy />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('students.date_range'));
    fireEvent.click(screen.getByText('pick-day'));

    // date_from and date_to must both survive: onSelect batches them into
    // one setSearchParams call (autodrive-6cq.5.70) using local calendar
    // days, not UTC-shifted ones (autodrive-6cq.5.30).
    const params = screen.getByTestId('search-params').textContent ?? '';
    expect(params).toContain('date_from=2026-07-10');
    expect(params).toContain('date_to=2026-07-12');
  });
});
