import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PaymentsFilterBar } from '@/features/payments/components/PaymentsFilterBar';

afterEach(cleanup);

describe('PaymentsFilterBar accessible names', () => {
  it('names the payment branch, status and method filters', () => {
    render(
      <PaymentsFilterBar
        isCrossTenant
        branches={[]}
        branchId={undefined}
        onBranchChange={vi.fn()}
        paymentStatus="all"
        onStatusChange={vi.fn()}
        paymentMethod="all"
        onMethodChange={vi.fn()}
        courseType="all"
        onCourseTypeChange={vi.fn()}
        dateFrom={undefined}
        dateTo={undefined}
        onDateRangeChange={vi.fn()}
        search=""
        onSearchChange={vi.fn()}
        hasAnyFilter={false}
        onClearAll={vi.fn()}
      />,
    );

    for (const name of [
      'common.branch',
      'common.status',
      'payments.payment_method',
    ]) {
      expect(screen.getByRole('combobox', { name })).toBeInTheDocument();
    }
  });
});
