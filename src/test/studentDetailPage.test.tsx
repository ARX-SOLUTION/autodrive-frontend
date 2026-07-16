import {
  render,
  screen,
  cleanup,
  fireEvent,
  within,
} from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';
import StudentDetailPage from '@/pages/StudentDetailPage';

// W15: the "To'lovlar" (payments) tab must be hidden for teachers — GET
// /payments excludes teacher, so the tab is gated on the recordPayment
// capability rather than widening the payments endpoint's roles.

const auth = vi.hoisted(() => ({ role: 'manager' as string }));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: auth.role } }),
}));

// Controllable per-test fixture for the group history tab (autodrive
// "Guruh tarixi") — group-change audit entries for student s1.
const auditMock = vi.hoisted(() => ({ logs: [] as Record<string, unknown>[] }));

vi.mock('@/services/auditService', () => ({
  useAuditLogs: () => ({
    data: { data: auditMock.logs },
    isLoading: false,
  }),
}));

vi.mock('@/services/groupService', () => ({
  useGroups: () => ({ data: [{ id: 'g1', name: 'B-1' }] }),
}));

// Controllable per-test fixture for isLoading/isError/data-not-found split
// below (autodrive-d4j). Starts undefined (vi.hoisted runs before STUDENT is
// initialized) -- backfilled to STUDENT right after the const, same as
// branch.current in branchDetailPage.test.tsx.
const studentQuery = vi.hoisted(() => ({
  data: undefined as Record<string, unknown> | undefined,
  isLoading: false,
  isError: false,
}));

vi.mock('@/services/studentService', () => ({
  useStudent: () => studentQuery,
  useUpdateStudent: () => ({ mutate: vi.fn(), isPending: false }),
}));

const STUDENT = {
  id: 's1',
  last_name: 'Karimov',
  first_name: 'Aziz',
  phone: '+998 90 123 45 67',
  branch_name: 'Yunusobod',
  group_name: 'B-1',
  course_type: 'tezkor',
  total_price: 3000000,
  debt: 1200000,
  referrals_count: 2,
};
studentQuery.data = STUDENT;

const paymentMocks = vi.hoisted(() => ({
  deleteMutate: vi.fn(),
  updateMutate: vi.fn(),
}));

const PAYMENT_ROW = {
  id: 'p1',
  student_id: 's1',
  student_name: 'Karimov Aziz',
  branch_id: 'b1',
  branch_name: 'Yunusobod',
  course_type: 'tezkor',
  total_price: 3000000,
  amount_paid: 500000,
  remaining_debt: 700000,
  payment_method: 'naqd',
  recorded_by: 'Nigora',
  date: '2026-07-08',
  created_at: '2026-07-08',
};

vi.mock('@/services/paymentService', () => ({
  useStudentPayments: () => ({
    data: { data: [PAYMENT_ROW] },
    isLoading: false,
  }),
  useCreatePayment: () => ({ mutate: vi.fn(), isPending: false }),
  useDeletePayment: () => ({
    mutate: paymentMocks.deleteMutate,
    isPending: false,
  }),
  useUpdatePayment: () => ({
    mutate: paymentMocks.updateMutate,
    isPending: false,
  }),
}));

vi.mock('@/services/operatorService', () => ({
  useOperators: () => ({ data: [] }),
}));

vi.mock('@/services/attendanceService', () => ({
  useAttendanceHistory: () => ({
    data: [
      { id: 'a1', date: '2026-07-09', group_name: 'B-1', status: 'present' },
      { id: 'a2', date: '2026-07-02', group_name: 'B-1', status: 'absent' },
    ],
    isLoading: false,
  }),
}));

// Keep the heavy modals / exam tab out of the render.
vi.mock('@/components/ui/StudentModal', () => ({ default: () => null }));

// PaymentModal is mocked out (kept out of the render like StudentModal) but
// still captures the last props it was called with, so the payments-tab
// edit action's wiring (open + payment prop) can be asserted without
// rendering the real modal -- PaymentModal's own edit-mode behavior is
// covered directly in paymentModalConfirmations.test.tsx.
const capturedPaymentModalProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));
vi.mock('@/components/ui/PaymentModal', () => ({
  default: (props: Record<string, unknown>) => {
    capturedPaymentModalProps.current = props;
    return null;
  },
}));

