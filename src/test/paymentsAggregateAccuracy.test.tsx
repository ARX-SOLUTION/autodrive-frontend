import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import PaymentsPage from '@/pages/PaymentsPage';
import type { PaymentSnapshot, PaymentSummary } from '@/types/payment';

const { aggregateState, snapshotRefetch, summaryRefetch } = vi.hoisted(() => ({
  aggregateState: {
    snapshot: undefined as PaymentSnapshot | undefined,
    snapshotLoading: false,
    snapshotError: false,
    summary: undefined as PaymentSummary | undefined,
    summaryLoading: false,
    summaryError: false,
  },
  snapshotRefetch: vi.fn(),
  summaryRefetch: vi.fn(),
}));

vi.mock('@/store/authStore', () => {
  const state = { user: { role: 'owner', branch_id: null } };
  const useAuthStore = (selector: (value: typeof state) => unknown) =>
    selector(state);
  useAuthStore.getState = () => state;
  return { useAuthStore };
});

vi.mock('@/services/paymentService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/paymentService')>();
  return {
    ...actual,
    usePaymentsPage: () => ({
      data: { data: [], meta: { total: 0, totalPages: 1 } },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    }),
    usePaymentSnapshot: () => ({
      data: aggregateState.snapshot,
      isLoading: aggregateState.snapshotLoading,
      isError: aggregateState.snapshotError,
      refetch: snapshotRefetch,
    }),
    usePaymentSummary: () => ({
      data: aggregateState.summary,
      isLoading: aggregateState.summaryLoading,
      isError: aggregateState.summaryError,
      refetch: summaryRefetch,
    }),
    useCreatePayment: () => ({ mutate: vi.fn(), isPending: false }),
    useDeletePayment: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdatePayment: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

vi.mock('@/services/branchService', () => ({
  useBranches: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/components/ui/PaymentModal', () => ({
  default: () => null,
}));

const renderFilteredPage = () =>
  render(
    <MemoryRouter initialEntries={['/payments?status=paid']}>
      <TooltipProvider>
        <PaymentsPage />
      </TooltipProvider>
    </MemoryRouter>,
  );

const aggregateSection = (heading: string): HTMLElement => {
  const section = screen
    .getByRole('heading', { name: heading })
    .closest('section');
  if (!section) throw new Error(`Missing aggregate section: ${heading}`);
  return section;
};

beforeEach(() => {
  aggregateState.snapshot = undefined;
  aggregateState.snapshotLoading = false;
  aggregateState.snapshotError = false;
  aggregateState.summary = undefined;
  aggregateState.summaryLoading = false;
  aggregateState.summaryError = false;
  snapshotRefetch.mockReset();
  summaryRefetch.mockReset();
});

afterEach(cleanup);

describe('payment aggregate accuracy states', () => {
  it('shows skeletons instead of authoritative zeroes while aggregate data is missing', () => {
    aggregateState.snapshotLoading = true;
    aggregateState.summaryLoading = true;

    renderFilteredPage();

    const snapshot = aggregateSection('payments.current_status');
    const summary = aggregateSection('payments.selected_results');

    expect(snapshot.querySelectorAll('.animate-pulse')).toHaveLength(4);
    expect(summary.querySelectorAll('.animate-pulse')).toHaveLength(3);
    expect(within(snapshot).queryByText("0 so'm")).not.toBeInTheDocument();
    expect(within(summary).queryByText("0 so'm")).not.toBeInTheDocument();
    expect(
      within(snapshot).queryByText(/^0 common\.count_unit$/),
    ).not.toBeInTheDocument();
    expect(
      within(summary).queryByText(/^0 common\.count_unit$/),
    ).not.toBeInTheDocument();
  });

  it('shows independent aggregate errors and retries the failed queries', () => {
    aggregateState.snapshotError = true;
    aggregateState.summaryError = true;

    renderFilteredPage();

    const snapshot = aggregateSection('payments.current_status');
    const summary = aggregateSection('payments.selected_results');

    expect(within(snapshot).getByText('common.error')).toBeInTheDocument();
    expect(within(summary).getByText('common.error')).toBeInTheDocument();

    fireEvent.click(
      within(snapshot).getByRole('button', { name: 'common.retry' }),
    );
    fireEvent.click(
      within(summary).getByRole('button', { name: 'common.retry' }),
    );

    expect(snapshotRefetch).toHaveBeenCalledTimes(1);
    expect(summaryRefetch).toHaveBeenCalledTimes(1);
  });

  it('keeps a legitimate aggregate zero visible once data exists', () => {
    aggregateState.snapshot = {
      today_income: 0,
      this_month_income: 0,
      current_total_debt: 0,
      students_with_debt: 0,
    };
    aggregateState.summary = {
      period_collected: 0,
      period_payments_count: 0,
      period_debt: 0,
    };

    renderFilteredPage();

    const snapshot = aggregateSection('payments.current_status');
    const summary = aggregateSection('payments.selected_results');

    expect(within(snapshot).getAllByText("0 so'm")).toHaveLength(3);
    expect(
      within(snapshot).getByText('0 common.count_unit'),
    ).toBeInTheDocument();
    expect(within(summary).getAllByText("0 so'm")).toHaveLength(2);
    expect(
      within(summary).getByText('0 common.count_unit'),
    ).toBeInTheDocument();
  });
});
