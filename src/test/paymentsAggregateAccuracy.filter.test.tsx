import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PaymentsFilterBar } from '@/pages/payments/PaymentsFilterBar';

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <button data-value={value}>{children}</button>
  ),
}));

vi.mock('@/components/ui/date-range-picker', () => ({
  DateRangePicker: () => null,
}));

vi.mock('@/components/ui/course-type-tabs', () => ({
  CourseTypeTabs: () => null,
}));

describe('PaymentsFilterBar payment methods', () => {
  it('offers the transfer method using the backend wire value', () => {
    render(
      <PaymentsFilterBar
        isCrossTenant={false}
        branches={undefined}
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
        onPreset={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'payments.payment_transfer' }),
    ).toHaveAttribute('data-value', 'perechisleniya');
  });
});
