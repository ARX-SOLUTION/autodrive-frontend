import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, afterEach } from 'vitest';
import StudentDetailPage from '@/pages/StudentDetailPage';

// W15: the "To'lovlar" (payments) tab must be hidden for teachers — GET
// /payments excludes teacher, so the tab is gated on the recordPayment
// capability rather than widening the payments endpoint's roles.

const auth = vi.hoisted(() => ({ role: 'manager' as string }));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { role: auth.role } }),
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

vi.mock('@/services/studentService', () => ({
  useStudent: () => ({ data: STUDENT, isLoading: false, isError: false }),
  useUpdateStudent: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/services/paymentService', () => ({
  useStudentPayments: () => ({
    data: {
      data: [
        {
          id: 'p1',
          amount_paid: 500000,
          payment_method: 'naqd',
          recorded_by: 'Nigora',
          date: '2026-07-08',
        },
      ],
    },
    isLoading: false,
  }),
  useCreatePayment: () => ({ mutate: vi.fn(), isPending: false }),
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
vi.mock('@/components/ui/PaymentModal', () => ({ default: () => null }));
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

afterEach(cleanup);

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
