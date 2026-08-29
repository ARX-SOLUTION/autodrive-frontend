import { screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi, describe, it, expect } from 'vitest';
import StudentsPage from '@/pages/StudentsPage';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// One "Yangi talaba qo'shish" button opens the add flow in QUICK mode; the
// in-dialog "Batafsil" checkbox switches to the DETAILED dialog.

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'owner', branch_id: null }, isOwner: () => true }),
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
    useCreateStudentWithPayment: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdateStudent: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteStudent: () => ({ mutate: vi.fn(), isPending: false }),
    useRestoreStudent: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({ data: [], isLoading: false }),
}));
vi.mock('@/services/operatorService', () => ({
  useOperators: () => ({ data: [], isLoading: false }),
}));

// Stub the two dialogs so we only assert which one is open, and render the
// shared toggle they receive so the checkbox is reachable.
vi.mock('@/components/ui/StudentModal', () => ({
  default: ({
    open,
    detailedToggle,
  }: {
    open: boolean;
    detailedToggle?: ReactNode;
  }) => (open ? <div data-testid="quick-dialog">{detailedToggle}</div> : null),
}));
vi.mock('@/components/ui/AddStudentDialog', () => ({
  default: ({
    open,
    detailedToggle,
  }: {
    open: boolean;
    detailedToggle?: ReactNode;
  }) =>
    open ? <div data-testid="detailed-dialog">{detailedToggle}</div> : null,
}));

const renderPage = () =>
  renderWithRouter(<StudentsPage />, {
    initialEntry: '/students',
    routePattern: '/students',
  });

describe('StudentsPage add flow toggle', () => {
  it('opens quick mode, then switches to detailed via the checkbox', async () => {
    await renderPage();
    expect(screen.queryByTestId('quick-dialog')).toBeNull();
    expect(screen.queryByTestId('detailed-dialog')).toBeNull();

    // exec-dash 4-polish: the empty-state (0 students, per the mock above)
    // now also renders its own "students.add" action in both the table and
    // mobile-list EmptyState, alongside the header's — same accessible name,
    // 3 matches. [0] is the header's button (first in DOM order); all three
    // wire to the same openCreate handler, so any would do.
    fireEvent.click(screen.getAllByRole('button', { name: 'students.add' })[0]);
    expect(screen.getByTestId('quick-dialog')).toBeInTheDocument();
    expect(screen.queryByTestId('detailed-dialog')).toBeNull();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.queryByTestId('quick-dialog')).toBeNull();
    expect(screen.getByTestId('detailed-dialog')).toBeInTheDocument();
  });
});
