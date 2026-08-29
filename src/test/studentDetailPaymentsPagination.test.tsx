import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentDetailPage from '@/pages/StudentDetailPage';
import type { Payment } from '@/types/payment';

const { useStudentPaymentsMock } = vi.hoisted(() => ({
  useStudentPaymentsMock: vi.fn(),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ user: { role: 'manager' } }),
}));

vi.mock('@/hooks/useCan', () => ({ useCan: () => true }));

vi.mock('@/services/studentService', () => ({
  useStudent: () => ({
    data: {
      id: 'student-1',
      last_name: 'Karimov',
      first_name: 'Aziz',
      phone: '+998 90 123 45 67',
      branch_name: 'Yunusobod',
      group_name: 'B-1',
      course_type: 'tezkor',
      total_price: 3_000_000,
      amount_paid: 700_000,
      debt: 2_300_000,
      payment_method: 'naqd',
    },
    isLoading: false,
    isError: false,
  }),
  useUpdateStudent: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/services/paymentService', () => ({
  useStudentPayments: useStudentPaymentsMock,
  useCreatePayment: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useDeletePayment: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdatePayment: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
  }),
}));

vi.mock('@/services/operatorService', () => ({
  useOperators: () => ({ data: [] }),
}));

vi.mock('@/services/attendanceService', () => ({
  useAttendanceHistory: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/services/auditService', () => ({
  useAuditLogs: () => ({ data: { data: [] }, isLoading: false }),
}));

vi.mock('@/services/groupService', () => ({
  useGroups: () => ({ data: [] }),
}));

vi.mock('@/components/ui/StudentModal', () => ({ default: () => null }));
vi.mock('@/components/ui/PaymentModal', () => ({ default: () => null }));
vi.mock('@/components/ui/StudentExamsTab', () => ({
  StudentExamsTab: () => null,
}));

const payment = (id: string, recordedBy: string): Payment => ({
  id,
  student_id: 'student-1',
  student_name: 'Karimov Aziz',
  branch_id: 'branch-1',
  branch_name: 'Yunusobod',
  course_type: 'tezkor',
  total_price: 3_000_000,
  amount_paid: 500_000,
  remaining_debt: 2_500_000,
  payment_method: 'naqd',
  recorded_by: recordedBy,
  date: '2026-08-29T10:00:00.000Z',
  created_at: '2026-08-29T10:00:00.000Z',
});

const paymentsPage = (page: number, row: Payment) => ({
  data: {
    data: [row],
    meta: {
      total: 21,
      page,
      limit: 20,
      totalPages: 2,
      hasNextPage: page === 1,
      hasPreviousPage: page === 2,
    },
  },
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
});

describe('StudentDetailPage payments pagination', () => {
  beforeEach(() => {
    useStudentPaymentsMock.mockReset();
    useStudentPaymentsMock.mockImplementation((_studentId: string, page = 1) =>
      page === 2
        ? paymentsPage(2, payment('payment-21', 'Page two operator'))
        : paymentsPage(1, payment('payment-1', 'Page one operator')),
    );
  });

  it('loads and renders the second ledger page when page 2 is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/students/student-1?tab=payments']}>
        <Routes>
          <Route path="/students/:id" element={<StudentDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Page one operator')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2' }));

    await waitFor(() =>
      expect(useStudentPaymentsMock).toHaveBeenLastCalledWith(
        'student-1',
        2,
        20,
      ),
    );
    expect(screen.getByText('Page two operator')).toBeInTheDocument();
    expect(screen.queryByText('Page one operator')).not.toBeInTheDocument();
  });

  it('shows a retryable fetch error instead of the empty ledger state', () => {
    const refetch = vi.fn();
    useStudentPaymentsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });

    render(
      <MemoryRouter initialEntries={['/students/student-1?tab=payments']}>
        <Routes>
          <Route path="/students/:id" element={<StudentDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('common.error')).toBeInTheDocument();
    expect(screen.queryByText('payments.empty')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('common.retry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