vi.mock('@/components/ui/StudentExamsTab', () => ({
  StudentExamsTab: () => null,
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/students/s1']}>
      <Routes>
        <Route path="/students/:id" element={<StudentDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

afterEach(() => {
  studentQuery.data = STUDENT;
  studentQuery.isLoading = false;
  studentQuery.isError = false;
  cleanup();
});

describe('StudentDetailPage payments-tab gating', () => {
  it('shows the payments tab for a manager', () => {
    auth.role = 'manager';
    renderPage();
    expect(screen.getByText('Karimov Aziz')).toBeTruthy();
    expect(screen.getByText('students.detail.tab_payments')).toBeTruthy();
  });

  it('hides the payments tab for a teacher', () => {
    auth.role = 'teacher';
    renderPage();
    expect(screen.getByText('Karimov Aziz')).toBeTruthy();
    expect(screen.queryByText('students.detail.tab_payments')).toBeNull();
  });
});

// autodrive-6ef.26: read-only attendance history tab, visible to every role
// (unlike payments, which is gated on the recordPayment capability).
describe('StudentDetailPage attendance history tab', () => {
  it('shows the attendance tab for a teacher too', () => {
    auth.role = 'teacher';
    renderPage();
    expect(screen.getByText('students.detail.tab_attendance')).toBeTruthy();
  });

  it('lists attendance records with date, group and status', () => {
    auth.role = 'manager';
    renderPage();
    // Radix Tabs switches on mousedown (see TabsTrigger), not click — a bare
    // fireEvent.click never fires the mousedown that triggers onValueChange.
    fireEvent.mouseDown(screen.getByText('students.detail.tab_attendance'));
    expect(screen.getByText('2026-07-09')).toBeTruthy();
    expect(screen.getByText('attendance.status_present')).toBeTruthy();
    expect(screen.getByText('attendance.status_absent')).toBeTruthy();
    expect(screen.getAllByText('B-1').length).toBeGreaterThan(0);
  });
});

describe('StudentDetailPage referrals_count Field', () => {
  it('links the referral count to the filtered students list', () => {
    auth.role = 'manager';
    renderPage();
    const link = screen.getByText('2').closest('a');
    expect(link?.getAttribute('href')).toBe(
      '/students?referred_by_student_id=s1',
    );
  });
});

// Regression test for autodrive-f9u.12: Student.payment_method is nullable
// on the backend (a student may never have made a payment), but was typed
// non-null on the frontend -- methodLabels[student.payment_method] rendered
// blank with no compile-time warning for exactly this STUDENT fixture,
// which has never set payment_method.
describe('StudentDetailPage payment_method null-safety (autodrive-f9u.12)', () => {
  it('shows a fallback instead of a blank value when payment_method is unset', () => {
    auth.role = 'manager';
    renderPage();
    expect(screen.getAllByText('common.na').length).toBeGreaterThan(0);
  });
});

// Group history tab: owner + manager only (broader than the standalone
// AuditLogPage's owner/dev-only OwnerRoute, per this task's decision), and
// entries are client-filtered down to changes.groupId.
describe('StudentDetailPage group history tab gating', () => {
  it('shows the group history tab for a manager', () => {
    auth.role = 'manager';
    auditMock.logs = [];
    renderPage();
    expect(screen.getByText('students.detail.tab_group_history')).toBeTruthy();
  });

  it('shows the group history tab for an owner', () => {
    auth.role = 'owner';
    auditMock.logs = [];
    renderPage();
    expect(screen.getByText('students.detail.tab_group_history')).toBeTruthy();
  });

  it('hides the group history tab for an operator', () => {
    auth.role = 'operator';
    auditMock.logs = [];
    renderPage();
    expect(screen.queryByText('students.detail.tab_group_history')).toBeNull();
  });

  it('hides the group history tab for a teacher', () => {
    auth.role = 'teacher';
    auditMock.logs = [];
    renderPage();
    expect(screen.queryByText('students.detail.tab_group_history')).toBeNull();
  });
});

describe('StudentDetailPage group history tab content', () => {
  it('resolves group names, ignores non-groupId changes, and falls back for no-group/deleted-group', () => {
    auth.role = 'manager';
    auditMock.logs = [
      {
        id: 'al1',
        action: 'UPDATE',
        entity: 'student',
        entity_id: 's1',
        user_id: 'u1',
        user_name: 'Nigora',
        user_role: 'operator',
        branch_id: 'b1',
        company_id: 'c1',
        changes: { groupId: { from: null, to: 'g1' } },
        created_at: '2026-07-10T10:00:00.000Z',
      },
      {
        id: 'al2',
        action: 'UPDATE',
        entity: 'student',
        entity_id: 's1',
        user_id: 'u2',
        user_name: 'Aziz',
        user_role: 'manager',
        branch_id: 'b1',
        company_id: 'c1',
        // g-deleted no longer resolves in the groups fixture (group removed).
        changes: { groupId: { from: 'g1', to: 'g-deleted' } },
        created_at: '2026-07-12T10:00:00.000Z',
      },
      {
        id: 'al3',
        action: 'UPDATE',
        entity: 'student',
        entity_id: 's1',
        user_id: 'u2',
        user_name: 'Aziz',
        user_role: 'manager',
        branch_id: 'b1',
        company_id: 'c1',
        // No groupId sub-key -- must be filtered out entirely.
        changes: { notes: { from: 'a', to: 'b' } },
        created_at: '2026-07-13T10:00:00.000Z',
      },
    ];
    renderPage();
    fireEvent.mouseDown(screen.getByText('students.detail.tab_group_history'));

    expect(screen.getByText('students.no_group → B-1')).toBeTruthy();
    expect(screen.getByText('B-1 → common.na')).toBeTruthy();
    expect(screen.getByText('Nigora')).toBeTruthy();
    expect(screen.queryByText('2026-07-13')).toBeNull();
  });

  it('shows the empty state when there is no group-change history', () => {
    auth.role = 'manager';
    auditMock.logs = [];
    renderPage();
    fireEvent.mouseDown(screen.getByText('students.detail.tab_group_history'));
    expect(
      screen.getByText('students.detail.group_history_empty'),
    ).toBeTruthy();
  });
});

// autodrive-9e4.5: the previously read-only payments ledger now gets the
// same delete/edit row actions as PaymentsTable, gated on the same
// recordPayment capability that already gates the tab itself.
describe('StudentDetailPage payments-tab row actions', () => {
  beforeEach(() => {
    paymentMocks.deleteMutate.mockClear();
    paymentMocks.updateMutate.mockClear();
    capturedPaymentModalProps.current = null;
  });

  const openPaymentsTab = () => {
    auth.role = 'manager';
    renderPage();
    fireEvent.mouseDown(screen.getByText('students.detail.tab_payments'));
  };

  it('confirms, then calls useDeletePayment.mutate with the row id', () => {
    openPaymentsTab();

    fireEvent.click(screen.getByLabelText('common.delete'));
    const dialog = screen
      .getByText('payments.delete_confirm_title')
      .closest('[role="dialog"]') as HTMLElement;
    fireEvent.click(within(dialog).getByText('common.delete'));

    expect(paymentMocks.deleteMutate).toHaveBeenCalledTimes(1);
    expect(paymentMocks.deleteMutate.mock.calls[0][0]).toBe('p1');
  });

  it('opens PaymentModal in edit mode with the clicked row', () => {
    openPaymentsTab();

    fireEvent.click(screen.getByLabelText('common.edit'));

    expect(capturedPaymentModalProps.current?.open).toBe(true);
    expect(
      (capturedPaymentModalProps.current?.payment as { id: string })?.id,
    ).toBe('p1');
  });
});

// autodrive-d4j: a real fetch error must not read the same as a genuine
// not-found -- distinct title (and icon) per EntityDetailShell's isError/
// errorTitle/errorIcon props, same split AuditDetailPage already does.
describe('StudentDetailPage error vs not-found (autodrive-d4j)', () => {
  it('shows the not-found message when the student genuinely does not exist', () => {
    studentQuery.data = undefined;
    studentQuery.isError = false;
    renderPage();
    expect(screen.getByText('common.not_found')).toBeTruthy();
    expect(screen.queryByText('common.error')).toBeNull();
  });

  it('shows the error message, not not-found, on a real fetch error', () => {
    studentQuery.data = undefined;
    studentQuery.isError = true;
    renderPage();
    expect(screen.getByText('common.error')).toBeTruthy();
    expect(screen.queryByText('common.not_found')).toBeNull();
  });
});
