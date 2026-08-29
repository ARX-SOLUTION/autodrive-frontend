import { screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import StudentsPage from '@/pages/StudentsPage';
import { formatMoney } from '@/lib/money';
import { renderWithRouter } from '@/test/utils/renderWithRouter';

// Characterization tests for the StudentsPage decomposition (route file →
// src/pages/students/* subcomponents). They pin CURRENT observable behavior:
//  1. rows/cards render from mocked list data (desktop table + mobile card)
//  2. URL filter params drive the useStudentsPage fetch args
//  3. explicit empty state (not a blank table) when the list is empty
//  4. role gating: teacher sees no add/edit/delete controls, nor payment
//     amounts (price columns, Excel export) — autodrive-vh0.2. The debt
//     column becomes a paid/owing badge instead of an amount — autodrive-vh0.5
// They must pass unmodified before AND after the decomposition.

const h = vi.hoisted(() => ({
  user: { role: 'owner', branch_id: null as string | null },
  useStudentsPage: vi.fn(),
}));

const STUDENTS = [
  {
    id: 's1',
    last_name: 'KARIMOV',
    first_name: 'aziz',
    phone: '+998901234567',
    total_price: 3000000,
    course_type: 'tezkor',
    branch_id: 'b1',
    branch_name: 'Chilonzor',
    group_name: 'G-12',
    payment_method: 'naqd',
    debt: 500000,
    has_document: true,
    result: 'oqimoqda',
    created_at: '2026-07-01T00:00:00.000Z',
    amount_paid: 2500000,
  },
  {
    id: 's2',
    last_name: 'RAHIMOVA',
    first_name: 'malika',
    phone: '+998907654321',
    total_price: 3000000,
    course_type: 'tezkor',
    branch_id: 'b1',
    branch_name: 'Chilonzor',
    group_name: 'G-12',
    payment_method: 'karta',
    debt: 0,
    has_document: true,
    result: 'topshirdi',
    created_at: '2026-07-02T00:00:00.000Z',
    amount_paid: 3000000,
  },
];

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      user: h.user,
      isOwner: () => h.user.role === 'owner',
    }),
}));

