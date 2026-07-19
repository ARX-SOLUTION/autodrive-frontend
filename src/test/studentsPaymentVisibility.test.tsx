import { render, screen, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { StudentsTable } from '@/pages/students/StudentsTable';
import { StudentsMobileList } from '@/pages/students/StudentsMobileList';
import { StudentsPageHeader } from '@/pages/students/StudentsPageHeader';
import type { Student } from '@/types/student';

// autodrive-vh0.2: teacher must never see payment amounts. These three
// components previously rendered the debt/price columns, the mobile debt
// field, and the Excel export button (which embeds total_price/debt columns
// in every row) unconditionally -- no capability check existed at all.

afterEach(cleanup);

const STUDENT: Student = {
  id: 's1',
  last_name: 'Karimov',
  first_name: 'Aziz',
  phone: '+998901234567',
  total_price: 3000000,
  course_type: 'tezkor',
  branch_id: 'b1',
  payment_method: 'naqd',
  debt: 500000,
  has_document: true,
  registered_by: 'Nigora',
  result: 'oqimoqda',
  created_at: '2026-07-01T00:00:00.000Z',
  amount_paid: 2500000,
  initial_payment: 1000000,
};

const tableProps = {
  students: [STUDENT],
  isLoading: false,
  isError: false,
  onRetry: vi.fn(),
  totalStudents: 1,
  startIndex: 0,
  sortField: 'created_at',
  sortDir: 'desc' as const,
  toggleSort: vi.fn(),
  canManageStudents: true,
  isCrossTenant: true,
  onOpenStudent: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onCreate: vi.fn(),
};

describe('StudentsTable payment-column gating (autodrive-vh0.2)', () => {
  it('hides the debt column (tezkor) when canViewPayments is false', () => {
    render(
      <StudentsTable
        {...tableProps}
        courseType="tezkor"
        canViewPayments={false}
      />,
    );
    expect(screen.queryByText('students.debt')).toBeNull();
  });

  it('shows the debt column (tezkor) when canViewPayments is true (regression)', () => {
    render(
      <StudentsTable
        {...tableProps}
        courseType="tezkor"
        canViewPayments={true}
      />,
    );
    expect(screen.getByText('students.debt')).toBeTruthy();
  });

  it('hides all money columns (avto_maktab) when canViewPayments is false', () => {
    render(
      <StudentsTable
        {...tableProps}
        courseType="avto_maktab"
        canViewPayments={false}
      />,
    );
    expect(screen.queryByText('students.initial_payment')).toBeNull();
    expect(screen.queryByText('2-students.payment')).toBeNull();
    expect(screen.queryByText('3-students.payment')).toBeNull();
    expect(screen.queryByText('students.debt')).toBeNull();
    // Non-money columns stay.
    expect(screen.getByText('students.last_name')).toBeTruthy();
  });

  it('shows all money columns (avto_maktab) when canViewPayments is true (regression)', () => {
    render(
      <StudentsTable
        {...tableProps}
        courseType="avto_maktab"
        canViewPayments={true}
      />,
    );
    expect(screen.getByText('students.initial_payment')).toBeTruthy();
    expect(screen.getByText('2-students.payment')).toBeTruthy();
    expect(screen.getByText('3-students.payment')).toBeTruthy();
    expect(screen.getByText('students.debt')).toBeTruthy();
  });
});

describe('StudentsMobileList debt field gating (autodrive-vh0.2)', () => {
  const mobileProps = {
    students: [STUDENT],
    isLoading: false,
    isError: false,
    onRetry: vi.fn(),
    canManageStudents: true,
    isCrossTenant: true,
    onOpenStudent: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onCreate: vi.fn(),
  };

  it('hides the debt field when canViewPayments is false', () => {
    render(<StudentsMobileList {...mobileProps} canViewPayments={false} />);
    expect(screen.queryByText('students.detail.debt')).toBeNull();
  });

  it('shows the debt field when canViewPayments is true (regression)', () => {
    render(<StudentsMobileList {...mobileProps} canViewPayments={true} />);
    expect(screen.getByText('students.detail.debt')).toBeTruthy();
  });
});

describe('StudentsPageHeader export-button gating (autodrive-vh0.2)', () => {
  // Export embeds total_price/debt in every row -- must disappear entirely
  // for a teacher rather than leak payment data via a downloaded file.
  const headerProps = {
    totalStudents: 5,
    isExporting: false,
    onExport: vi.fn(),
    canManageStudents: true,
    onCreate: vi.fn(),
  };

  it('hides the export button when canViewPayments is false', () => {
    render(<StudentsPageHeader {...headerProps} canViewPayments={false} />);
    expect(screen.queryByText('students.export_excel')).toBeNull();
  });

  it('shows the export button when canViewPayments is true (regression)', () => {
    render(<StudentsPageHeader {...headerProps} canViewPayments={true} />);
    expect(screen.getByText('students.export_excel')).toBeTruthy();
  });
});
