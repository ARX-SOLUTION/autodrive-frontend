import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import StudentsPage from '@/pages/StudentsPage';

// Picked local calendar day, exactly as react-day-picker would hand it to
// onSelect (local midnight). Using the local Date constructor means this is
// "July 10" regardless of which timezone the test runner itself is in --
// the bug only reproduces for positive UTC offsets (e.g. Tashkent, UTC+5),
// where `.toISOString().slice(0, 10)` rolls it back to July 9.
const PICKED_DAY = new Date(2026, 6, 10);

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
    <button onClick={() => onSelect({ from: PICKED_DAY, to: PICKED_DAY })}>
      pick-day
    </button>
  ),
}));

const SearchParamsSpy = () => {
  const [params] = useSearchParams();
  return <div data-testid="search-params">{params.toString()}</div>;
};

describe('StudentsPage date-range filter', () => {
  it('writes the picked local calendar day to the URL, not a UTC-shifted day', () => {
    render(
      <MemoryRouter initialEntries={['/students']}>
        <StudentsPage />
        <SearchParamsSpy />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('students.date_range'));
    fireEvent.click(screen.getByText('pick-day'));

    // NOTE: onSelect calls setDateFrom then setDateTo synchronously; a
    // separate pre-existing bug in react-router's setSearchParams means
    // only the LAST call's URL update survives (see autodrive-6cq.5.70,
    // filed separately -- out of scope here). date_to is what's left, so
    // that's what proves the timezone conversion itself is correct.
    const params = screen.getByTestId('search-params').textContent ?? '';
    expect(params).toContain('date_to=2026-07-10');
  });
});
