import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, afterEach } from 'vitest';
import GroupDetailPage from '@/pages/GroupDetailPage';
import { formatMoney } from '@/lib/money';
import type { UserRole } from '@/types/user';

// Controllable per-test fixture for isLoading/isError/data-not-found split
// below (autodrive-d4j). Starts undefined (vi.hoisted runs before GROUP is
// initialized) -- backfilled to GROUP right after the const, same pattern as
// branch.current in branchDetailPage.test.tsx.
const groupQuery = vi.hoisted(() => ({
  data: undefined as Record<string, unknown> | undefined,
  isLoading: false,
  isError: false,
}));

vi.mock('@/services/groupService', () => ({
  useGroup: () => groupQuery,
}));

// Real useCan/permissions.ts (not mocked) so the payment-amount gating tests
// below (autodrive-vh0.2) exercise the actual CAPABILITIES map. Defaults to
// 'manager' -- irrelevant to the pre-existing error/not-found tests above,
// which short-circuit before the students tab (and this gate) ever renders.
const auth = vi.hoisted(() => ({ role: 'manager' as string }));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: auth.role } }),
}));

vi.mock('@/services/operatorService', () => ({
  useOperators: () => ({ data: [] }),
}));

vi.mock('@/services/studentService', () => ({
  useUpdateStudent: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Heavy modal, not under test here.
vi.mock('@/components/ui/StudentModal', () => ({ default: () => null }));

const GROUP = {
  id: 'g1',
  name: 'B-1',
  branch_id: 'b1',
  branch_name: 'Yunusobod',
  course_type: 'tezkor',
  active_students: 5,
  is_active: true,
  created_at: '2026-07-01T00:00:00.000Z',
  teacher_id: 't1',
  teacher_name: 'Aziz',
  schedule: [],
  students: [],
};
groupQuery.data = GROUP;

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/groups/g1']}>
        <Routes>
          <Route path="/groups/:id" element={<GroupDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  groupQuery.data = GROUP;
  groupQuery.isLoading = false;
  groupQuery.isError = false;
  auth.role = 'manager';
  cleanup();
});

// autodrive-d4j: a real fetch error must not read the same as a genuine
// not-found -- distinct title/icon per EntityDetailShell's isError/
// errorTitle/errorIcon props, same split AuditDetailPage already does.
describe('GroupDetailPage error vs not-found (autodrive-d4j)', () => {
  it('shows the not-found message when the group genuinely does not exist', () => {
    groupQuery.data = undefined;
    groupQuery.isError = false;
    renderPage();
    expect(screen.getByText('common.not_found')).toBeTruthy();
    expect(screen.queryByText('common.error')).toBeNull();
  });

  it('shows the error message, not not-found, on a real fetch error', () => {
    groupQuery.data = undefined;
    groupQuery.isError = true;
    renderPage();
    expect(screen.getByText('common.error')).toBeTruthy();
    expect(screen.queryByText('common.not_found')).toBeNull();
  });
});

// autodrive-vh0.2: teacher must never see payment amounts. The per-student
// debt Field was unconditional, and the pencil "edit" button opened
// StudentModal with an editable amount_paid ("extra payment") input and no
// capability check at all -- gate both on the same caps StudentsTable
// already uses (recordPayment for the amount display, manageStudents for
// the edit affordance).
describe('GroupDetailPage students-tab payment gating (autodrive-vh0.2)', () => {
  const STUDENT = {
    id: 's1',
    last_name: 'Karimov',
    first_name: 'Aziz',
    phone: '+998901234567',
    debt: 500000,
  };

  const openStudentsTab = (role: UserRole) => {
    auth.role = role;
    groupQuery.data = { ...GROUP, students: [STUDENT] };
    renderPage();
    fireEvent.mouseDown(screen.getByText('students.title'));
  };

  it('hides the debt field and edit button for a teacher', () => {
    openStudentsTab('teacher');
    expect(screen.queryByText('students.detail.debt')).toBeNull();
    expect(screen.queryByLabelText('common.edit')).toBeNull();
  });

  it('shows the debt field and edit button for a manager (regression)', () => {
    openStudentsTab('manager');
    expect(screen.getByText('students.detail.debt')).toBeTruthy();
    expect(screen.getByLabelText('common.edit')).toBeTruthy();
  });
});

// autodrive-vh0.5: teacher gets a positive paid/owing signal instead of a
// blank -- has_debt drives a badge in the same roster spot the amount Field
// used to occupy for a payment-visible role, never an amount itself.
describe('GroupDetailPage students-tab debt badge (autodrive-vh0.5)', () => {
  const openStudentsTabWithStudent = (
    role: UserRole,
    student: Record<string, unknown>,
  ) => {
    auth.role = role;
    groupQuery.data = { ...GROUP, students: [student] };
    renderPage();
    fireEvent.mouseDown(screen.getByText('students.title'));
  };

  it('shows the owing badge for a teacher when has_debt is true', () => {
    openStudentsTabWithStudent('teacher', {
      id: 's1',
      last_name: 'Karimov',
      first_name: 'Aziz',
      phone: '+998901234567',
      has_debt: true,
    });
    expect(screen.getByText('students.detail.debt')).toBeTruthy();
    expect(screen.getByText('students.debt_status_owed')).toBeTruthy();
  });

  it('shows the paid badge for a teacher when has_debt is false', () => {
    openStudentsTabWithStudent('teacher', {
      id: 's1',
      last_name: 'Karimov',
      first_name: 'Aziz',
      phone: '+998901234567',
      has_debt: false,
    });
    expect(screen.getByText('students.detail.debt')).toBeTruthy();
    expect(screen.getByText('students.debt_status_paid')).toBeTruthy();
  });

  it('never renders a debt amount for a teacher even when has_debt is true', () => {
    openStudentsTabWithStudent('teacher', {
      id: 's1',
      last_name: 'Karimov',
      first_name: 'Aziz',
      phone: '+998901234567',
      has_debt: true,
      debt: 500000,
    });
    expect(screen.queryByText(formatMoney(500000))).toBeNull();
  });
});

// autodrive-52v.6: debt === 0 (a real, good "fully paid" state) rendered as
// an ambiguous "N/A" in the manager/owner (canViewPayments) amount view --
// indistinguishable from "amount unknown". Distinct from the has_debt-driven
// badge above, which was already correct.
describe('GroupDetailPage students-tab debt amount at exactly 0 (autodrive-52v.6)', () => {
  it('shows "paid", not N/A, for a manager when debt is exactly 0', () => {
    auth.role = 'manager';
    groupQuery.data = {
      ...GROUP,
      students: [
        {
          id: 's1',
          last_name: 'Karimov',
          first_name: 'Aziz',
          phone: '+998901234567',
          debt: 0,
        },
      ],
    };
    renderPage();
    fireEvent.mouseDown(screen.getByText('students.title'));

    expect(screen.getByText('students.debt_status_paid')).toBeTruthy();
    expect(screen.queryByText('common.na')).toBeNull();
  });
});
