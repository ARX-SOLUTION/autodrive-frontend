import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import PaymentsPage from '@/pages/PaymentsPage';
import type { Payment } from '@/types/payment';

// Characterization tests for PaymentsPage (autodrive decomposition work):
// they capture the page's CURRENT observable behavior and must pass both
// before and after extracting subcomponents into src/pages/payments/.

const { authState, usePaymentsPageMock } = vi.hoisted(() => {
  const authState: {
    user: { role: string; branch_id: string | null } | null;
  } = { user: { role: 'owner', branch_id: null } };
  return { authState, usePaymentsPageMock: vi.fn() };
});

vi.mock('@/store/authStore', () => {
  const useAuthStore = (selector: (s: typeof authState) => unknown) =>
    selector(authState);
  useAuthStore.getState = () => authState;
  return { useAuthStore };
});

vi.mock('@/services/paymentService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/paymentService')>();
  return {
    ...actual,
    fetchAllPayments: vi.fn().mockResolvedValue([]),
    usePaymentsPage: usePaymentsPageMock,
    usePaymentSnapshot: () => ({
      data: {
        today_income: 150000,
        this_month_income: 2000000,
        current_total_debt: 500000,
        students_with_debt: 3,
      },
      isLoading: false,
    }),
    usePaymentSummary: () => ({ data: undefined }),
    useCreatePayment: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({
    data: [{ id: 'b1', name: 'Branch One' }],
    isLoading: false,
  }),
}));

vi.mock('@/components/ui/PaymentModal', () => ({
  default: () => null,
}));

const payment = (over: Partial<Payment> = {}): Payment => ({
  id: 'p1',
  student_id: 's1',
  student_name: 'Aziz Karimov',
  branch_id: 'b1',
  branch_name: 'Branch One',
  course_type: 'avto_maktab',
  total_price: 2000000,
  amount_paid: 1500000,
  remaining_debt: 500000,
  payment_method: 'naqd',
  recorded_by: 'Operator One',
  date: '2026-07-10T12:00:00.000Z',
  created_at: '2026-07-10T12:00:00.000Z',
  ...over,
});

const pageOf = (payments: Payment[]) => ({
  data: { data: payments, meta: { total: payments.length, totalPages: 1 } },
  isLoading: false,
  isFetching: false,
});

const renderPage = (url = '/payments') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <TooltipProvider>
        <PaymentsPage />
      </TooltipProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  authState.user = { role: 'owner', branch_id: null };
  usePaymentsPageMock.mockReset();
  usePaymentsPageMock.mockReturnValue(
    pageOf([
      payment(),
      payment({
        id: 'p2',
        student_id: 's2',
        student_name: 'Bobur Toshev',
        course_type: 'tezkor',
        remaining_debt: 0,
      }),
    ]),
  );
});

describe('PaymentsPage characterization', () => {
  it('renders a row/card per payment from the fetched page', () => {
    renderPage();

    // Both the desktop table and the mobile card list render each payment.
    expect(screen.getAllByText('Aziz Karimov').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bobur Toshev').length).toBeGreaterThan(0);
    // tezkor course renders the "fast" label, avto_maktab the "school" one
    expect(screen.getAllByText('payments.course_fast').length).toBeGreaterThan(
      0,
    );
    // snapshot summary cards render regardless of filters
    expect(screen.getByText('payments.stats.today_income')).toBeInTheDocument();
  });

  it('feeds URL filter params into the payments query', () => {
    renderPage(
      '/payments?branch_id=b9&status=paid&method=karta&course_type=tezkor' +
        '&q=aziz&sort_by=amount_paid&sort_dir=asc&page=2' +
        '&date_from=2026-07-01&date_to=2026-07-10',
    );

    const call = usePaymentsPageMock.mock.calls.at(-1);
    expect(call).toBeDefined();
    const [branchId, courseType, dateFrom, dateTo, page, limit, opts] = call!;
    expect(branchId).toBe('b9');
    expect(courseType).toBe('tezkor');
    expect(dateFrom).toEqual(new Date('2026-07-01'));
    expect(dateTo).toEqual(new Date('2026-07-10'));
    expect(page).toBe(2);
    expect(limit).toBe(50);
    expect(opts).toMatchObject({
      search: 'aziz',
      paymentStatus: 'paid',
      paymentMethod: 'karta',
      sortBy: 'amount_paid',
      sortOrder: 'asc',
    });
  });

  it('renders the explicit empty state when there are no payments', () => {
    usePaymentsPageMock.mockReturnValue(pageOf([]));
    renderPage();

    // EmptyState appears in both the desktop table and mobile list branches.
    expect(screen.getAllByText('payments.not_found').length).toBeGreaterThan(0);
    expect(screen.queryByText('Aziz Karimov')).not.toBeInTheDocument();
  });

  it('shows export + add payment for cross-tenant owner', () => {
    renderPage();

    expect(screen.getByText('payments.export_excel')).toBeInTheDocument();
    expect(screen.getByText('payments.add_payment')).toBeInTheDocument();
  });

  it('hides export and add payment from teacher role', () => {
    authState.user = { role: 'teacher', branch_id: 'b1' };
    renderPage();

    expect(screen.queryByText('payments.export_excel')).not.toBeInTheDocument();
    expect(screen.queryByText('payments.add_payment')).not.toBeInTheDocument();
  });
});