vi.mock('@/services/studentService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/studentService')>();
  return {
    ...actual,
    fetchAllStudents: vi.fn(),
    useStudentsPage: h.useStudentsPage,
    useCreateStudent: () => ({ mutate: vi.fn(), isPending: false }),
    useCreateStudentWithPayment: () => ({
      mutate: vi.fn(),
      isPending: false,
    }),
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

vi.mock('@/components/ui/StudentModal', () => ({ default: () => null }));
vi.mock('@/components/ui/AddStudentDialog', () => ({ default: () => null }));

vi.mock('@/services/courseService', () => ({
  useCourses: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/services/groupService', () => ({
  useGroups: () => ({ data: [], isLoading: false, refetch: vi.fn() }),
}));

const renderPage = (initialEntry = '/students') =>
  renderWithRouter(<StudentsPage />, {
    initialEntry,
    routePattern: '/students',
  });

const pageOf = (students: typeof STUDENTS) => ({
  data: students,
  meta: { total: students.length, totalPages: 1 },
});

beforeEach(() => {
  h.user = { role: 'owner', branch_id: null };
  h.useStudentsPage.mockReset().mockReturnValue({
    data: pageOf([]),
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  });
});

describe('StudentsPage characterization', () => {
  it('renders desktop rows and mobile cards from list data', async () => {
    h.useStudentsPage.mockReturnValue({
      data: pageOf(STUDENTS),
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
    await renderPage();

    // Desktop table cells (names capitalized).
    expect(screen.getAllByText('Karimov').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rahimova').length).toBeGreaterThan(0);
    // Mobile DataCard titles ("First Last").
    expect(screen.getByText('Aziz Karimov')).toBeInTheDocument();
    expect(screen.getByText('Malika Rahimova')).toBeInTheDocument();
    // Localized result labels, not raw enum values.
    expect(screen.queryAllByText('oqimoqda').length).toBe(0);
    expect(
      screen.getAllByText('students.status_studying').length,
    ).toBeGreaterThan(0);
    // Owner sees edit (manageStudents) and delete (cross-tenant) actions.
    expect(screen.getAllByLabelText('common.edit').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('common.delete').length).toBeGreaterThan(0);
    // Header count line reflects the meta total.
    expect(screen.getByText('students.count')).toBeInTheDocument();
  });

  it('feeds URL filter params into the students fetch', async () => {
    await renderPage(
      '/students?course_type=avto_maktab&branch_id=b9&operator_id=op7' +
        '&q=aziz&status=active&has_debt=true&has_group=false' +
        '&date_from=2026-07-01&date_to=2026-07-03',
    );

    const last = h.useStudentsPage.mock.calls.at(-1)!;
    expect(last[0]).toBe('avto_maktab'); // courseType
    expect(last[1]).toBe('b9'); // branchId
    expect(last[4]).toBe('op7'); // operatorId
    expect(last[5]).toMatchObject({
      search: 'aziz',
      status: 'active',
      hasDebt: true,
      hasGroup: false,
    });
    expect(last[5].dateFrom).toBeInstanceOf(Date);
    expect(last[5].dateTo).toBeInstanceOf(Date);

    // avto_maktab course type switches the desktop table columns.
    expect(screen.getByText('students.contract_number')).toBeInTheDocument();
    expect(screen.getByText('students.o83')).toBeInTheDocument();
  });

  it('renders the explicit empty state, not a blank table', async () => {
    await renderPage();

    // Both the desktop table body and the mobile list show the empty state.
    expect(screen.getAllByText('students.not_found').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('students.not_found_desc').length,
    ).toBeGreaterThan(0);
    // Table chrome still renders (headers present).
    expect(screen.getByText('students.last_name')).toBeInTheDocument();
  });

  it('hides manage controls for a teacher (role gating)', async () => {
    h.user = { role: 'teacher', branch_id: 'b1' };
    h.useStudentsPage.mockReturnValue({
      data: pageOf(STUDENTS),
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
    await renderPage();

    // Rows still render...
    expect(screen.getAllByText('Karimov').length).toBeGreaterThan(0);
    // ...but no add (manageStudents) or edit/delete controls.
    expect(screen.queryByRole('button', { name: 'students.add' })).toBeNull();
    expect(screen.queryAllByLabelText('common.edit').length).toBe(0);
    expect(screen.queryAllByLabelText('common.delete').length).toBe(0);
    // autodrive-vh0.2: export embeds total_price/debt in every row -- a
    // teacher (no recordPayment) must not see the button at all.
    expect(
      screen.queryByRole('button', { name: /students\.export_excel/ }),
    ).toBeNull();
    // autodrive-vh0.5: the debt column header stays (it's now a paid/owing
    // badge slot, not dropped), but this fixture has no has_debt so neither
    // badge state renders, and the amount never leaks.
    expect(screen.getByText('students.debt')).toBeInTheDocument();
    expect(screen.queryByText('students.debt_status_owed')).toBeNull();
    expect(screen.queryByText('students.debt_status_paid')).toBeNull();
    expect(screen.queryByText(formatMoney(500000))).toBeNull();
  });

  // autodrive-52v.3: deleting the last row of the last page left currentPage
  // pointing past the new (shrunk) totalPages -- the page silently kept
  // requesting a page that no longer exists. Same clamp GroupsPage already
  // had; StudentsPage, PaymentsPage and UsersPage didn't.
  it('hydrates page and filters before the first list query', async () => {
    h.useStudentsPage.mockReturnValue({
      data: { data: [], meta: { total: 100, totalPages: 3 } },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });

    await renderPage('/students?page=2&q=aziz&has_group=false');

    const firstCall = h.useStudentsPage.mock.calls[0];
    expect(firstCall[2]).toBe(2);
    expect(firstCall[5]).toMatchObject({ search: 'aziz', hasGroup: false });
    expect(h.useStudentsPage.mock.calls.every((call) => call[2] === 2)).toBe(
      true,
    );
  });

  it('clamps currentPage back to 1 once totalPages shrinks below the URL page', async () => {
    h.useStudentsPage.mockReturnValue({
      data: { data: [], meta: { total: 0, totalPages: 1 } },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
    await renderPage('/students?page=3');

    await waitFor(() => {
      const last = h.useStudentsPage.mock.calls.at(-1)!;
      expect(last[2]).toBe(1); // currentPage (3rd positional arg), clamped from 3
    });
  });
});
